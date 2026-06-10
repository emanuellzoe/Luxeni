// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Luxeni} from "../src/Luxeni.sol";

/// Edge cases complementing Luxeni.t.sol.
contract LuxeniEdgeTest is Test {
    Luxeni game;
    address alice = makeAddr("alice");
    uint256 BF;

    function setUp() public {
        game = new Luxeni();
        vm.deal(address(game), 100 ether);
        vm.deal(alice, 10 ether);
        BF = game.createBattlefield();
    }

    function test_WithdrawMoreThanPaidReverts() public {
        vm.prank(alice);
        game.buyLux{value: 0.01 ether}(); // 10 LUX
        vm.prank(alice);
        vm.expectRevert("bad amount");
        game.withdrawLux(11);
    }

    function test_ClaimWithoutEnergyReverts() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        // starter energy = 10; claim 10 contiguous tiles along a row
        for (uint16 x = 0; x < 10; x++) game.claimTile(BF, x, 0);
        assertEq(game.freeEnergy(alice), 0);
        // 11th has no energy and no paid LUX
        vm.expectRevert("not enough energy");
        game.claimTile(BF, 10, 0);
        vm.stopPrank();
    }

    function test_JoinExpiredReverts() public {
        vm.warp(block.timestamp + 3 hours + 1);
        vm.prank(alice);
        vm.expectRevert("battlefield not live");
        game.joinBattlefield(BF, 1);
    }

    function test_CannotJoinTwice() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        vm.expectRevert("already joined");
        game.joinBattlefield(BF, 2);
        vm.stopPrank();
    }

    function test_ClaimOwnTileReverts() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        game.claimTile(BF, 5, 5);
        vm.expectRevert("already your team");
        game.claimTile(BF, 5, 5);
        vm.stopPrank();
    }

    function test_ClaimNonAdjacentReverts() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        game.claimTile(BF, 5, 5); // seed
        vm.expectRevert("must be adjacent");
        game.claimTile(BF, 7, 7); // diagonal-ish, not orthogonally adjacent
        vm.stopPrank();
    }

    function test_SettleEmptyBattlefieldHasNoWinner() public {
        vm.warp(block.timestamp + 3 hours + 1);
        game.settle(BF);
        (uint8 status,,, uint8 winner,) = game.battlefields(BF);
        assertEq(status, 2);   // SETTLED
        assertEq(winner, 0);   // no tiles → no winner
    }

    function test_ClaimOutOfBoundsReverts() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        vm.expectRevert("out of bounds");
        game.claimTile(BF, 80, 0); // WIDTH is 80 → index 80 invalid
        vm.stopPrank();
    }
}
