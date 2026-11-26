// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

import {IFlapTriggerService} from "src/flap/IFlapTriggerService.sol";
import {IPortal} from "src/flap/IPortal.sol";
import {IPortalFloor} from "src/interfaces/IPortalFloor.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {CaptainAllocView, Limits, Phase, PlayerView, Team, TugConfig} from "src/interfaces/TugTypes.sol";
import {TUG_POOL_TOKEN, TUG_TOTAL_SUPPLY, TugLauncher} from "src/launcher/TugLauncher.sol";
import {TugMath} from "src/libraries/TugMath.sol";

import {TugBase} from "./TugBase.sol";

interface IPortalVersion {
    function version() external view returns (string memory);
}

contract TugLauncherForkTest is TugBase {
    function test_DisabledFactoriesStillCreateAndLaunchWhilePaused() public {
        _setFactories(10_000, false, 10_000, false);
        (bool launcherEnabled,) = portal.launcherFactoryMultiplier(address(factory));
        (bool vaultEnabled,) = IPortalFloor(address(portal)).vaultFactoryMultiplier(address(vaultFactory));
        assertFalse(launcherEnabled);
        assertFalse(vaultEnabled);
        assertTrue(portal.featureFlags() & 1 != 0);
        emit log_named_string("Portal version", IPortalVersion(address(portal)).version());

        TugLauncher launcher = _create(_config());
        assertEq(portal.getLauncher(address(launcher)).launcherFactory, address(factory));

        _start(launcher);
        _contribute(launcher, alice, Team.BLUE, launcher.minRaise());
        vm.warp(launcher.deadline());
        vm.prank(bob, bob);
        launcher.launch();

        assertGt(launcher.token().code.length, 0);
        assertGt(launcher.pool().code.length, 0);
        assertGt(launcher.vault().code.length, 0);
    }

    function test_MaxBonusShareBpsBoundaries() public {
        _setFactories(10_000, true, 10_000, true);
        TugConfig memory config = _config();

        config.maxBonusShareBps = 5_000;
        (bool ok, bytes4 reason) = factory.validateConfig(config);
        _assertGate(ok, reason, bytes4(0));
        config.maxBonusShareBps = 10_000;
        (ok, reason) = factory.validateConfig(config);
        _assertGate(ok, reason, bytes4(0));

        config.maxBonusShareBps = 4_999;
        _assertConfigRevert(config, ITugLauncherFactory.MaxBonusShareOutOfRange.selector);
        config.maxBonusShareBps = 10_001;
        _assertConfigRevert(config, ITugLauncherFactory.MaxBonusShareOutOfRange.selector);
    }

    function test_CreationRegistersGameAndLocksSalt() public {
        _setFactories(10_000, true, 10_000, true);
        TugConfig memory config = _config();
        vm.expectCall(address(portal), saltFee, abi.encodeCall(IPortal.lockSalt, (config.salt, LAUNCH_KIND)), 1);
        TugLauncher launcher = _create(config);

        assertEq(portal.getLauncher(address(launcher)).launcherFactory, address(factory));
        assertTrue(factory.isLauncher(address(launcher)));
        assertEq(factory.gamesCount(), 1);
        assertEq(factory.gameAt(0), address(launcher));
        assertEq(factory.gamesOf(blue)[0], address(launcher));
        assertEq(factory.gamesOf(red)[0], address(launcher));
        assertEq(factory.gamesOf(creator).length, 0);
        assertEq(launcher.creator(), creator);
        assertEq(launcher.factory(), address(factory));
        assertEq(launcher.triggerService(), TRIGGER_SERVICE);
        assertEq(launcher.getGame().acceptDeadline, block.timestamp + config.acceptWindow);
        assertEq(address(launcher).balance, 0);
        assertLt(bytes(launcher.description()).length, 4_096);
    }

    function test_WrongSaltFeeAndNonCanonicalEncodingRevert() public {
        _setFactories(10_000, true, 10_000, true);
        TugConfig memory config = _config();
        bytes memory data = factory.encodeConfig(config);
        vm.expectRevert(TugLauncher.InvalidSaltLockPayment.selector);
        vm.prank(creator);
        portal.newLauncher{value: saltFee + 1}(address(factory), data);

        vm.expectRevert(ITugLauncherFactory.NonCanonicalConfig.selector);
        vm.prank(creator);
        portal.newLauncher{value: saltFee}(address(factory), bytes.concat(data, bytes32(0)));
        assertEq(factory.gamesCount(), 0);
    }

    function test_CaptainDepositsAreNamedOnceAndAtLeastTheMinimum() public {
        TugLauncher launcher = _newGame();
        (bool ok, bytes4 reason) = launcher.canDepositCaptain(alice, CAPTAIN_DEPOSIT);
        _assertGate(ok, reason, ITugLauncher.NotCaptain.selector);
        vm.expectRevert(reason);
        _deposit(launcher, alice, CAPTAIN_DEPOSIT);

        (ok, reason) = launcher.canDepositCaptain(blue, CAPTAIN_DEPOSIT - 1);
        _assertGate(ok, reason, ITugLauncher.BelowCaptainMinimum.selector);
        vm.expectRevert(reason);
        _deposit(launcher, blue, CAPTAIN_DEPOSIT - 1);

        _deposit(launcher, red, CAPTAIN_DEPOSIT);
        assertEq(launcher.phase(), Phase.AWAITING_CAPTAINS);
        assertEq(launcher.gameStart(), 0);
        assertEq(launcher.pullOf(red), 2 * CAPTAIN_DEPOSIT);

        (ok, reason) = launcher.canDepositCaptain(red, CAPTAIN_DEPOSIT);
        _assertGate(ok, reason, ITugLauncher.CaptainAlreadyIn.selector);
        vm.expectRevert(reason);
        _deposit(launcher, red, CAPTAIN_DEPOSIT);

        vm.warp(block.timestamp + 1);
        _deposit(launcher, blue, 2 * CAPTAIN_DEPOSIT);
        assertEq(launcher.phase(), Phase.BUY_IN);
        assertEq(launcher.gameStart(), block.timestamp);
        assertEq(launcher.deadline(), block.timestamp + 3 minutes);
        assertEq(launcher.pullOf(blue), 4 * CAPTAIN_DEPOSIT);
        assertEq(launcher.getRules().startWeightBps, 20_000);
    }

    function test_ContributeRevertsUntilBothCaptainsDeposit() public {
        TugLauncher launcher = _newGame();
        _deposit(launcher, blue, CAPTAIN_DEPOSIT);
        (bool ok, bytes4 reason) = launcher.canContribute(alice, Team.BLUE, 1 ether);
        _assertGate(ok, reason, ITugLauncher.CaptainsNotIn.selector);
        vm.expectRevert(reason);
        _contribute(launcher, alice, Team.BLUE, 1 ether);
    }

    function test_ExpiredAcceptWindowWithZeroDepositsCanCancel() public {
        _assertCancelAfterAcceptDeadline(_newGame(), address(0));
    }

    function test_ExpiredAcceptWindowWithOneDepositCanCancelAndRefund() public {
        TugLauncher launcher = _newGame();
        _deposit(launcher, red, CAPTAIN_DEPOSIT);
        _assertCancelAfterAcceptDeadline(launcher, red);
    }

    function test_TeamLockAndWalletCapIncludeCaptainDeposit() public {
        TugLauncher launcher = _newGame();
        _start(launcher);
        (bool ok, bytes4 reason) = launcher.canContribute(blue, Team.RED, 1 wei);
        _assertGate(ok, reason, ITugLauncher.TeamLocked.selector);
        vm.expectRevert(reason);
        _contribute(launcher, blue, Team.RED, 1 wei);

        uint256 remaining = launcher.getPlayer(blue).remainingCap;
        assertEq(remaining, 10 ether - CAPTAIN_DEPOSIT);
        (ok, reason) = launcher.canContribute(blue, Team.BLUE, remaining + 1);
        _assertGate(ok, reason, ITugLauncher.WalletCapExceeded.selector);
        vm.expectRevert(reason);
        _contribute(launcher, blue, Team.BLUE, remaining + 1);

        _contribute(launcher, blue, Team.BLUE, remaining);
        assertEq(launcher.contribution(blue), 10 ether);
        _contribute(launcher, alice, Team.BLUE, 1 ether);
        (ok, reason) = launcher.canContribute(alice, Team.RED, 1 wei);
        _assertGate(ok, reason, ITugLauncher.TeamLocked.selector);
        vm.expectRevert(reason);
        _contribute(launcher, alice, Team.RED, 1 wei);
    }

    function test_EarlyContributionHasMorePullThanEqualLateContribution() public {
        TugLauncher launcher = _newGame();
        _start(launcher);
        _contribute(launcher, alice, Team.BLUE, 1 ether);
        vm.warp(launcher.gameStart() + 90);
        _contribute(launcher, bob, Team.RED, 1 ether);
        assertEq(launcher.pullOf(alice), 2 ether);
        assertEq(launcher.pullOf(bob), 1.5 ether);
        assertEq(launcher.getGame().extensionsUsed, 0);
    }

    function test_OvertimeCountsTiesAndSwapsWithFiveExtensionsTotal() public {
        TugLauncher launcher = _newGame();
        _start(launcher);
        uint64 originalDeadline = launcher.deadline();

        vm.warp(originalDeadline - 60);
        _assertOvertime(launcher, alice, Team.BLUE, 1 ether, true, 1);
        _assertOvertime(launcher, bob, Team.RED, 1 ether, false, 1);
        assertEq(launcher.ropeBps(), 5_000);

        // Move back into the overtime window. All contributions now have the original clock's 1x weight.
        vm.warp(originalDeadline);
        assertEq(launcher.getGame().currentWeightBps, TugMath.BPS);
        _assertOvertime(launcher, alice, Team.BLUE, 1 ether, true, 2);
        vm.warp(launcher.deadline() - 60);
        _assertOvertime(launcher, bob, Team.RED, 2 ether, true, 3);
        vm.warp(launcher.deadline() - 60);
        _assertOvertime(launcher, bob, Team.RED, 1 ether, false, 3);
        _assertOvertime(launcher, alice, Team.BLUE, 2 ether, true, 4);
        vm.warp(launcher.deadline() - 60);
        _assertOvertime(launcher, alice, Team.BLUE, 1 ether, true, 5);
        vm.warp(launcher.deadline() - 60);
        _assertOvertime(launcher, bob, Team.RED, 1 ether, false, 5);
        assertEq(launcher.deadline(), originalDeadline + 150);
    }

    function test_RefundOpensAtDeadlineWhenMinimumMissed() public {
        TugLauncher launcher = _newGame();
        _start(launcher);
        _contribute(launcher, alice, Team.BLUE, 1 ether);

        (bool ok, bytes4 reason) = launcher.canRefund(alice);
        _assertGate(ok, reason, ITugLauncher.BuyInOpen.selector);
        vm.expectRevert(reason);
        vm.prank(alice);
        launcher.refund();

        vm.warp(launcher.deadline());
        assertEq(launcher.phase(), Phase.REFUNDING);
        _assertLaunchError(launcher, ITugLauncher.BelowMinRaise.selector);
        (ok, reason) = launcher.canRefund(alice);
        _assertGate(ok, reason, bytes4(0));
        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        launcher.refund();
        assertEq(alice.balance, balanceBefore + 1 ether);

        (ok, reason) = launcher.canRefund(alice);
        _assertGate(ok, reason, ITugLauncher.NothingToRefund.selector);
        vm.expectRevert(reason);
        vm.prank(alice);
        launcher.refund();
    }

    function test_GraceCutoffRefundsEvenWhenMinimumMetAndPortalReverts() public {
        TugLauncher launcher = _readyToLaunch();
        uint256 fee = launcher.autoLaunchQuote();
        vm.prank(bob);
        launcher.scheduleAutoLaunch{value: fee}();
        uint256 requestId = launcher.autoLaunchRequestId();
        vm.warp(launcher.deadline());
        _mockQuoteReverting();
        _assertLaunchError(launcher, ITugLauncher.CreationFloorUnavailable.selector);

        vm.warp(launcher.deadline() + launcher.getRules().launchGrace);
        assertEq(launcher.phase(), Phase.REFUNDING);
        _assertLaunchError(launcher, ITugLauncher.LaunchGraceExpired.selector);
        vm.prank(TRIGGER_SERVICE);
        launcher.trigger(requestId);
        assertFalse(launcher.launched());

        (bool ok, bytes4 reason) = launcher.canRefund(alice);
        _assertGate(ok, reason, bytes4(0));
        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        launcher.refund();
        assertEq(alice.balance, balanceBefore + 3 ether);
    }

    function test_FactoryFloorParityForSixMultiplierCases() public {
        TugLauncher launcher = _newGame();
        _assertFloor(launcher, 10_000);
        _setFactories(5_000, true, 10_000, true);
        _assertFloor(launcher, 5_000);
        _setFactories(10_000, false, 5_000, true);
        _assertFloor(launcher, 5_000);
        _setFactories(10_000, true, 5_000, true);
        _assertFloor(launcher, 10_000);
        _setFactories(0, true, 5_000, true);
        _assertFloor(launcher, 0);
        _setFactories(5_000, false, 5_000, false);
        _assertFloor(launcher, 10_000);
    }

    function test_UnavailableFloorForDisabledZeroOrUnreadableQuote() public {
        _setFactories(10_000, true, 10_000, true);
        TugConfig memory config = _config();
        bytes memory readQuote = abi.encodeCall(IPortalFloor.launchQuoteConfig, (LAUNCH_KIND, address(0)));
        vm.mockCall(address(portal), readQuote, abi.encode(false, uint256(700 ether)));
        _assertUnavailableFloor(config);

        vm.clearMockedCalls();
        vm.mockCall(address(portal), readQuote, abi.encode(true, uint256(0)));
        _assertUnavailableFloor(config);

        vm.clearMockedCalls();
        _mockQuoteReverting();
        _assertUnavailableFloor(config);
    }

    function test_ZeroFloorIsAvailableButZeroMinRaiseIsRejected() public {
        _setFactories(0, true, 10_000, true);
        Limits memory limits = factory.limits();
        assertTrue(limits.creationFloorAvailable);
        assertEq(limits.minRaiseFloor, 0);
        TugConfig memory config = _config();
        config.minRaise = 0;
        _assertConfigRevert(config, ITugLauncherFactory.ZeroMinRaise.selector);
        config.minRaise = 1;
        (bool ok, bytes4 reason) = factory.validateConfig(config);
        _assertGate(ok, reason, bytes4(0));
    }

    function test_SecondLaunchRevertsAndUsesOnlyTheRaise() public {
        TugLauncher launcher = _readyToLaunch();
        uint256 fee = launcher.autoLaunchQuote();
        vm.prank(bob);
        launcher.scheduleAutoLaunch{value: fee}();
        uint256 budget = launcher.triggerBudget();
        vm.warp(launcher.deadline());

        vm.expectCall(address(portal), launcher.raised(), abi.encodePacked(IPortal.launchTaxTokenV2.selector), 1);
        launcher.launch();
        assertTrue(launcher.launched());
        assertEq(launcher.phase(), Phase.LAUNCHED);
        assertEq(address(launcher).balance, budget);
        assertEq(launcher.token(), factory.predictToken(launcher.getGame().config.salt));
        assertTrue(launcher.pool() != address(0));
        (address portalVault, address portalVaultFactory) = portal.getLaunchVault(launcher.token());
        assertEq(launcher.vault(), portalVault);
        assertEq(portalVaultFactory, address(vaultFactory));

        _assertLaunchError(launcher, ITugLauncher.AlreadyLaunched.selector);
    }

    function test_AllocationClaimsMatchReserveWithinOneTokenAndCapBlowout() public {
        TugLauncher launcher = _readyToLaunch();
        vm.warp(launcher.deadline());
        launcher.launch();
        IERC20 token = IERC20(launcher.token());
        assertEq(vaultFactory.reserveAtCreation(), 500_000 ether);
        assertEq(token.balanceOf(address(launcher)), 500_000 ether);
        assertEq(launcher.finalBlueShareBps(), 7_000);

        PlayerView memory bluePlayer = launcher.getPlayer(blue);
        PlayerView memory alicePlayer = launcher.getPlayer(alice);
        PlayerView memory redPlayer = launcher.getPlayer(red);
        assertApproxEqAbs(bluePlayer.bonusEntitlement + alicePlayer.bonusEntitlement, 91_000 ether, 1);
        assertEq(redPlayer.bonusEntitlement, 39_000 ether);
        uint256 captainTotal = launcher.getCaptain(blue).allocation + launcher.getCaptain(red).allocation;

        _claimPlayer(launcher, token, blue);
        _claimPlayer(launcher, token, alice);
        _claimPlayer(launcher, token, red);
        assertApproxEqAbs(token.balanceOf(address(launcher)), captainTotal, 1 ether);
    }

    function test_CaptainAllocationsVestLinearlyAndNothingVestsAtLaunch() public {
        TugLauncher launcher = _readyToLaunch();
        vm.warp(launcher.deadline());
        launcher.launch();

        CaptainAllocView memory blueCaptain = launcher.getCaptain(blue);
        CaptainAllocView memory redCaptain = launcher.getCaptain(red);
        assertGe(blueCaptain.allocation, 6_000 ether);
        assertLe(blueCaptain.allocation, 14_000 ether);
        assertGe(redCaptain.allocation, 6_000 ether);
        assertLe(redCaptain.allocation, 14_000 ether);
        assertEq(blueCaptain.allocation + redCaptain.allocation, 20_000 ether);
        assertEq(blueCaptain.vested + redCaptain.vested, 0);
        (bool ok, bytes4 reason) = launcher.canClaimCaptain(blue);
        _assertGate(ok, reason, ITugLauncher.NothingToClaim.selector);
        vm.expectRevert(reason);
        vm.prank(blue);
        launcher.claimCaptain();

        uint256 vestedHalf = blueCaptain.allocation / 2;
        vm.warp(block.timestamp + 15 days);
        assertEq(launcher.getCaptain(blue).claimable, vestedHalf);
        vm.prank(blue);
        launcher.claimCaptain();
        assertEq(IERC20(launcher.token()).balanceOf(blue), vestedHalf);
        vm.warp(blueCaptain.vestEnd);
        assertEq(launcher.getCaptain(blue).claimable, blueCaptain.allocation - vestedHalf);
        vm.prank(blue);
        launcher.claimCaptain();
        assertEq(IERC20(launcher.token()).balanceOf(blue), blueCaptain.allocation);
    }

    function test_ScheduleAndClaimGatesMatchBeforeLaunch() public {
        TugLauncher launcher = _newGame();
        (bool ok, bytes4 reason) = launcher.canScheduleAutoLaunch();
        _assertGate(ok, reason, ITugLauncher.GameNotStarted.selector);
        vm.expectRevert(reason);
        launcher.scheduleAutoLaunch();

        (ok, reason) = launcher.canClaim(alice);
        _assertGate(ok, reason, ITugLauncher.NotLaunched.selector);
        vm.expectRevert(reason);
        vm.prank(alice);
        launcher.claim();

        _assertLaunchError(launcher, ITugLauncher.GameNotStarted.selector);
    }

    function test_TriggerRejectsNonServiceCaller() public {
        TugLauncher launcher = _newGame();
        vm.expectRevert(ITugLauncher.OnlyTriggerService.selector);
        launcher.trigger(0);
    }

    function test_StaleTriggerRequestDoesNothing() public {
        TugLauncher launcher = _readyToLaunch();
        uint256 fee = launcher.autoLaunchQuote();
        vm.prank(bob);
        launcher.scheduleAutoLaunch{value: fee}();
        uint256 requestId = launcher.autoLaunchRequestId();
        uint256 budget = launcher.triggerBudget();
        vm.warp(launcher.deadline());
        vm.prank(TRIGGER_SERVICE);
        launcher.trigger(requestId + 1);
        assertFalse(launcher.launched());
        assertEq(launcher.autoLaunchRequestId(), requestId);
        assertEq(launcher.triggerBudget(), budget);
    }

    function test_RefundRejectsReentrancyAndPaysOnce() public {
        TugLauncher launcher = _newGame();
        _start(launcher);
        TugRefundRecipient recipient = new TugRefundRecipient(launcher);
        vm.deal(address(recipient), 1 ether);
        vm.prank(address(recipient));
        launcher.contribute{value: 1 ether}(Team.BLUE);
        vm.warp(launcher.deadline());
        recipient.refund();
        assertEq(recipient.nestedError(), ReentrancyGuard.Reentrancy.selector);
        assertEq(address(recipient).balance, 1 ether);
        assertEq(launcher.contribution(address(recipient)), 0);
    }

    function _assertCancelAfterAcceptDeadline(TugLauncher launcher, address fundedCaptain) private {
        (bool ok, bytes4 reason) = launcher.canCancel();
        _assertGate(ok, reason, ITugLauncher.AcceptWindowOpen.selector);
        vm.expectRevert(reason);
        launcher.cancel();

        vm.warp(launcher.getGame().acceptDeadline);
        assertEq(launcher.phase(), Phase.AWAITING_CAPTAINS);
        (ok, reason) = launcher.canDepositCaptain(blue, CAPTAIN_DEPOSIT);
        _assertGate(ok, reason, ITugLauncher.AcceptWindowClosed.selector);
        vm.expectRevert(reason);
        _deposit(launcher, blue, CAPTAIN_DEPOSIT);

        (ok, reason) = launcher.canCancel();
        _assertGate(ok, reason, bytes4(0));
        uint256 fundedBalance = fundedCaptain.balance;
        launcher.cancel();
        assertEq(launcher.phase(), Phase.CANCELLED);
        if (fundedCaptain != address(0)) {
            assertEq(fundedCaptain.balance, fundedBalance + CAPTAIN_DEPOSIT);
            assertEq(launcher.contribution(fundedCaptain), 0);
        }
        (ok, reason) = launcher.canCancel();
        _assertGate(ok, reason, ITugLauncher.GameCancelled.selector);
        vm.expectRevert(reason);
        launcher.cancel();
    }

    function _assertOvertime(
        TugLauncher launcher,
        address player,
        uint8 team,
        uint256 amount,
        bool extends,
        uint8 expectedExtensions
    ) private {
        uint64 priorDeadline = launcher.deadline();
        (uint256 pull, uint16 rope, bool wouldExtend) = launcher.previewContribute(team, amount);
        assertEq(wouldExtend, extends);
        uint256 priorPull = launcher.pullOf(player);
        _contribute(launcher, player, team, amount);
        assertEq(launcher.pullOf(player) - priorPull, pull);
        assertEq(launcher.ropeBps(), rope);
        assertEq(launcher.deadline(), extends ? priorDeadline + 30 : priorDeadline);
        assertEq(launcher.getGame().extensionsUsed, expectedExtensions);
    }

    function _assertFloor(TugLauncher launcher, uint16 multiplier) private view {
        IPortalFloor lens = IPortalFloor(address(portal));
        (bool enabled, uint256 price) = lens.launchQuoteConfig(LAUNCH_KIND, address(0));
        assertTrue(enabled);
        assertGt(price, 0);
        IPortalFloor.GraduationFloorParams memory params = IPortalFloor.GraduationFloorParams(
            address(0), price, 1, TUG_POOL_TOKEN, TUG_TOTAL_SUPPLY, address(vaultFactory)
        );
        IPortalFloor.GraduationFloorResultV2 memory result =
            lens.graduationFloorV2ForLauncher(params, address(launcher));
        assertEq(result.multiplierBps, multiplier);
        uint256 floor = FixedPointMathLib.fullMulDivUp(result.createFloorUsdWad, 1 ether, price);
        Limits memory limits = factory.limits();
        assertTrue(limits.creationFloorAvailable);
        assertEq(limits.minRaiseFloor, floor);
        if (multiplier == 0) assertEq(floor, 0);
        if (floor == 0) return;

        params.poolQuote = floor;
        assertTrue(lens.graduationFloorV2ForLauncher(params, address(launcher)).meetsCreateFloor);
        params.poolQuote = floor - 1;
        assertFalse(lens.graduationFloorV2ForLauncher(params, address(launcher)).meetsCreateFloor);
    }

    function _assertUnavailableFloor(TugConfig memory config) private {
        Limits memory limits = factory.limits();
        assertFalse(limits.creationFloorAvailable);
        assertEq(limits.minRaiseFloor, 0);
        _assertConfigRevert(config, ITugLauncherFactory.CreationFloorUnavailable.selector);
    }

    function _mockQuoteReverting() private {
        vm.mockCallRevert(
            address(portal), abi.encodeCall(IPortalFloor.launchQuoteConfig, (LAUNCH_KIND, address(0))), ""
        );
    }

    function _assertConfigRevert(TugConfig memory config, bytes4 expected) private {
        (bool ok, bytes4 reason) = factory.validateConfig(config);
        _assertGate(ok, reason, expected);
        vm.expectRevert(expected);
        _create(config);
    }

    function _readyToLaunch() private returns (TugLauncher launcher) {
        launcher = _newGame();
        _start(launcher);
        _contribute(launcher, alice, Team.BLUE, 3 ether);
    }

    function _assertLaunchError(TugLauncher launcher, bytes4 expected) private {
        (bool ok, bytes4 reason) = launcher.canLaunch();
        _assertGate(ok, reason, expected);
        vm.expectRevert(expected);
        launcher.launch();
    }

    function _claimPlayer(TugLauncher launcher, IERC20 token, address player) private {
        uint256 amount = launcher.getPlayer(player).claimable;
        (bool ok, bytes4 reason) = launcher.canClaim(player);
        _assertGate(ok, reason, bytes4(0));
        vm.prank(player);
        launcher.claim();
        assertEq(token.balanceOf(player), amount);
        (ok, reason) = launcher.canClaim(player);
        _assertGate(ok, reason, ITugLauncher.NothingToClaim.selector);
    }

    function _assertGate(bool ok, bytes4 reason, bytes4 expected) private pure {
        assertEq(ok, expected == bytes4(0));
        assertEq(reason, expected);
    }
}

contract TugRefundRecipient {
    TugLauncher private immutable _launcher;
    bytes4 public nestedError;

    constructor(TugLauncher launcher) {
        _launcher = launcher;
    }

    function refund() external {
        _launcher.refund();
    }

    receive() external payable {
        try _launcher.refund() {}
        catch (bytes memory errorData) {
            nestedError = bytes4(errorData);
        }
    }
}
