// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {LibClone} from "solady/utils/LibClone.sol";

import {DirectLaunchVaultFactoryBase} from "src/flap/DirectLaunchVaultFactoryBase.sol";
import {IFlapTriggerService} from "src/flap/IFlapTriggerService.sol";
import {LaunchVaultAddresses} from "src/flap/LaunchVaultAddresses.sol";
import {IPortalFloor} from "src/interfaces/IPortalFloor.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";
import {Phase, Team, TeamPair, TugConfig, VaultView} from "src/interfaces/TugTypes.sol";
import {TugLauncher} from "src/launcher/TugLauncher.sol";
import {TugLauncherFactory} from "src/launcher/TugLauncherFactory.sol";
import {TugMath} from "src/libraries/TugMath.sol";
import {TugVault} from "src/vault/TugVault.sol";
import {TugVaultFactory} from "src/vault/TugVaultFactory.sol";

import {TugBase} from "./TugBase.sol";

interface IPancakeV2Router {
    function factory() external view returns (address);
    function WETH() external view returns (address);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 minOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amount,
        uint256 minOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IV2PairFactory {
    function factory() external view returns (address);
}

interface ITugTaxToken {
    function taxProcessor() external view returns (address);
}

interface ITugTaxProcessor {
    function marketQuoteBalance() external view returns (uint256);
    function dispatch() external;
}

contract TugForkTest is TugBase {
    IPancakeV2Router private constant ROUTER = IPancakeV2Router(0xc9D63ddCB9549578057EAB6A83a543DdFEE2b8c3);
    address private constant TRADER = address(0xA6);

    function test_FullJourneyTradesTaxAndPaysStakersAndCaptains() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        IERC20 token = IERC20(game.token());
        assertEq(vault.launcher(), address(game));
        assertEq(vault.taxToken(), address(token));
        (address portalVault, address recordedFactory) = portal.getLaunchVault(address(token));
        assertEq(portalVault, address(vault));
        assertEq(recordedFactory, address(vaultFactory));
        assertEq(
            address(vault),
            LibClone.predictDeterministicAddressERC1967BeaconProxy(
                address(vaultFactory.beacon()), bytes32(uint256(uint160(address(token)))), address(vaultFactory)
            )
        );

        uint256 earlyRevenue = _tradeUntilVaultReceivesTax(game);
        _claimAndStake(game, vault, alice, Team.BLUE, 1_000 ether);
        _claimAndStake(game, vault, bob, Team.RED, 2_000 ether);
        uint256 sharedRevenue = _tradeUntilVaultReceivesTax(game);
        emit log_named_uint("Native trading tax delivered to TugVault", earlyRevenue + sharedRevenue);

        _claimTradingTax(game, vault, earlyRevenue, sharedRevenue);
        assertEq(address(vault).balance, 0);
    }

    function test_PostLaunchBuyerChoosesATeamAndKeepsItAfterUnstaking() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        _prepareTrading(game);
        vm.deal(TRADER, 5 ether);
        _buy(game.token(), TRADER, 1 ether);
        assertEq(vault.getStaker(TRADER).team, Team.NONE);
        assertEq(vault.getStaker(alice).team, Team.BLUE);
        vm.expectRevert(ITugVault.WrongTeam.selector);
        vm.prank(alice);
        vault.stake(1 ether, Team.RED);

        IERC20 token = IERC20(game.token());
        uint256 amount = token.balanceOf(TRADER);
        assertGt(amount, 0);
        vm.startPrank(TRADER);
        token.approve(address(vault), amount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ITugVault.Staked(TRADER, Team.RED, amount);
        vault.stake(amount, Team.RED);
        assertEq(vault.stakerTeam(TRADER), Team.RED);
        assertEq(vault.stakeOf(TRADER), amount);
        assertEq(token.balanceOf(address(vault)), amount);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ITugVault.Unstaked(TRADER, Team.RED, amount);
        vault.unstake(amount);
        assertEq(token.balanceOf(TRADER), amount);
        assertEq(vault.getStaker(TRADER).team, Team.RED);
        vm.expectRevert(ITugVault.WrongTeam.selector);
        vault.stake(amount, Team.BLUE);
        vm.stopPrank();
    }

    function test_UnequalTeamStakeKeepsTheFixedRopeSplit() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        assertEq(game.finalBlueShareBps(), 7_000);
        _claimAndStake(game, vault, alice, Team.BLUE, 1_000 ether);
        _claimAndStake(game, vault, bob, Team.RED, 4_000 ether);
        _sendRevenue(vault, 1 ether);

        assertEq(vault.teamStake(Team.BLUE), 1_000 ether);
        assertEq(vault.teamStake(Team.RED), 4_000 ether);
        _claimStaker(vault, alice, 0.56 ether);
        _claimStaker(vault, bob, 0.24 ether);
        _claimCaptain(vault, blue, 0.14 ether);
        _claimCaptain(vault, red, 0.06 ether);
        assertEq(address(vault).balance, 0);
    }

    function test_EmptyTeamsCarryOrRedirectRevenueAndDoNotPayCaptainsTwice() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        _sendRevenue(vault, 2 ether);
        assertEq(vault.getVault().undistributed, 1.6 ether);
        vault.sync();
        _claimCaptain(vault, blue, 0.28 ether);
        _claimCaptain(vault, red, 0.12 ether);
        assertEq(vault.getVault().undistributed, 1.6 ether);

        _claimAndStake(game, vault, alice, Team.BLUE, 1_000 ether);
        assertEq(vault.getVault().undistributed, 0);
        _claimStaker(vault, alice, 1.6 ether);
        assertEq(vault.pendingCaptain(blue), 0);
        assertEq(vault.pendingCaptain(red), 0);

        // Another BNB arrives while Red is empty. Removing stake settles the whole staker share.
        _sendRevenue(vault, 1 ether);
        assertEq(vault.pendingRewards(alice), 0.8 ether);
        uint256 beforeBalance = alice.balance;
        vm.prank(alice);
        vault.unstake(400 ether);
        assertEq(alice.balance - beforeBalance, 0.8 ether);
        assertEq(vault.teamStake(Team.BLUE), 600 ether);

        _claimAndStake(game, vault, bob, Team.RED, 4_000 ether);
        assertEq(vault.pendingRewards(bob), 0);
        _sendRevenue(vault, 1 ether);
        _claimStaker(vault, alice, 0.56 ether - 1);
        _claimStaker(vault, bob, 0.24 ether);
        _claimCaptain(vault, blue, 0.28 ether);
        _claimCaptain(vault, red, 0.12 ether);
        assertEq(address(vault).balance, 1);
    }

    function test_NewStakePreviewsEvaluateEachTeamIndependentlyAndExcludeCarry() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        _sendRevenue(vault, 2 ether);
        VaultView memory preview = vault.getVault();
        assertEq(preview.undistributed, 1.6 ether);
        assertEq(preview.rewardPer1000NewTokensPerBnb.blue, 0.8 ether);
        assertEq(preview.rewardPer1000NewTokensPerBnb.red, 0.8 ether);

        _claimAndStake(game, vault, alice, Team.BLUE, 1_000 ether);
        preview = vault.getVault();
        assertEq(preview.rewardPer1000NewTokensPerBnb.blue, 0.4 ether);
        assertEq(preview.rewardPer1000NewTokensPerBnb.red, 0.24 ether);
        assertEq(vault.getStaker(alice).pendingRewards, 1.6 ether);
        assertEq(vault.pendingRewards(alice), 1.6 ether);
        assertEq(vault.getCaptain(blue).claimable, 0.28 ether);
        assertEq(vault.pendingCaptain(blue), 0.28 ether);

        _claimAndStake(game, vault, bob, Team.RED, 3_000 ether);
        preview = vault.getVault();
        assertEq(preview.rewardPer1000NewTokensPerBnb.blue, 0.28 ether);
        assertEq(preview.rewardPer1000NewTokensPerBnb.red, 0.06 ether);
        _claimStaker(vault, alice, 1.6 ether);
        _claimCaptain(vault, blue, 0.28 ether);
    }

    function test_NewStakePreviewIsZeroForATeamWithZeroFinalShare() public {
        _setFactories(10_000, true, 10_000, true);
        TugConfig memory config = _config();
        config.captainMinDeposit = 0;
        TugLauncher game = _create(config);
        _deposit(game, blue, 0);
        _deposit(game, red, 0);
        _contribute(game, bob, Team.RED, config.minRaise);
        vm.warp(game.deadline());
        game.launch();
        assertEq(game.finalBlueShareBps(), 0);

        TugVault vault = TugVault(payable(game.vault()));
        _claimAndStake(game, vault, bob, Team.RED, 4_000 ether);
        TeamPair memory rate = vault.getVault().rewardPer1000NewTokensPerBnb;
        assertEq(rate.blue, 0);
        assertEq(rate.red, 0.16 ether);
    }

    function test_ZeroValuePingDoesNotRecognizePriorPayoutsAsRevenue() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        _claimAndStake(game, vault, alice, Team.BLUE, 1_000 ether);
        _sendRevenue(vault, 1 ether);
        _claimStaker(vault, alice, 0.8 ether);
        _claimCaptain(vault, blue, 0.14 ether);
        _sendRevenue(vault, 0);

        vm.expectEmit(false, false, false, true, address(vault));
        emit ITugVault.Synced(0, 0, 0, 0, 0);
        vault.sync();
        assertEq(vault.pendingRewards(alice), 0);
        assertEq(vault.pendingCaptain(blue), 0);
        _claimCaptain(vault, red, 0.06 ether);
        assertEq(address(vault).balance, 0);

        _sendRevenue(vault, 1 ether);
        _claimStaker(vault, alice, 0.8 ether);
        _claimCaptain(vault, blue, 0.14 ether);
        _claimCaptain(vault, red, 0.06 ether);
        assertEq(address(vault).balance, 0);
    }

    function test_VaultFactoryRefusesLauncherFromAnotherFactory() public {
        TugLauncherFactory stranger = _deployLauncherFactory();
        vm.startPrank(admin);
        portal.setLauncherFactoryMultiplier(address(stranger), 10_000, true);
        portal.setVaultFactoryMultiplier(address(vaultFactory), 10_000, true);
        vm.stopPrank();

        TugConfig memory config = _config("stranger launcher");
        vm.prank(creator);
        TugLauncher game = TugLauncher(portal.newLauncher{value: saltFee}(address(stranger), abi.encode(config)));
        assertTrue(stranger.isLauncher(address(game)));
        assertFalse(factory.isLauncher(address(game)));

        _start(game);
        _contribute(game, alice, Team.BLUE, config.minRaise);
        vm.warp(game.deadline());
        vm.expectRevert(TugVaultFactory.UnrecognizedLauncher.selector);
        game.launch();
        assertFalse(game.launched());
    }

    function test_VaultFactoryPairingAndUpgradeAreRestricted() public {
        TugVaultFactory fresh = new TugVaultFactory();
        vm.expectRevert(TugVaultFactory.OnlyDeployer.selector);
        vm.prank(alice);
        fresh.setLauncherFactory(address(factory));

        vm.expectRevert(DirectLaunchVaultFactoryBase.ZeroAddress.selector);
        fresh.setLauncherFactory(address(0));
        fresh.setLauncherFactory(address(factory));
        vm.expectRevert(TugVaultFactory.LauncherFactoryAlreadySet.selector);
        fresh.setLauncherFactory(address(factory));
        assertEq(fresh.beacon().owner(), address(fresh));

        address replacement = address(new TugVault(address(fresh)));
        vm.expectRevert(abi.encodeWithSelector(DirectLaunchVaultFactoryBase.NotGuardian.selector, address(this)));
        fresh.upgradeVaultImplementation(replacement);
        vm.prank(LaunchVaultAddresses.guardian());
        fresh.upgradeVaultImplementation(replacement);
        assertEq(fresh.beacon().implementation(), replacement);
    }

    function test_TriggerReschedulesOvertimeAndLaunchesAtTheNewDeadline() public {
        (TugLauncher game, uint256 requestId, uint64 oldDeadline) = _scheduleOvertime();
        uint64 newDeadline = game.deadline();
        uint256 fee = IFlapTriggerService(TRIGGER_SERVICE).getFee();
        uint256 budget = game.triggerBudget();

        vm.warp(oldDeadline);
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        uint256 nextId = game.autoLaunchRequestId();
        assertNotEq(nextId, requestId);
        assertEq(game.triggerBudget(), budget - fee);
        IFlapTriggerService.TriggerRequest memory request = IFlapTriggerService(TRIGGER_SERVICE).getRequest(nextId);
        assertEq(request.executeAfter, newDeadline);
        assertEq(request.requester, address(game));
        assertFalse(game.launched());

        vm.warp(newDeadline);
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertFalse(game.launched());
        vm.prank(TRIGGER_SERVICE);
        game.trigger(nextId);
        assertTrue(game.launched());
        assertGt(game.vault().code.length, 0);
    }

    function test_TriggerSkipsUnmetOrUnavailableFloorAndLaunchesWhenCleared() public {
        TugLauncher game = _newGame();
        _start(game);
        uint256 requestId = _schedule(game);
        _contribute(game, alice, Team.BLUE, game.minRaise());
        vm.warp(game.deadline());

        bytes memory selector = abi.encodePacked(IPortalFloor.graduationFloorV2ForLauncher.selector);
        IPortalFloor.GraduationFloorResultV2 memory belowFloor;
        vm.mockCall(address(portal), selector, abi.encode(belowFloor));
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertFalse(game.launched());

        vm.clearMockedCalls();
        vm.mockCallRevert(address(portal), selector, "");
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertFalse(game.launched());

        vm.clearMockedCalls();
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertTrue(game.launched());
    }

    function test_TriggerSkipsAGameThatMissedItsMinimumRaise() public {
        TugLauncher game = _newGame();
        _start(game);
        uint256 requestId = _schedule(game);
        vm.warp(game.deadline());
        assertEq(game.phase(), Phase.REFUNDING);
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertFalse(game.launched());
    }

    function test_TriggerFeeRiseStopsOvertimeRescheduleAndManualLaunchWorks() public {
        (TugLauncher game, uint256 requestId, uint64 oldDeadline) = _scheduleOvertime();
        uint256 budget = game.triggerBudget();
        vm.mockCall(
            TRIGGER_SERVICE, abi.encodeWithSelector(IFlapTriggerService.getFee.selector), abi.encode(budget + 1)
        );
        vm.warp(oldDeadline);
        vm.expectEmit(true, false, false, true, address(game));
        emit ITugLauncher.AutoLaunchStopped(requestId);
        vm.prank(TRIGGER_SERVICE);
        game.trigger(requestId);
        assertEq(game.autoLaunchRequestId(), requestId);
        assertEq(game.triggerBudget(), budget);
        assertFalse(game.launched());

        vm.warp(game.deadline());
        game.launch();
        assertTrue(game.launched());
    }

    function _launchDefaultGame() private returns (TugLauncher game, TugVault vault) {
        game = _newGame();
        _start(game);
        _contribute(game, alice, Team.BLUE, 3 ether);
        _contribute(game, bob, Team.RED, 1 ether);
        vm.warp(game.deadline());
        game.launch();
        vault = TugVault(payable(game.vault()));
    }

    function _scheduleOvertime() private returns (TugLauncher game, uint256 requestId, uint64 oldDeadline) {
        game = _newGame();
        _start(game);
        oldDeadline = game.deadline();
        requestId = _schedule(game);
        vm.warp(oldDeadline - 1);
        _contribute(game, alice, Team.BLUE, game.minRaise());
        assertEq(game.deadline(), oldDeadline + 30);
    }

    function _schedule(TugLauncher game) private returns (uint256 requestId) {
        uint256 quote = game.autoLaunchQuote();
        vm.prank(bob);
        game.scheduleAutoLaunch{value: quote}();
        return game.autoLaunchRequestId();
    }

    function _claimAndStake(TugLauncher game, TugVault vault, address staker, uint8 team, uint256 amount) private {
        vm.startPrank(staker);
        game.claim();
        IERC20(game.token()).approve(address(vault), amount);
        vault.stake(amount, team);
        vm.stopPrank();
        assertEq(vault.stakeOf(staker), amount);
    }

    function _claimTradingTax(TugLauncher game, TugVault vault, uint256 earlyRevenue, uint256 sharedRevenue) private {
        uint16 captainShare = game.getRules().captainShareBps;
        (uint256 earlyCaptain, uint256 carry) = TugMath.split(earlyRevenue, captainShare);
        (uint256 sharedCaptain, uint256 sharedStaker) = TugMath.split(sharedRevenue, captainShare);
        uint16 rope = game.finalBlueShareBps();
        (uint256 earlyBlueCaptain, uint256 earlyRedCaptain) = TugMath.split(earlyCaptain, rope);
        (uint256 sharedBlueCaptain, uint256 sharedRedCaptain) = TugMath.split(sharedCaptain, rope);
        (uint256 blueStaker, uint256 redStaker) = TugMath.split(sharedStaker, rope);

        _claimCaptain(vault, blue, earlyBlueCaptain + sharedBlueCaptain);
        _claimCaptain(vault, red, earlyRedCaptain + sharedRedCaptain);
        // Red's stake syncs the carry while Blue is the only staker.
        _claimStaker(vault, alice, carry + blueStaker);
        _claimStaker(vault, bob, redStaker);
    }

    function _sendRevenue(TugVault vault, uint256 amount) private {
        vm.prank(creator);
        (bool sent,) = address(vault).call{value: amount}("");
        assertTrue(sent);
    }

    function _claimCaptain(TugVault vault, address captain, uint256 expected) private {
        assertEq(vault.pendingCaptain(captain), expected);
        assertEq(vault.getCaptain(captain).claimable, expected);
        uint256 beforeBalance = captain.balance;
        vm.prank(captain);
        vault.claimCaptain();
        assertEq(captain.balance - beforeBalance, expected);
        assertEq(vault.pendingCaptain(captain), 0);
    }

    function _claimStaker(TugVault vault, address staker, uint256 expected) private {
        assertEq(vault.pendingRewards(staker), expected);
        assertEq(vault.getStaker(staker).pendingRewards, expected);
        uint256 beforeBalance = staker.balance;
        vm.prank(staker);
        vault.claimRewards();
        assertEq(staker.balance - beforeBalance, expected);
        assertEq(vault.pendingRewards(staker), 0);
    }

    function _prepareTrading(TugLauncher game) private {
        assertEq(ROUTER.factory(), IV2PairFactory(game.pool()).factory());
        vm.warp(block.timestamp + game.getRules().antiFarmerDuration + 1);
    }

    function _tradeUntilVaultReceivesTax(TugLauncher game) private returns (uint256) {
        _prepareTrading(game);
        address token = game.token();
        address vault = game.vault();
        uint256 beforeBalance = vault.balance;
        ITugTaxProcessor processor = ITugTaxProcessor(ITugTaxToken(token).taxProcessor());
        vm.deal(TRADER, 100 ether);
        _buy(token, TRADER, 40 ether);

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = ROUTER.WETH();
        vm.prank(TRADER);
        IERC20(token).approve(address(ROUTER), type(uint256).max);
        uint256 rounds;
        while (rounds < 80 && vault.balance == beforeBalance && processor.marketQuoteBalance() == 0) {
            uint256 sellAmount = IERC20(token).balanceOf(TRADER) / 3;
            if (sellAmount == 0) break;
            uint256 traderBefore = TRADER.balance;
            vm.prank(TRADER);
            ROUTER.swapExactTokensForETHSupportingFeeOnTransferTokens(sellAmount, 0, path, TRADER, block.timestamp);
            uint256 proceeds = TRADER.balance - traderBefore;
            if (proceeds > 0) _buy(token, TRADER, proceeds * 9 / 10);
            ++rounds;
        }

        uint256 balanceBeforeDispatch = vault.balance;
        processor.dispatch();
        emit log_named_uint("Tax liquidation trade rounds", rounds);
        emit log_named_uint("Native BNB delivered by dispatch", vault.balance - balanceBeforeDispatch);
        assertGt(vault.balance, beforeBalance);
        return vault.balance - beforeBalance;
    }

    function _buy(address token, address trader, uint256 amount) private {
        address[] memory path = new address[](2);
        path[0] = ROUTER.WETH();
        path[1] = token;
        vm.prank(trader);
        ROUTER.swapExactETHForTokensSupportingFeeOnTransferTokens{value: amount}(0, path, trader, block.timestamp);
    }
}
