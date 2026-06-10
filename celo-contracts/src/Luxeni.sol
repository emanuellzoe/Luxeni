// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Luxeni — On-chain Territory War (core MVP)
/// @notice Energy (LUX) economy + 4-team contiguous tile claiming on per-battlefield boards.
///         Every `claimTile` is one on-chain transaction — the source of organic activity.
/// @dev    Not yet included (separate modules, see PRD.md): BattlefieldFactory,
///         SeasonRegistry, LuxeniKeepsake (NFT), zone tallies, and UUPS upgradeability.
///         This contract is intentionally constructor-based so the core game logic can be
///         validated first, then wrapped as a UUPS implementation.
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

    // --------------------------------- Types ---------------------------------
    struct Tile { uint8 team; address owner; }         // team 0 == empty

    // -------------------------------- Storage --------------------------------
    // Free regenerating energy — NOT withdrawable (no native backing).
    mapping(address => uint256) public freeEnergy;
    mapping(address => uint256) public lastRegen;
    // Purchased LUX — withdrawable 1:1.
    mapping(address => uint256) public paidLux;

    // Anti-whale, tracked per-user across ALL battlefields (no resetting by switching map).
    mapping(address => uint256) public awWindowStart;
    mapping(address => uint256) public awCount;

    // Per-battlefield state.
    mapping(uint256 => mapping(uint256 => Tile))    public tiles;       // bf => tileIndex => Tile
    mapping(uint256 => mapping(address => uint8))   public playerTeam;  // bf => user => team (1..4)
    mapping(uint256 => mapping(uint8 => uint256))   public teamTiles;   // bf => team => tiles held
    mapping(uint256 => mapping(address => uint256)) public playerHeld;  // bf => user => tiles held (rank input)

    // -------------------------------- Events ---------------------------------
    event LuxBought(address indexed user, uint256 nativeIn, uint256 luxOut);
    event LuxWithdrawn(address indexed user, uint256 luxIn, uint256 nativeOut);
    event TeamJoined(uint256 indexed bf, address indexed user, uint8 team);
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

    /// @dev Accrues free regen and applies the one-time starter grant on first touch.
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

    /// @notice Read-only projection of a user's spendable balance (free regen + purchased).
    function energyOf(address u) external view returns (uint256 free, uint256 paid) {
        uint256 last = lastRegen[u];
        if (last == 0) return (STARTER_ENERGY, paidLux[u]);
        uint256 f = freeEnergy[u] + (block.timestamp - last) / REGEN_PERIOD;
        if (f > REGEN_CAP) f = REGEN_CAP;
        return (f, paidLux[u]);
    }

    /// @notice Buy LUX with native CELO at a fixed rate (no oracle in MVP).
    function buyLux() external payable {
        require(msg.value > 0, "no value");
        uint256 lux = msg.value * LUX_PER_NATIVE / 1e18;
        require(lux > 0, "amount too small");
        paidLux[msg.sender] += lux;
        emit LuxBought(msg.sender, msg.value, lux);
    }

    /// @notice Refund unused purchased LUX back to CELO 1:1 (makes LUX non-gambling).
    function withdrawLux(uint256 amount) external nonReentrant {
        require(amount > 0 && paidLux[msg.sender] >= amount, "bad amount");
        paidLux[msg.sender] -= amount;                            // effect
        uint256 nativeOut = amount * 1e18 / LUX_PER_NATIVE;
        (bool ok, ) = msg.sender.call{value: nativeOut}("");      // interaction
        require(ok, "send failed");
        emit LuxWithdrawn(msg.sender, amount, nativeOut);
    }

    // ------------------------------- Gameplay ---------------------------------

    /// @notice Pick a team (1..4) for a battlefield. One team per user per battlefield.
    function joinTeam(uint256 bf, uint8 team) external {
        require(team >= 1 && team <= TEAMS, "bad team");
        require(playerTeam[bf][msg.sender] == 0, "already joined");
        playerTeam[bf][msg.sender] = team;
        emit TeamJoined(bf, msg.sender, team);
    }

    /// @notice Claim a tile for your team. Must be contiguous with your team's territory
    ///         (except the team's first/seed tile). One transaction per claim.
    function claimTile(uint256 bf, uint16 x, uint16 y) external {
        uint8 team = playerTeam[bf][msg.sender];
        require(team != 0, "join a team first");
        require(x < WIDTH && y < HEIGHT, "out of bounds");

        uint256 idx = uint256(y) * WIDTH + x;
        Tile memory t = tiles[bf][idx];
        require(t.team != team, "already your team");

        // Contiguity: the team's first tile seeds anywhere; the rest must touch own territory.
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
