// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface ILuxeni {
    function currentSeason() external view returns (uint32);
    function seasonScore(uint32 season, address user) external view returns (uint256);
}

/// @notice Pluggable art renderer. Swappable until a season's art is frozen, so the
///         visual identity can be authored after deploy (no art director needed at launch).
interface ILuxeniRenderer {
    function render(uint256 tokenId, uint32 season, uint256 score, address owner)
        external view returns (string memory);
}

/// @title LuxeniKeepsake — season keepsake NFT with upgradeable art
/// @notice One mintable keepsake per (player, finished season) in which the player scored.
///         The art is upgradeable: the owner swaps the renderer / baseURI until a season is
///         frozen, after which that season's tokens render from a locked snapshot forever.
contract LuxeniKeepsake is ERC721, Ownable {
    using Strings for uint256;

    ILuxeni public immutable game;

    struct Keepsake { uint32 season; uint256 score; }

    uint256 public nextId = 1;
    mapping(uint256 => Keepsake) public keepsakes;
    mapping(uint32 => mapping(address => bool)) public minted; // season => user => minted

    // Upgradeable art
    address public renderer;                          // current renderer (0 => baseURI fallback)
    string  public baseURI;                           // fallback when no renderer
    mapping(uint32 => address) public frozenRenderer;  // season => renderer locked at freeze
    mapping(uint32 => bool)    public seasonFrozen;

    event KeepsakeMinted(uint256 indexed tokenId, address indexed owner, uint32 indexed season, uint256 score);
    event RendererSet(address renderer);
    event BaseURISet(string baseURI);
    event SeasonArtFrozen(uint32 indexed season, address renderer);

    constructor(address game_, address owner_)
        ERC721("Luxeni Keepsake", "LUXK")
        Ownable(owner_)
    {
        game = ILuxeni(game_);
    }

    /// @notice Mint your keepsake for a finished season in which you scored. One per season.
    function mint(uint32 season) external returns (uint256 tokenId) {
        require(season < game.currentSeason(), "season not finished");
        require(!minted[season][msg.sender], "already minted");
        uint256 score = game.seasonScore(season, msg.sender);
        require(score > 0, "no score");

        minted[season][msg.sender] = true;
        tokenId = nextId++;
        keepsakes[tokenId] = Keepsake({season: season, score: score});
        _safeMint(msg.sender, tokenId);
        emit KeepsakeMinted(tokenId, msg.sender, season, score);
    }

    // ----------------------------- Art controls ------------------------------
    function setRenderer(address r) external onlyOwner {
        renderer = r;
        emit RendererSet(r);
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
        emit BaseURISet(uri);
    }

    /// @notice Lock a season's art to the current renderer — one-way, for collector trust.
    function freezeSeasonArt(uint32 season) external onlyOwner {
        require(!seasonFrozen[season], "already frozen");
        seasonFrozen[season] = true;
        frozenRenderer[season] = renderer;
        emit SeasonArtFrozen(season, renderer);
    }

    // ------------------------------- Metadata --------------------------------
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address owner = ownerOf(tokenId); // reverts if token does not exist
        Keepsake memory k = keepsakes[tokenId];
        address r = seasonFrozen[k.season] ? frozenRenderer[k.season] : renderer;
        if (r != address(0)) {
            return ILuxeniRenderer(r).render(tokenId, k.season, k.score, owner);
        }
        return bytes(baseURI).length > 0 ? string.concat(baseURI, tokenId.toString()) : "";
    }
}
