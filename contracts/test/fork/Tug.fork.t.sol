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

import {IPancakeV2Router, ITugTaxToken, ITugTaxProcessor, TugTestnet} from "../../script/TugTestnet.sol";
import {TugBase} from "./TugBase.sol";

interface IV2PairFactory {
    function factory() external view returns (address);
}

contract NonPayableStaker {
    function stake(TugVault vault, uint256 amount) external {
        IERC20(vault.taxToken()).approve(address(vault), amount);
        vault.stake(amount, Team.BLUE);
    }

    function unstake(TugVault vault, uint256 amount) external {
        vault.unstake(amount);
    }

    function claimRewards(TugVault vault) external {
        vault.claimRewards();
    }
}

contract TugForkTest is TugBase {
    struct TaxTrades {
        uint256 buys;
        uint256 sells;
        bool buyReverted;
        bool sellReverted;
    }

    IPancakeV2Router private constant ROUTER = TugTestnet.ROUTER;
    address private constant TRADER = address(0xA6);
    address private constant DISPATCHER = address(0xBEEF);

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

    function test_MeasureTradingAndDispatchInsideAntiFarmerWindow() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        ITugTaxProcessor processor = ITugTaxProcessor(ITugTaxToken(game.token()).taxProcessor());
        emit log_named_uint("Seconds since launch", block.timestamp - game.deadline());
        emit log_named_uint("Anti-farmer duration in seconds", game.getRules().antiFarmerDuration);

        TaxTrades memory trades = _tradeToCollectTax(game, processor);
        emit log_named_uint("Successful buys inside anti-farmer window", trades.buys);
        emit log_named_uint("Successful sells inside anti-farmer window", trades.sells);
        emit log_named_string("Buy attempt reverted", trades.buyReverted ? "yes" : "no");
        emit log_named_string("Sell attempt reverted", trades.sellReverted ? "yes" : "no");
        emit log_named_uint("Market quote before dispatch inside anti-farmer window", processor.marketQuoteBalance());

        uint256 beforeDispatch = address(vault).balance;
        vm.prank(DISPATCHER);
        try processor.dispatch() {
            emit log_named_string("Dispatch inside anti-farmer window", "succeeded");
        } catch (bytes memory reason) {
            emit log_named_string("Dispatch inside anti-farmer window", "reverted");
            emit log_named_bytes("Dispatch revert data", reason);
        }
        emit log_named_uint(
            "Native BNB delivered by dispatch inside anti-farmer window", address(vault).balance - beforeDispatch
        );
    }

    function test_MeasureDemoSizedTradesUntilTaxLiquidates() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        address token = game.token();
        ITugTaxProcessor processor = ITugTaxProcessor(ITugTaxToken(token).taxProcessor());
        uint256 budget = 3 ether;
        vm.deal(TRADER, budget);

        address[] memory sellPath = new address[](2);
        sellPath[0] = token;
        sellPath[1] = ROUTER.WETH();
        vm.prank(TRADER);
        IERC20(token).approve(address(ROUTER), type(uint256).max);

        uint256 rounds;
        while (rounds < 30 && processor.marketQuoteBalance() == 0 && TRADER.balance >= 0.1 ether) {
            assertTrue(_tryBuy(token, 0.1 ether));
            uint256 tokens = IERC20(token).balanceOf(TRADER);
            vm.prank(TRADER);
            ROUTER.swapExactTokensForETHSupportingFeeOnTransferTokens(tokens, 0, sellPath, TRADER, block.timestamp);
            ++rounds;
        }
        emit log_named_uint("Demo rounds (0.1 tBNB buy, full sell)", rounds);
        emit log_named_uint("Trader tBNB spent (wei)", budget - TRADER.balance);
        emit log_named_uint("Market quote after demo trades (wei)", processor.marketQuoteBalance());

        uint256 beforeDispatch = address(vault).balance;
        vm.prank(DISPATCHER);
        try processor.dispatch() {
            emit log_named_string("Dispatch after demo trades", "succeeded");
        } catch (bytes memory reason) {
            emit log_named_string("Dispatch after demo trades", "reverted");
            emit log_named_bytes("Dispatch revert data", reason);
        }
        emit log_named_uint("Native BNB delivered by dispatch (wei)", address(vault).balance - beforeDispatch);
    }

    function test_PostLaunchBuyerChoosesATeamAndKeepsItAfterUnstaking() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        _prepareTrading(game);
        vm.deal(TRADER, 5 ether);
        assertTrue(_tryBuy(game.token(), 1 ether));
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
        assertEq(alice.balance, beforeBalance);
        _claimStaker(vault, alice, 0.8 ether);
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

    function test_StakerThatCannotReceiveBnbCanWithdrawAllTokens() public {
        (TugLauncher game, TugVault vault) = _launchDefaultGame();
        NonPayableStaker staker = new NonPayableStaker();
        IERC20 token = IERC20(game.token());
        uint256 stakeAmount = 1_000 ether;
        vm.startPrank(alice);
        game.claim();
        assertTrue(token.transfer(address(staker), stakeAmount * 2));
        vm.stopPrank();

        staker.stake(vault, stakeAmount);
        _sendRevenue(vault, 1 ether);
        assertEq(vault.pendingRewards(address(staker)), 0.8 ether);
        staker.stake(vault, stakeAmount);
        staker.unstake(vault, stakeAmount * 2);

        assertEq(token.balanceOf(address(staker)), stakeAmount * 2);
        assertEq(vault.stakeOf(address(staker)), 0);
        assertEq(vault.pendingRewards(address(staker)), 0.8 ether);
        assertEq(vault.getStaker(address(staker)).pendingRewards, 0.8 ether);

        // A failed claim must also roll back the sync of revenue that arrived since unstaking.
        _sendRevenue(vault, 1 ether);
        VaultView memory beforeClaim = vault.getVault();
        uint256 vaultBalance = address(vault).balance;
        vm.expectRevert(ITugVault.TransferFailed.selector);
        staker.claimRewards(vault);

        assertEq(address(vault).balance, vaultBalance);
        assertEq(address(staker).balance, 0);
        assertEq(token.balanceOf(address(staker)), stakeAmount * 2);
        assertEq(vault.stakeOf(address(staker)), 0);
        assertEq(vault.getStaker(address(staker)).pendingRewards, 0.8 ether);
        assertEq(abi.encode(vault.getVault()), abi.encode(beforeClaim));

        vm.expectEmit(false, false, false, true, address(vault));
        emit ITugVault.Synced(1 ether, 0.2 ether, 0, 0, 0.8 ether);
        vault.sync();
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
        ITugTaxProcessor processor = ITugTaxProcessor(ITugTaxToken(game.token()).taxProcessor());
        TaxTrades memory trades = _tradeToCollectTax(game, processor);
        assertFalse(trades.buyReverted);
        assertFalse(trades.sellReverted);
        assertGt(processor.marketQuoteBalance(), 0);

        address vault = game.vault();
        uint256 beforeDispatch = vault.balance;
        vm.prank(DISPATCHER);
        processor.dispatch();
        assertGt(vault.balance, beforeDispatch);
        uint256 delivered = vault.balance - beforeDispatch;
        emit log_named_uint("Tax liquidation trade rounds", trades.sells);
        emit log_named_uint("Native BNB delivered by dispatch from 0xBEEF", delivered);
        return delivered;
    }

    function _tradeToCollectTax(TugLauncher game, ITugTaxProcessor processor)
        private
        returns (TaxTrades memory trades)
    {
        address token = game.token();
        address vault = game.vault();
        uint256 beforeBalance = vault.balance;
        vm.deal(TRADER, 100 ether);
        if (!_tryBuy(token, 40 ether)) {
            trades.buyReverted = true;
            return trades;
        }
        trades.buys = 1;

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = ROUTER.WETH();
        vm.prank(TRADER);
        IERC20(token).approve(address(ROUTER), type(uint256).max);
        while (trades.sells < 80 && vault.balance == beforeBalance && processor.marketQuoteBalance() == 0) {
            uint256 sellAmount = IERC20(token).balanceOf(TRADER) / 3;
            if (sellAmount == 0) break;
            uint256 traderBefore = TRADER.balance;
            vm.prank(TRADER);
            try ROUTER.swapExactTokensForETHSupportingFeeOnTransferTokens(sellAmount, 0, path, TRADER, block.timestamp)
            {
                ++trades.sells;
            } catch (bytes memory reason) {
                trades.sellReverted = true;
                emit log_named_bytes("Sell revert data", reason);
                break;
            }
            uint256 proceeds = TRADER.balance - traderBefore;
            if (proceeds == 0) continue;
            if (!_tryBuy(token, proceeds * 9 / 10)) {
                trades.buyReverted = true;
                break;
            }
            ++trades.buys;
        }
    }

    function _tryBuy(address token, uint256 amount) private returns (bool) {
        address[] memory path = new address[](2);
        path[0] = ROUTER.WETH();
        path[1] = token;
        vm.prank(TRADER);
        try ROUTER.swapExactETHForTokensSupportingFeeOnTransferTokens{value: amount}(0, path, TRADER, block.timestamp) {
            return true;
        } catch (bytes memory reason) {
            emit log_named_bytes("Buy revert data", reason);
            return false;
        }
    }
}
