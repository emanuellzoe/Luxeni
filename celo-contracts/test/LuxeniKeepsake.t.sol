// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Luxeni} from "../src/Luxeni.sol";
import {LuxeniKeepsake, ILuxeniRenderer} from "../src/LuxeniKeepsake.sol";

contract MockRenderer is ILuxeniRenderer {
    function render(uint256, uint32 season, uint256 score, address)
        external pure returns (string memory)
    {
        return string.concat("render:", _u(season), ":", _u(score));
    }
    function _u(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t = v;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { b[--d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}

contract LuxeniKeepsakeTest is Test {
    Luxeni game;
    LuxeniKeepsake keepsake;
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        game = new Luxeni();
        keepsake = new LuxeniKeepsake(address(game), address(this));
        vm.deal(alice, 10 ether);

        // Give alice a score of 2 in season 1.
        uint256 bf = game.createBattlefield();
        vm.startPrank(alice);
        game.joinBattlefield(bf, 1);
        game.claimTile(bf, 5, 5);
        game.claimTile(bf, 6, 5);
        vm.stopPrank();
        vm.warp(block.timestamp + 3 hours + 1);
        game.settle(bf);
        vm.prank(alice);
        game.claimMatchScore(bf);

        // Roll into season 2 so season 1 is "finished".
        vm.warp(block.timestamp + 4 weeks + 1);
        game.rolloverSeason();
        assertEq(game.currentSeason(), 2);
    }

    function test_MintKeepsake() public {
        vm.prank(alice);
        uint256 id = keepsake.mint(1);
        assertEq(keepsake.ownerOf(id), alice);
        (uint32 season, uint256 score) = keepsake.keepsakes(id);
        assertEq(season, 1);
        assertEq(score, 2);
    }

    function test_CannotMintTwice() public {
        vm.prank(alice);
        keepsake.mint(1);
        vm.prank(alice);
        vm.expectRevert("already minted");
        keepsake.mint(1);
    }

    function test_CannotMintUnfinishedSeason() public {
        vm.prank(alice);
        vm.expectRevert("season not finished");
        keepsake.mint(2); // current season
    }

    function test_CannotMintWithoutScore() public {
        vm.prank(bob);
        vm.expectRevert("no score");
        keepsake.mint(1);
    }

    function test_TokenURIFallbackAndRenderer() public {
        vm.prank(alice);
        uint256 id = keepsake.mint(1);

        // No renderer, no baseURI => empty.
        assertEq(bytes(keepsake.tokenURI(id)).length, 0);

        // baseURI fallback.
        keepsake.setBaseURI("ipfs://cid/");
        assertEq(keepsake.tokenURI(id), "ipfs://cid/1");

        // Renderer takes priority.
        MockRenderer r = new MockRenderer();
        keepsake.setRenderer(address(r));
        assertEq(keepsake.tokenURI(id), "render:1:2");
    }

    function test_FreezeSeasonArtLocksRenderer() public {
        vm.prank(alice);
        uint256 id = keepsake.mint(1);

        MockRenderer r1 = new MockRenderer();
        keepsake.setRenderer(address(r1));
        keepsake.freezeSeasonArt(1);              // lock season 1 to r1
        assertEq(keepsake.tokenURI(id), "render:1:2");

        // Swapping the global renderer no longer affects frozen season 1.
        keepsake.setRenderer(address(0));
        assertEq(keepsake.tokenURI(id), "render:1:2");

        vm.expectRevert("already frozen");
        keepsake.freezeSeasonArt(1);
    }
}
