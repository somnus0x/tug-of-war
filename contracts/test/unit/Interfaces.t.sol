// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {IPortalFloor} from "src/interfaces/IPortalFloor.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";
import {Phase, Team} from "src/interfaces/TugTypes.sol";

contract InterfacesTest is Test {
    string private constant CONFIG_TUPLE =
        "(string,string,string,bytes32,uint64,uint256,uint256,address,address,address,uint16,uint256,uint64,uint16,uint64,uint16)";

    function test_TeamAndPhaseIds() public pure {
        assertEq(Team.NONE, 0);
        assertEq(Team.BLUE, 1);
        assertEq(Team.RED, 2);
        assertEq(Phase.AWAITING_CAPTAINS, 0);
        assertEq(Phase.BUY_IN, 1);
        assertEq(Phase.AWAITING_LAUNCH, 2);
        assertEq(Phase.REFUNDING, 3);
        assertEq(Phase.LAUNCHED, 4);
        assertEq(Phase.CANCELLED, 5);
    }

    function test_LauncherWriteSelectors() public pure {
        _assertSelector(ITugLauncher.depositCaptain.selector, "depositCaptain()");
        _assertSelector(ITugLauncher.cancel.selector, "cancel()");
        _assertSelector(ITugLauncher.contribute.selector, "contribute(uint8)");
        _assertSelector(ITugLauncher.launch.selector, "launch()");
        _assertSelector(ITugLauncher.refund.selector, "refund()");
        _assertSelector(ITugLauncher.claim.selector, "claim()");
        _assertSelector(ITugLauncher.claimCaptain.selector, "claimCaptain()");
        _assertSelector(ITugLauncher.scheduleAutoLaunch.selector, "scheduleAutoLaunch()");
        _assertSelector(ITugLauncher.withdrawTriggerBudget.selector, "withdrawTriggerBudget()");
        _assertSelector(ITugLauncher.trigger.selector, "trigger(uint256)");
    }

    function test_LauncherViewSelectors() public pure {
        _assertSelector(ITugLauncher.getGame.selector, "getGame()");
        _assertSelector(ITugLauncher.getPlayer.selector, "getPlayer(address)");
        _assertSelector(ITugLauncher.getCaptain.selector, "getCaptain(address)");
        _assertSelector(ITugLauncher.getRules.selector, "getRules()");
        _assertSelector(ITugLauncher.canDepositCaptain.selector, "canDepositCaptain(address,uint256)");
        _assertSelector(ITugLauncher.canCancel.selector, "canCancel()");
        _assertSelector(ITugLauncher.canScheduleAutoLaunch.selector, "canScheduleAutoLaunch()");
        _assertSelector(ITugLauncher.canContribute.selector, "canContribute(address,uint8,uint256)");
        _assertSelector(ITugLauncher.canLaunch.selector, "canLaunch()");
        _assertSelector(ITugLauncher.canRefund.selector, "canRefund(address)");
        _assertSelector(ITugLauncher.canClaim.selector, "canClaim(address)");
        _assertSelector(ITugLauncher.canClaimCaptain.selector, "canClaimCaptain(address)");
        _assertSelector(ITugLauncher.previewContribute.selector, "previewContribute(uint8,uint256)");
        _assertSelector(ITugLauncher.autoLaunchQuote.selector, "autoLaunchQuote()");
        _assertSelector(ITugLauncher.captainIn.selector, "captainIn(uint8)");
    }

    function test_AutoLaunchEventSelectors() public pure {
        assertEq(ITugLauncher.AutoLaunchStopped.selector, keccak256("AutoLaunchStopped(uint256)"));
        assertEq(ITugLauncher.TriggerBudgetWithdrawn.selector, keccak256("TriggerBudgetWithdrawn(address,uint256)"));
    }

    function test_FactoryConfigSelectors() public pure {
        _assertSelector(ITugLauncherFactory.limits.selector, "limits()");
        _assertSelector(ITugLauncherFactory.defaultConfig.selector, "defaultConfig()");
        _assertSelector(
            ITugLauncherFactory.validateConfig.selector, string.concat("validateConfig(", CONFIG_TUPLE, ")")
        );
        _assertSelector(ITugLauncherFactory.encodeConfig.selector, string.concat("encodeConfig(", CONFIG_TUPLE, ")"));
        _assertSelector(ITugLauncherFactory.predictToken.selector, "predictToken(bytes32)");
    }

    function test_VaultWriteAndViewSelectors() public pure {
        _assertSelector(ITugVault.stake.selector, "stake(uint256,uint8)");
        _assertSelector(ITugVault.unstake.selector, "unstake(uint256)");
        _assertSelector(ITugVault.claimRewards.selector, "claimRewards()");
        _assertSelector(ITugVault.claimCaptain.selector, "claimCaptain()");
        _assertSelector(ITugVault.sync.selector, "sync()");
        _assertSelector(ITugVault.getVault.selector, "getVault()");
        _assertSelector(ITugVault.getStaker.selector, "getStaker(address)");
        _assertSelector(ITugVault.getCaptain.selector, "getCaptain(address)");
        _assertSelector(ITugVault.teamStake.selector, "teamStake(uint8)");
        _assertSelector(ITugVault.pendingRewards.selector, "pendingRewards(address)");
        _assertSelector(ITugVault.pendingCaptain.selector, "pendingCaptain(address)");
        _assertSelector(ITugVault.stakeOf.selector, "stakeOf(address)");
    }

    function test_PortalFloorSelectors() public pure {
        _assertSelector(IPortalFloor.launchQuoteConfig.selector, "launchQuoteConfig(uint8,address)");
        _assertSelector(
            IPortalFloor.graduationFloorV2.selector,
            "graduationFloorV2((address,uint256,uint256,uint256,uint256,address))"
        );
        _assertSelector(
            IPortalFloor.graduationFloorV2ForLauncher.selector,
            "graduationFloorV2ForLauncher((address,uint256,uint256,uint256,uint256,address),address)"
        );
        _assertSelector(IPortalFloor.vaultFactoryMultiplier.selector, "vaultFactoryMultiplier(address)");
    }

    function test_FloorAndGraceErrorSelectors() public pure {
        _assertSelector(ITugLauncher.CreationFloorUnavailable.selector, "CreationFloorUnavailable()");
        assertEq(ITugLauncher.CreationFloorUnavailable.selector, ITugLauncherFactory.CreationFloorUnavailable.selector);
        _assertSelector(ITugLauncher.BelowCreationFloor.selector, "BelowCreationFloor()");
        _assertSelector(ITugLauncher.LaunchGraceExpired.selector, "LaunchGraceExpired()");
        _assertSelector(ITugLauncherFactory.ZeroMinRaise.selector, "ZeroMinRaise()");
        _assertSelector(ITugLauncherFactory.MinRaiseBelowCreationFloor.selector, "MinRaiseBelowCreationFloor()");
    }

    function _assertSelector(bytes4 actual, string memory signature) private pure {
        assertEq(actual, bytes4(keccak256(bytes(signature))), signature);
    }
}
