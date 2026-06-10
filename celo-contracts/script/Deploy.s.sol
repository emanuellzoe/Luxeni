// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Luxeni} from "../src/Luxeni.sol";
import {LuxeniKeepsake} from "../src/LuxeniKeepsake.sol";

/// @notice Deploys Luxeni + LuxeniKeepsake.
///
/// Mainnet (Celo, chainId 42220) — where Proof of Ship metrics count:
///   forge script script/Deploy.s.sol --rpc-url celo --broadcast \
///     --verify --verifier sourcify
///
/// Testnet QA (Celo Sepolia, chainId 11142220):
///   forge script script/Deploy.s.sol --rpc-url celo_sepolia --broadcast
///
/// No house seeding needed: paid LUX is fully backed by users' own buyLux deposits
/// held in the contract, so withdrawals are always covered.
contract Deploy is Script {
    function run() external returns (Luxeni game, LuxeniKeepsake keepsake) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.envOr("OWNER", vm.addr(pk));

        vm.startBroadcast(pk);
        game = new Luxeni();
        keepsake = new LuxeniKeepsake(address(game), owner);
        vm.stopBroadcast();

        console.log("Luxeni:         ", address(game));
        console.log("LuxeniKeepsake: ", address(keepsake));
        console.log("Owner:          ", owner);
    }
}
