// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Luxeni} from "../src/Luxeni.sol";

contract LuxeniTest is Test {
    Luxeni game;
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    uint256 constant BF = 1;

    function setUp() public {
        game = new Luxeni();
        vm.deal(address(game), 100 ether); // liquidity for withdrawals
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
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
        game.joinTeam(BF, 1);

        // First tile seeds anywhere (team has no tiles yet).
        game.claimTile(BF, 3, 3);
        assertEq(game.teamTiles(BF, 1), 1);
        assertEq(game.playerHeld(BF, alice), 1);

        // Non-adjacent claim is rejected.
        vm.expectRevert("must be adjacent");
        game.claimTile(BF, 10, 10);

        // Adjacent claim works.
        game.claimTile(BF, 4, 3);
        assertEq(game.teamTiles(BF, 1), 2);
        vm.stopPrank();
    }

    function test_StarterEnergyAndEmptyCost() public {
        vm.startPrank(alice);
        game.joinTeam(BF, 1);
        (uint256 free, ) = game.energyOf(alice);
        assertEq(free, 10); // starter grant

        game.claimTile(BF, 0, 0); // seed, empty => 1 LUX
        (free, ) = game.energyOf(alice);
        assertEq(free, 9);
        vm.stopPrank();
    }

    function test_EnemyClaimCostsThree() public {
        // alice (team 1) seeds at (5,5)
        vm.prank(alice);
        game.joinTeam(BF, 1);
        vm.prank(alice);
        game.claimTile(BF, 5, 5);
        assertEq(game.playerHeld(BF, alice), 1);

        // bob (team 2) seeds adjacent at (5,6), then attacks alice's (5,5)
        vm.startPrank(bob);
        game.joinTeam(BF, 2);
        game.claimTile(BF, 5, 6);                 // seed empty
        (uint256 freeBefore, ) = game.energyOf(bob);
        game.claimTile(BF, 5, 5);                 // enemy tile => 3 LUX
        (uint256 freeAfter, ) = game.energyOf(bob);
        vm.stopPrank();

        assertEq(freeBefore - freeAfter, 3);      // enemy claim cost 3
        assertEq(game.teamTiles(BF, 1), 0);       // alice lost the tile
        assertEq(game.teamTiles(BF, 2), 2);
        assertEq(game.playerHeld(BF, alice), 0);
        assertEq(game.playerHeld(BF, bob), 2);
    }

    function test_AntiWhaleSurchargeAfter20() public {
        vm.startPrank(alice);
        game.joinTeam(BF, 1);
        game.buyLux{value: 0.1 ether}();          // +100 paid LUX; starter free = 10

        // 21 contiguous empty claims along row y=0: (0,0)..(20,0)
        for (uint16 x = 0; x <= 20; x++) {
            game.claimTile(BF, x, 0);
        }
        vm.stopPrank();

        // Cost: 10 free + 11 paid would be 21 LUX if flat.
        // But the 21st claim carries +1 surcharge => 12 paid spent => 100 - 12 = 88.
        assertEq(game.freeEnergy(alice), 0);
        assertEq(game.paidLux(alice), 88);
        assertEq(game.teamTiles(BF, 1), 21);
    }
}
