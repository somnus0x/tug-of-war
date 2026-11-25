// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {IFlapTriggerService, ITriggerReceiver} from "src/flap/IFlapTriggerService.sol";
import {LaunchVaultAddresses} from "src/flap/LaunchVaultAddresses.sol";

contract FlapSetupTest is Test {
    function test_ResolvesBscTestnetAddresses() public {
        vm.chainId(97);

        assertEq(LaunchVaultAddresses.hub(), 0x000042108465206185A077Edc3F3fd2b49060000);
        assertEq(LaunchVaultAddresses.guardian(), 0x00004d58290854c5E9880F4b5B1993c6Ad8b0000);
    }

    function test_TriggerServiceSelectors() public pure {
        assertEq(IFlapTriggerService.requestTrigger.selector, bytes4(keccak256("requestTrigger(uint64)")));
        assertEq(IFlapTriggerService.getFee.selector, bytes4(keccak256("getFee()")));
        assertEq(IFlapTriggerService.getMaxCallbackGas.selector, bytes4(keccak256("getMaxCallbackGas()")));
        assertEq(ITriggerReceiver.trigger.selector, bytes4(keccak256("trigger(uint256)")));
    }
}
