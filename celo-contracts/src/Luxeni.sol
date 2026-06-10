// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Luxeni — On-chain Territory War (core MVP)
/// @notice Energy (LUX) economy + 4-team contiguous tile claiming across battlefields,
///         with a 4-week season layer that ranks players by tiles held at match end.
///         Every `claimTile` is one on-chain transaction — the source of organic activity.
/// @dev    Battlefield lifecycle, matchmaking, and the season registry are folded into this
///         contract for MVP cohesion. Not yet included (see PRD.md): LuxeniKeepsake (NFT),
///         zone tallies, UUPS upgradeability wrapping. Constructor-based for now.
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
    uint256 public constant DURATION         = 3 hours;  // match length
    uint8   public constant MAX_CONCURRENT   = 3;        // battlefields a user can be in at once
    uint256 public constant REQUEUE_COOLDOWN = 10 minutes;
    uint16  public constant TEAM_CAP         = 25;       // players per team (~100 / battlefield)

    uint8   public constant LIVE    = 1;
    uint8   public constant SETTLED = 2;

    // Seasons
    uint256 public constant SEASON_DURATION = 4 weeks;

    // --------------------------------- Types ---------------------------------
    struct Tile { uint8 team; address owner; }         // team 0 == empty
    struct Battlefield {
        uint8  status;        // 1 LIVE, 2 SETTLED
        uint40 endTime;
        uint16 playerCount;
        uint8  winningTeam;
        uint32 seasonId;
    }

    // -------------------------------- Storage --------------------------------
    // Energy
    mapping(address => uint256) public freeEnergy;     // regenerating, NOT withdrawable
    mapping(address => uint256) public lastRegen;
    mapping(address => uint256) public paidLux;        // purchased, withdrawable 1:1

    // Anti-whale (per-user across all battlefields)
    mapping(address => uint256) public awWindowStart;
    mapping(address => uint256) public awCount;

    // Battlefields
    uint256 public battlefieldCount;
    mapping(uint256 => Battlefield) public battlefields;
    mapping(uint256 => mapping(uint8 => uint16)) public teamPlayerCount;

    // Per-battlefield board state
    mapping(uint256 => mapping(uint256 => Tile))    public tiles;
    mapping(uint256 => mapping(address => uint8))   public playerTeam;
    mapping(uint256 => mapping(uint8 => uint256))   public teamTiles;
    mapping(uint256 => mapping(address => uint256)) public playerHeld;

    // Matchmaking
    mapping(address => uint256[3]) internal activeSlots;
    mapping(address => uint256) public cooldownEnd;

    // Seasons
    uint32  public currentSeason;
    uint256 public seasonEnd;
    mapping(uint32 => mapping(address => uint256)) public seasonScore;  // season => user => points
    mapping(uint256 => mapping(address => bool))   public scoreClaimed; // bf => user => credited?
    mapping(uint256 => mapping(address => bool))   public forfeited;    // bf => user => left → no score

    // -------------------------------- Events ---------------------------------
    event LuxBought(address indexed user, uint256 nativeIn, uint256 luxOut);
    event LuxWithdrawn(address indexed user, uint256 luxIn, uint256 nativeOut);
    event BattlefieldCreated(uint256 indexed bf, uint40 endTime, uint32 seasonId);
    event TeamJoined(uint256 indexed bf, address indexed user, uint8 team);
    event BattlefieldLeft(uint256 indexed bf, address indexed user);
    event BattlefieldSettled(uint256 indexed bf, uint8 winningTeam);
    event TileClaimed(
        uint256 indexed bf, address indexed user, uint16 x, uint16 y, uint8 team, uint8 prevTeam
    );
    event SeasonRolled(uint32 indexed newSeason, uint256 endTime);
    event MatchScoreClaimed(uint256 indexed bf, address indexed user, uint32 indexed season, uint256 points);

    // ------------------------------ Reentrancy --------------------------------
    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor() {
        currentSeason = 1;
        seasonEnd = block.timestamp + SEASON_DURATION;
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
            lastRegen[u] = last + gained * REGEN_PERIOD;
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

    // -------------------------------- Seasons ---------------------------------

    /// @notice Advance to the next season once the current one has ended (permissionless).
    function rolloverSeason() public {
        if (block.timestamp >= seasonEnd) {
            currentSeason += 1;
            seasonEnd = block.timestamp + SEASON_DURATION;
            emit SeasonRolled(currentSeason, seasonEnd);
        }
    }

    /// @notice After a battlefield is settled, credit your held tiles to that season's score.
    ///         Lazy + per-player so settlement never iterates participants. One claim per bf.
    function claimMatchScore(uint256 bf) external {
        require(battlefields[bf].status == SETTLED, "not settled");
        require(!scoreClaimed[bf][msg.sender], "already claimed");
        require(!forfeited[bf][msg.sender], "forfeited");
        uint256 held = playerHeld[bf][msg.sender];
        require(held > 0, "nothing to claim");

        scoreClaimed[bf][msg.sender] = true;
        uint32 s = battlefields[bf].seasonId;
        seasonScore[s][msg.sender] += held;
        emit MatchScoreClaimed(bf, msg.sender, s, held);
    }

    // ----------------------------- Battlefields -------------------------------

    function createBattlefield() external returns (uint256 bf) {
        rolloverSeason(); // ensure new battlefields belong to the live season
        bf = ++battlefieldCount;
        uint40 end = uint40(block.timestamp + DURATION);
        battlefields[bf] = Battlefield({
            status: LIVE,
            endTime: end,
            playerCount: 0,
            winningTeam: 0,
            seasonId: currentSeason
        });
        emit BattlefieldCreated(bf, end, currentSeason);
    }

    function joinBattlefield(uint256 bf, uint8 team) external {
        Battlefield memory b = battlefields[bf];
        require(b.status == LIVE && block.timestamp < b.endTime, "battlefield not live");
        require(team >= 1 && team <= TEAMS, "bad team");
        require(playerTeam[bf][msg.sender] == 0, "already joined");
        require(teamPlayerCount[bf][team] < TEAM_CAP, "team full");
        require(block.timestamp >= cooldownEnd[msg.sender], "in cooldown");

        _occupySlot(msg.sender, bf);

        playerTeam[bf][msg.sender] = team;
        forfeited[bf][msg.sender] = false; // allow scoring again if rejoining
        teamPlayerCount[bf][team] += 1;
        battlefields[bf].playerCount = b.playerCount + 1;
        emit TeamJoined(bf, msg.sender, team);
    }

    function leaveBattlefield(uint256 bf) external {
        uint8 team = playerTeam[bf][msg.sender];
        require(team != 0, "not in battlefield");
        playerTeam[bf][msg.sender] = 0;
        forfeited[bf][msg.sender] = true; // leaving forfeits season score from this match
        teamPlayerCount[bf][team] -= 1;
        Battlefield memory b = battlefields[bf];
        if (b.playerCount > 0) battlefields[bf].playerCount = b.playerCount - 1;
        _freeSlot(msg.sender, bf);
        cooldownEnd[msg.sender] = block.timestamp + REQUEUE_COOLDOWN;
        emit BattlefieldLeft(bf, msg.sender);
    }

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

    function getActiveSlots(address u) external view returns (uint256[3] memory) {
        return activeSlots[u];
    }

    function _hasAdjacentTeam(uint256 bf, uint16 x, uint16 y, uint8 team) internal view returns (bool) {
        if (x > 0          && tiles[bf][uint256(y) * WIDTH + (x - 1)].team == team) return true;
        if (x + 1 < WIDTH  && tiles[bf][uint256(y) * WIDTH + (x + 1)].team == team) return true;
        if (y > 0          && tiles[bf][uint256(y - 1) * WIDTH + x].team == team) return true;
        if (y + 1 < HEIGHT && tiles[bf][uint256(y + 1) * WIDTH + x].team == team) return true;
        return false;
    }

    function _surcharge(address u) internal returns (uint256 extra) {
        if (block.timestamp >= awWindowStart[u] + AW_WINDOW) {
            awWindowStart[u] = block.timestamp;
            awCount[u] = 0;
        }
        uint256 c = awCount[u];
        extra = c >= AW_FREE ? (c - AW_FREE + 1) : 0;   // 21st claim in a window => +1
        awCount[u] = c + 1;
    }

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
