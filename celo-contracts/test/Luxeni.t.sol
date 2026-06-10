// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Luxeni} from "../src/Luxeni.sol";

contract LuxeniTest is Test {
    Luxeni game;
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    uint256 BF;

    function setUp() public {
        game = new Luxeni();
        vm.deal(address(game), 100 ether); // liquidity for withdrawals
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        BF = game.createBattlefield(); // id 1, LIVE for 3h
    }

    function test_BuyAndWithdrawLux() public {
        vm.prank(alice);
        game.buyLux{value: 1 ether}();
        assertEq(game.paidLux(alice), 1000); // 1 CELO = 1000 LUX

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        game.withdrawLux(400);
        assertEq(game.paidLux(alice), 600);
        assertEq(alice.balance, balBefore + 0.4 ether);
    }

    function test_SeedThenContiguity() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);

        game.claimTile(BF, 3, 3); // seed anywhere
        assertEq(game.teamTiles(BF, 1), 1);
        assertEq(game.playerHeld(BF, alice), 1);

        vm.expectRevert("must be adjacent");
        game.claimTile(BF, 10, 10);

        game.claimTile(BF, 4, 3); // adjacent ok
        assertEq(game.teamTiles(BF, 1), 2);
        vm.stopPrank();
    }

    function test_StarterEnergyAndEmptyCost() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        (uint256 free, ) = game.energyOf(alice);
        assertEq(free, 10); // starter grant

        game.claimTile(BF, 0, 0); // seed, empty => 1 LUX
        (free, ) = game.energyOf(alice);
        assertEq(free, 9);
        vm.stopPrank();
    }

    function test_EnemyClaimCostsThree() public {
        vm.prank(alice);
        game.joinBattlefield(BF, 1);
        vm.prank(alice);
        game.claimTile(BF, 5, 5);

        vm.startPrank(bob);
        game.joinBattlefield(BF, 2);
        game.claimTile(BF, 5, 6);                 // seed empty
        (uint256 freeBefore, ) = game.energyOf(bob);
        game.claimTile(BF, 5, 5);                 // enemy tile => 3 LUX
        (uint256 freeAfter, ) = game.energyOf(bob);
        vm.stopPrank();

        assertEq(freeBefore - freeAfter, 3);
        assertEq(game.teamTiles(BF, 1), 0);
        assertEq(game.teamTiles(BF, 2), 2);
        assertEq(game.playerHeld(BF, alice), 0);
        assertEq(game.playerHeld(BF, bob), 2);
    }

    function test_AntiWhaleSurchargeAfter20() public {
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        game.buyLux{value: 0.1 ether}();          // +100 paid LUX; starter free = 10

        for (uint16 x = 0; x <= 20; x++) {        // 21 contiguous empty claims
            game.claimTile(BF, x, 0);
        }
        vm.stopPrank();

        // 10 free + 11 paid would be 21 flat; 21st carries +1 => 12 paid spent => 88 left.
        assertEq(game.freeEnergy(alice), 0);
        assertEq(game.paidLux(alice), 88);
        assertEq(game.teamTiles(BF, 1), 21);
    }

    function test_MaxThreeConcurrent() public {
        uint256 bf2 = game.createBattlefield();
        uint256 bf3 = game.createBattlefield();
        uint256 bf4 = game.createBattlefield();

        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        game.joinBattlefield(bf2, 1);
        game.joinBattlefield(bf3, 1);
        vm.expectRevert("max 3 concurrent");
        game.joinBattlefield(bf4, 1);
        vm.stopPrank();

        uint256[3] memory slots = game.getActiveSlots(alice);
        assertEq(slots[0], BF);
        assertEq(slots[1], bf2);
        assertEq(slots[2], bf3);
    }

    function test_LeaveStartsCooldown() public {
        uint256 bf2 = game.createBattlefield();
        vm.startPrank(alice);
        game.joinBattlefield(BF, 1);
        game.leaveBattlefield(BF);

        vm.expectRevert("in cooldown");
        game.joinBattlefield(bf2, 1);

        vm.warp(block.timestamp + 10 minutes + 1);
        game.joinBattlefield(bf2, 1); // ok after cooldown
        vm.stopPrank();
        assertEq(game.playerTeam(bf2, alice), 1);
    }

    function test_SettleWinner() public {
        vm.prank(alice);
        game.joinBattlefield(BF, 1);
        vm.startPrank(alice);
        game.claimTile(BF, 5, 5);
        game.claimTile(BF, 6, 5);                 // team 1: 2 tiles
        vm.stopPrank();

        vm.prank(bob);
        game.joinBattlefield(BF, 2);
        vm.prank(bob);
        game.claimTile(BF, 10, 10);               // team 2: 1 tile

        vm.expectRevert("not ended");
        game.settle(BF);

        vm.warp(block.timestamp + 3 hours + 1);
        game.settle(BF);

        (uint8 status, , , uint8 winningTeam) = game.battlefields(BF);
        assertEq(status, 2);                      // SETTLED
        assertEq(winningTeam, 1);                 // team 1 held more
    }

    function test_CannotClaimAfterEnd() public {
        vm.prank(alice);
        game.joinBattlefield(BF, 1);
        vm.warp(block.timestamp + 3 hours + 1);
        vm.prank(alice);
        vm.expectRevert("battlefield not live");
        game.claimTile(BF, 1, 1);
    }
}
