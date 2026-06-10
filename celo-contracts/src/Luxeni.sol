// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Luxeni — On-chain Territory War (core MVP)
/// @notice Energy (LUX) economy + 4-team contiguous tile claiming across battlefields.
///         Every `claimTile` is one on-chain transaction — the source of organic activity.
/// @dev    Battlefield lifecycle + matchmaking are folded into this contract for MVP
///         cohesion (claimTile must read battlefield state on the hot path). Not yet
///         included (see PRD.md): SeasonRegistry, LuxeniKeepsake (NFT), zone tallies,
///         UUPS upgradeability wrapping. Constructor-based for now; wrap as UUPS later.
contract Luxeni {
    // ------------------------------- Constants -------------------------------
    uint8   public constant TEAMS          = 4;
    uint16  public constant WIDTH          = 80;
    uint16  public constant HEIGHT         = 80;

    uint256 public constant LUX_PER_NATIVE = 1000;     // 1 CELO = 1000 LUX
    uint8   public constant COST_EMPTY     = 1;        // LUX to claim an empty tile
    uint8   public constant COST_ENEMY     = 3;        // LUX to claim an enemy tile

    uint256 public constant REGEN_PERIOD   = 20 minutes;
    uint8   public constant REGEN_CAP      = 10;       // free energy cap
    uint8   public constant STARTER_ENERGY = 10;       // one-time grant on first interaction

    uint256 public constant AW_WINDOW      = 5 hours;  // anti-whale rolling window
    uint256 public constant AW_FREE        = 20;       // claims before surcharge kicks in

    // Battlefield / matchmaking
    uint256 public constant DURATION       = 3 hours;  // match length
    uint8   public constant MAX_CONCURRENT = 3;        // battlefields a user can be in at once
    uint256 public constant REQUEUE_COOLDOWN = 10 minutes; // after voluntarily leaving
    uint16  public constant TEAM_CAP       = 25;       // players per team (=> ~100 / battlefield)

    uint8   public constant LIVE    = 1;
    uint8   public constant SETTLED = 2;

    // --------------------------------- Types ---------------------------------
    struct Tile { uint8 team; address owner; }         // team 0 == empty
    struct Battlefield { uint8 status; uint40 endTime; uint16 playerCount; uint8 winningTeam; }

    // -------------------------------- Storage --------------------------------
    // Free regenerating energy — NOT withdrawable (no native backing).
    mapping(address => uint256) public freeEnergy;
    mapping(address => uint256) public lastRegen;
    // Purchased LUX — withdrawable 1:1.
    mapping(address => uint256) public paidLux;

    // Anti-whale, per-user across ALL battlefields.
    mapping(address => uint256) public awWindowStart;
    mapping(address => uint256) public awCount;

    // Battlefields
    uint256 public battlefieldCount;
    mapping(uint256 => Battlefield) public battlefields;
    mapping(uint256 => mapping(uint8 => uint16)) public teamPlayerCount; // bf => team => players

    // Per-battlefield board state
    mapping(uint256 => mapping(uint256 => Tile))    public tiles;       // bf => tileIndex => Tile
    mapping(uint256 => mapping(address => uint8))   public playerTeam;  // bf => user => team (1..4)
    mapping(uint256 => mapping(uint8 => uint256))   public teamTiles;   // bf => team => tiles held
    mapping(uint256 => mapping(address => uint256)) public playerHeld;  // bf => user => tiles held (rank input)

    // Matchmaking: up to 3 concurrent battlefield slots per user + re-queue cooldown
    mapping(address => uint256[3]) internal activeSlots;
    mapping(address => uint256) public cooldownEnd;

    // -------------------------------- Events ---------------------------------
    event LuxBought(address indexed user, uint256 nativeIn, uint256 luxOut);
    event LuxWithdrawn(address indexed user, uint256 luxIn, uint256 nativeOut);
    event BattlefieldCreated(uint256 indexed bf, uint40 endTime);
    event TeamJoined(uint256 indexed bf, address indexed user, uint8 team);
    event BattlefieldLeft(uint256 indexed bf, address indexed user);
    event BattlefieldSettled(uint256 indexed bf, uint8 winningTeam);
    event TileClaimed(
        uint256 indexed bf, address indexed user, uint16 x, uint16 y, uint8 team, uint8 prevTeam
    );

    // ------------------------------ Reentrancy --------------------------------
    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    // -------------------------------- Energy ----------------------------------

    function _accrue(address u) internal {
        uint256 last = lastRegen[u];
        if (last == 0) {
            lastRegen[u] = block.timestamp;
            freeEnergy[u] = STARTER_ENERGY;            // one-time, since last==0 happens once
            return;
        }
        uint256 gained = (block.timestamp - last) / REGEN_PERIOD;
        if (gained > 0) {
            uint256 e = freeEnergy[u] + gained;
            if (e > REGEN_CAP) e = REGEN_CAP;
            freeEnergy[u] = e;
            lastRegen[u] = last + gained * REGEN_PERIOD; // keep remainder
        }
    }

    function energyOf(address u) external view returns (uint256 free, uint256 paid) {
        uint256 last = lastRegen[u];
        if (last == 0) return (STARTER_ENERGY, paidLux[u]);
        uint256 f = freeEnergy[u] + (block.timestamp - last) / REGEN_PERIOD;
        if (f > REGEN_CAP) f = REGEN_CAP;
        return (f, paidLux[u]);
    }

    function buyLux() external payable {
        require(msg.value > 0, "no value");
        uint256 lux = msg.value * LUX_PER_NATIVE / 1e18;
        require(lux > 0, "amount too small");
        paidLux[msg.sender] += lux;
        emit LuxBought(msg.sender, msg.value, lux);
    }

    function withdrawLux(uint256 amount) external nonReentrant {
        require(amount > 0 && paidLux[msg.sender] >= amount, "bad amount");
        paidLux[msg.sender] -= amount;                            // effect
        uint256 nativeOut = amount * 1e18 / LUX_PER_NATIVE;
        (bool ok, ) = msg.sender.call{value: nativeOut}("");      // interaction
        require(ok, "send failed");
        emit LuxWithdrawn(msg.sender, amount, nativeOut);
    }

    // ----------------------------- Battlefields -------------------------------

    /// @notice Create a new battlefield (the frontend/factory calls this on demand).
    function createBattlefield() external returns (uint256 bf) {
        bf = ++battlefieldCount;
        battlefields[bf] = Battlefield({
            status: LIVE,
            endTime: uint40(block.timestamp + DURATION),
            playerCount: 0,
            winningTeam: 0
        });
        emit BattlefieldCreated(bf, uint40(block.timestamp + DURATION));
    }

    /// @notice Join a battlefield on a team (1..4). Enforces capacity, 3-concurrent cap,
    ///         and the re-queue cooldown. Auto-frees slots whose battlefield has ended.
    function joinBattlefield(uint256 bf, uint8 team) external {
        Battlefield memory b = battlefields[bf];
        require(b.status == LIVE && block.timestamp < b.endTime, "battlefield not live");
        require(team >= 1 && team <= TEAMS, "bad team");
        require(playerTeam[bf][msg.sender] == 0, "already joined");
        require(teamPlayerCount[bf][team] < TEAM_CAP, "team full");
        require(block.timestamp >= cooldownEnd[msg.sender], "in cooldown");

        _occupySlot(msg.sender, bf);

        playerTeam[bf][msg.sender] = team;
        teamPlayerCount[bf][team] += 1;
        battlefields[bf].playerCount = b.playerCount + 1;
        emit TeamJoined(bf, msg.sender, team);
    }

    /// @notice Leave a battlefield voluntarily; frees a slot and starts the re-queue cooldown.
    ///         Tiles already claimed stay with the team; the player simply exits the roster.
    function leaveBattlefield(uint256 bf) external {
        uint8 team = playerTeam[bf][msg.sender];
        require(team != 0, "not in battlefield");
        playerTeam[bf][msg.sender] = 0;
        teamPlayerCount[bf][team] -= 1;
        Battlefield memory b = battlefields[bf];
        if (b.playerCount > 0) battlefields[bf].playerCount = b.playerCount - 1;
        _freeSlot(msg.sender, bf);
        cooldownEnd[msg.sender] = block.timestamp + REQUEUE_COOLDOWN;
        emit BattlefieldLeft(bf, msg.sender);
    }

    /// @notice Settle a battlefield after it ends. Winner = team holding the most tiles.
    ///         Permissionless — anyone can trigger settlement once time is up.
    function settle(uint256 bf) external {
        Battlefield memory b = battlefields[bf];
        require(b.status == LIVE, "not live");
        require(block.timestamp >= b.endTime, "not ended");

        uint8 winner = 0;
        uint256 best = 0;
        for (uint8 t = 1; t <= TEAMS; ++t) {          // bounded loop: 4 teams
            uint256 held = teamTiles[bf][t];
            if (held > best) { best = held; winner = t; }
        }
        battlefields[bf].status = SETTLED;
        battlefields[bf].winningTeam = winner;
        emit BattlefieldSettled(bf, winner);
    }

    // ------------------------------- Gameplay ---------------------------------

    /// @notice Claim a tile for your team in a live battlefield. Must be contiguous with
    ///         your team's territory (except the team's first/seed tile). One tx per claim.
    function claimTile(uint256 bf, uint16 x, uint16 y) external {
        Battlefield memory b = battlefields[bf];
        require(b.status == LIVE && block.timestamp < b.endTime, "battlefield not live");

        uint8 team = playerTeam[bf][msg.sender];
        require(team != 0, "join a team first");
        require(x < WIDTH && y < HEIGHT, "out of bounds");

        uint256 idx = uint256(y) * WIDTH + x;
        Tile memory t = tiles[bf][idx];
        require(t.team != team, "already your team");

        if (teamTiles[bf][team] != 0) {
            require(_hasAdjacentTeam(bf, x, y, team), "must be adjacent");
        }

        uint256 cost = (t.team == 0 ? COST_EMPTY : COST_ENEMY) + _surcharge(msg.sender);
        _spend(msg.sender, cost);

        if (t.team != 0) {
            teamTiles[bf][t.team] -= 1;
            playerHeld[bf][t.owner] -= 1;
        }
        tiles[bf][idx] = Tile({team: team, owner: msg.sender});
        teamTiles[bf][team] += 1;
        playerHeld[bf][msg.sender] += 1;

        emit TileClaimed(bf, msg.sender, x, y, team, t.team);
    }

    // ------------------------------- Internals --------------------------------

    /// @dev Occupy a free concurrency slot, enforcing MAX_CONCURRENT live battlefields.
    ///      Slots whose battlefield has settled/expired are treated as free. O(3).
    function _occupySlot(address u, uint256 bf) internal {
        uint256[3] storage s = activeSlots[u];
        uint256 freeIdx = type(uint256).max;
        uint8 live = 0;
        for (uint256 i = 0; i < 3; ++i) {
            uint256 existing = s[i];
            if (existing == 0) {
                if (freeIdx == type(uint256).max) freeIdx = i;
                continue;
            }
            Battlefield memory eb = battlefields[existing];
            if (eb.status == LIVE && block.timestamp < eb.endTime) {
                live += 1;
            } else if (freeIdx == type(uint256).max) {
                freeIdx = i; // finished battlefield → slot reusable
            }
        }
        require(live < MAX_CONCURRENT, "max 3 concurrent");
        require(freeIdx != type(uint256).max, "no free slot");
        s[freeIdx] = bf;
    }

    function _freeSlot(address u, uint256 bf) internal {
        uint256[3] storage s = activeSlots[u];
        for (uint256 i = 0; i < 3; ++i) {
            if (s[i] == bf) { s[i] = 0; return; }
        }
    }

    /// @notice The user's three concurrency slots (battlefield ids; 0 = empty).
    function getActiveSlots(address u) external view returns (uint256[3] memory) {
        return activeSlots[u];
    }

    /// @dev Up to 4 neighbour reads — O(1), never a loop over the board.
    function _hasAdjacentTeam(uint256 bf, uint16 x, uint16 y, uint8 team) internal view returns (bool) {
        if (x > 0          && tiles[bf][uint256(y) * WIDTH + (x - 1)].team == team) return true;
        if (x + 1 < WIDTH  && tiles[bf][uint256(y) * WIDTH + (x + 1)].team == team) return true;
        if (y > 0          && tiles[bf][uint256(y - 1) * WIDTH + x].team == team) return true;
        if (y + 1 < HEIGHT && tiles[bf][uint256(y + 1) * WIDTH + x].team == team) return true;
        return false;
    }

    /// @dev Per-user anti-whale: first AW_FREE claims per window are base price; then +1 each.
    function _surcharge(address u) internal returns (uint256 extra) {
        if (block.timestamp >= awWindowStart[u] + AW_WINDOW) {
            awWindowStart[u] = block.timestamp;
            awCount[u] = 0;
        }
        uint256 c = awCount[u];
        extra = c >= AW_FREE ? (c - AW_FREE + 1) : 0;   // 21st claim in a window => +1
        awCount[u] = c + 1;
    }

    /// @dev Spend free energy first, then purchased LUX.
    function _spend(address u, uint256 cost) internal {
        _accrue(u);
        uint256 free = freeEnergy[u];
        if (free >= cost) {
            freeEnergy[u] = free - cost;
        } else {
            uint256 rem = cost - free;
            require(paidLux[u] >= rem, "not enough energy");
            freeEnergy[u] = 0;
            paidLux[u] -= rem;
        }
    }

    receive() external payable {}
}
