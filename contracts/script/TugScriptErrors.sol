// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console2} from "forge-std/console2.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";

library TugScriptErrors {
    function check(bool ok, bytes4 reason) internal pure {
        if (!ok) fail(abi.encodePacked(reason));
    }

    function fail(bytes memory reason) internal pure {
        console2.log("Call rejected with", name(bytes4(reason)));
        assembly ("memory-safe") {
            revert(add(reason, 32), mload(reason))
        }
    }

    function name(bytes4 reason) internal pure returns (string memory) {
        if (reason == ITugLauncher.InvalidTeam.selector) return "InvalidTeam";
        if (reason == ITugLauncher.TeamLocked.selector) return "TeamLocked";
        if (reason == ITugLauncher.ZeroContribution.selector) return "ZeroContribution";
        if (reason == ITugLauncher.WalletCapExceeded.selector) return "WalletCapExceeded";
        if (reason == ITugLauncher.NotCaptain.selector) return "NotCaptain";
        if (reason == ITugLauncher.CaptainAlreadyIn.selector) return "CaptainAlreadyIn";
        if (reason == ITugLauncher.BelowCaptainMinimum.selector) return "BelowCaptainMinimum";
        if (reason == ITugLauncher.CaptainsNotIn.selector) return "CaptainsNotIn";
        if (reason == ITugLauncher.AcceptWindowOpen.selector) return "AcceptWindowOpen";
        if (reason == ITugLauncher.AcceptWindowClosed.selector) return "AcceptWindowClosed";
        if (reason == ITugLauncher.NotCancellable.selector) return "NotCancellable";
        if (reason == ITugLauncher.GameCancelled.selector) return "GameCancelled";
        if (reason == ITugLauncher.GameNotStarted.selector) return "GameNotStarted";
        if (reason == ITugLauncher.OnlyTriggerService.selector) return "OnlyTriggerService";
        if (reason == ITugLauncher.AutoLaunchAlreadyScheduled.selector) return "AutoLaunchAlreadyScheduled";
        if (reason == ITugLauncher.InsufficientTriggerFee.selector) return "InsufficientTriggerFee";
        if (reason == ITugLauncher.BuyInClosed.selector) return "BuyInClosed";
        if (reason == ITugLauncher.BuyInOpen.selector) return "BuyInOpen";
        if (reason == ITugLauncher.BelowMinRaise.selector) return "BelowMinRaise";
        if (reason == ITugLauncher.MinRaiseMet.selector) return "MinRaiseMet";
        if (reason == ITugLauncher.CreationFloorUnavailable.selector) return "CreationFloorUnavailable";
        if (reason == ITugLauncher.BelowCreationFloor.selector) return "BelowCreationFloor";
        if (reason == ITugLauncher.LaunchGraceExpired.selector) return "LaunchGraceExpired";
        if (reason == ITugLauncher.AlreadyLaunched.selector) return "AlreadyLaunched";
        if (reason == ITugLauncher.NotLaunched.selector) return "NotLaunched";
        if (reason == ITugLauncher.NothingToClaim.selector) return "NothingToClaim";
        if (reason == ITugLauncher.NothingToRefund.selector) return "NothingToRefund";
        if (reason == ITugLauncher.NotTriggerFunder.selector) return "NotTriggerFunder";
        if (reason == ITugLauncher.TriggerBudgetLocked.selector) return "TriggerBudgetLocked";
        if (reason == ITugLauncher.TransferFailed.selector) return "TransferFailed";
        if (reason == ITugLauncherFactory.InvalidVaultFactory.selector) return "InvalidVaultFactory";
        if (reason == ITugLauncherFactory.InvalidCaptains.selector) return "InvalidCaptains";
        if (reason == ITugLauncherFactory.InvalidSalt.selector) return "InvalidSalt";
        if (reason == ITugLauncherFactory.DurationOutOfRange.selector) return "DurationOutOfRange";
        if (reason == ITugLauncherFactory.AcceptWindowOutOfRange.selector) return "AcceptWindowOutOfRange";
        if (reason == ITugLauncherFactory.CaptainVestDurationOutOfRange.selector) {
            return "CaptainVestDurationOutOfRange";
        }
        if (reason == ITugLauncherFactory.MaxBonusShareOutOfRange.selector) return "MaxBonusShareOutOfRange";
        if (reason == ITugLauncherFactory.CaptainAllocOutOfRange.selector) return "CaptainAllocOutOfRange";
        if (reason == ITugLauncherFactory.CaptainShareOutOfRange.selector) return "CaptainShareOutOfRange";
        if (reason == ITugLauncherFactory.InvalidWalletCap.selector) return "InvalidWalletCap";
        if (reason == ITugLauncherFactory.CaptainDepositExceedsWalletCap.selector) {
            return "CaptainDepositExceedsWalletCap";
        }
        if (reason == ITugLauncherFactory.ZeroMinRaise.selector) return "ZeroMinRaise";
        if (reason == ITugLauncherFactory.MinRaiseBelowCreationFloor.selector) return "MinRaiseBelowCreationFloor";
        if (reason == ITugLauncherFactory.NonCanonicalConfig.selector) return "NonCanonicalConfig";
        if (reason == ITugVault.ZeroAmount.selector) return "ZeroAmount";
        if (reason == ITugVault.WrongTeam.selector) return "WrongTeam";
        if (reason == ITugVault.InsufficientStake.selector) return "InsufficientStake";
        if (reason == bytes4(keccak256("InvalidSaltLockPayment()"))) return "InvalidSaltLockPayment";
        if (reason == bytes4(keccak256("DescriptionTooLong()"))) return "DescriptionTooLong";
        if (reason == bytes4(keccak256("InvalidDistribution()"))) return "InvalidDistribution";
        if (reason == bytes4(keccak256("GameIndexOutOfRange()"))) return "GameIndexOutOfRange";
        if (reason == bytes4(keccak256("LaunchLiquidityTooLow()"))) return "LaunchLiquidityTooLow";
        if (reason == bytes4(keccak256("OnlyDeployer()"))) return "OnlyDeployer";
        if (reason == bytes4(keccak256("InvalidFactorySetup()"))) return "InvalidFactorySetup";
        if (reason == bytes4(keccak256("TransferFromFailed()"))) return "TransferFromFailed";
        if (reason == bytes4(keccak256("ApproveFailed()"))) return "ApproveFailed";
        if (reason == bytes4(keccak256("Panic(uint256)"))) return "Panic";
        if (reason == bytes4(keccak256("Error(string)"))) return "Error";
        return "Unknown contract error";
    }
}
