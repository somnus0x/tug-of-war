// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {console2} from "forge-std/console2.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";
import {GameView, PlayerView, RulesView, Team} from "src/interfaces/TugTypes.sol";

import {TugScript} from "./TugScript.sol";
import {TugScriptErrors} from "./TugScriptErrors.sol";
import {IPancakeV2Router, ITugTaxToken, ITugTaxProcessor, TugTestnet} from "./TugTestnet.sol";

contract DemoGame is TugScript {
    struct Participant {
        Signer signer;
        uint8 team;
    }

    struct Trade {
        IERC20 token;
        Signer trader;
        address[] buyPath;
        address[] sellPath;
        uint16 buyTaxBps;
        uint16 sellTaxBps;
    }

    uint256 private constant BUY_AMOUNT = 0.1 ether;
    uint256 private constant TRADE_BUFFER_BPS = 500;
    uint256 private constant BPS = 10_000;
    string private constant BLUE_CAPTAIN_KEY = "CAPTAIN_BLUE_PRIVATE_KEY";
    string private constant RED_CAPTAIN_KEY = "CAPTAIN_RED_PRIVATE_KEY";
    string private constant BLUE_PLAYER_2_KEY = "BLUE_PLAYER_2_PRIVATE_KEY";
    string private constant RED_PLAYER_2_KEY = "RED_PLAYER_2_PRIVATE_KEY";

    error DuplicateParticipant(address account);
    error InvalidGameMode();
    error InvalidDepositTeam();
    error InvalidOvertimeTeam();
    error RefundRehearsalWouldMeetMinimum(uint256 plannedRaise, uint256 minimumRaise);
    error PlannedRaiseBelowMinimum(uint256 plannedRaise, uint256 minimumRaise);
    error OvertimePreviewRejected();
    error OvertimeTeamNotTrailing();
    error OvertimeExtensionMismatch(uint64 beforeDeadline, uint64 afterDeadline);
    error InvalidTradeRounds();
    error ApprovalFailed();

    function deposits() external {
        ITugLauncher game = _game();
        GameView memory state = game.getGame();
        uint256 amount = state.config.captainMinDeposit;
        bytes32 selection = _envChoice("CAPTAIN_DEPOSIT_TEAM", "both");
        bool takeBlue = selection == keccak256("both") || selection == keccak256("blue");
        bool takeRed = selection == keccak256("both") || selection == keccak256("red");
        if (!takeBlue && !takeRed) revert InvalidDepositTeam();
        takeBlue = takeBlue && !state.captainDeposited.blue;
        takeRed = takeRed && !state.captainDeposited.red;

        Signer memory blue;
        Signer memory red;
        if (takeBlue) {
            blue = _signer(BLUE_CAPTAIN_KEY);
            _checkCaptain(game, blue, state.config.captainBlue, amount);
        }
        if (takeRed) {
            red = _signer(RED_CAPTAIN_KEY);
            _checkCaptain(game, red, state.config.captainRed, amount);
        }
        if (takeBlue) _deposit(game, blue, amount);
        if (takeRed) _deposit(game, red, amount);
        _printClocks(game);
    }

    function contribute() external {
        ITugLauncher game = _game();
        Participant[6] memory players = _participants(game);
        uint256[4] memory amounts = [
            vm.envUint("BLUE_PLAYER_1_AMOUNT"),
            vm.envUint("BLUE_PLAYER_2_AMOUNT"),
            vm.envUint("RED_PLAYER_1_AMOUNT"),
            vm.envUint("RED_PLAYER_2_AMOUNT")
        ];

        uint256 plannedRaise = game.raised();
        for (uint256 i; i < amounts.length; ++i) {
            TugScriptErrors.check(amounts[i] > 0, ITugLauncher.ZeroContribution.selector);
            address account = players[i].signer.account;
            uint256 deposited = game.contribution(account);
            uint8 team = game.teamOf(account);
            TugScriptErrors.check(team == Team.NONE || team == players[i].team, ITugLauncher.TeamLocked.selector);
            amounts[i] = deposited >= amounts[i] ? 0 : amounts[i] - deposited;
            if (amounts[i] == 0) continue;
            _checkContribution(game, players[i], amounts[i]);
            plannedRaise += amounts[i];
        }
        _checkRaise(game, plannedRaise, _refundRehearsal());
        for (uint256 i; i < amounts.length; ++i) {
            if (amounts[i] != 0) _contribute(game, players[i], amounts[i]);
        }
        console2.log("Simulated raise including captain deposits (wei)", game.raised());
        _printClocks(game);
    }

    function overtime() external {
        ITugLauncher game = _game();
        GameView memory state = game.getGame();
        uint8 team = _overtimeTeam();
        uint256 amount = vm.envUint("OVERTIME_AMOUNT");
        (,, bool wouldTriggerOvertime) = game.previewContribute(team, amount);
        if (!wouldTriggerOvertime) {
            console2.log("Run again inside the final 60 seconds, ideally 30-45 seconds before the deadline.");
            revert OvertimePreviewRejected();
        }
        if (
            state.pullByTeam.blue == state.pullByTeam.red
                || (team == Team.BLUE && state.pullByTeam.blue > state.pullByTeam.red)
                || (team == Team.RED && state.pullByTeam.red > state.pullByTeam.blue)
        ) revert OvertimeTeamNotTrailing();

        Participant memory trailing =
            Participant(_signer(team == Team.BLUE ? BLUE_PLAYER_2_KEY : RED_PLAYER_2_KEY), team);
        _checkContribution(game, trailing, amount);
        _checkRaise(game, state.raised + amount, _refundRehearsal());
        uint64 expectedDeadline = state.deadline + game.getRules().overtimeExtension;
        console2.log("Deadline before overtime", state.deadline);
        _contribute(game, trailing, amount);
        uint64 extendedDeadline = game.deadline();
        console2.log("Simulated deadline after overtime", extendedDeadline);
        if (extendedDeadline != expectedDeadline) revert OvertimeExtensionMismatch(state.deadline, extendedDeadline);
    }

    function launch() external {
        ITugLauncher game = _game();
        (bool ok, bytes4 reason) = game.canLaunch();
        TugScriptErrors.check(ok, reason);
        _send(_signer("CREATOR_PRIVATE_KEY"), address(game), abi.encodeCall(ITugLauncher.launch, ()), 0);
        console2.log("Simulated token", game.token());
        console2.log("Simulated pool", game.pool());
        console2.log("Simulated vault", game.vault());
    }

    function cancel() external {
        ITugLauncher game = _game();
        (bool ok, bytes4 reason) = game.canCancel();
        TugScriptErrors.check(ok, reason);
        _send(_signer("CREATOR_PRIVATE_KEY"), address(game), abi.encodeCall(ITugLauncher.cancel, ()), 0);
        console2.log("Simulated cancelled launcher", address(game));
    }

    function refund() external {
        ITugLauncher game = _game();
        Participant[6] memory players = _participants(game);
        uint256[6] memory refunds;
        bool hasContributors;
        for (uint256 i; i < players.length; ++i) {
            address account = players[i].signer.account;
            if (game.contribution(account) == 0) continue;
            (bool ok, bytes4 reason) = game.canRefund(account);
            TugScriptErrors.check(ok, reason);
            hasContributors = true;
            refunds[i] = game.getPlayer(account).refundable;
        }
        TugScriptErrors.check(hasContributors, ITugLauncher.NothingToRefund.selector);
        for (uint256 i; i < players.length; ++i) {
            if (refunds[i] == 0) continue;
            _send(players[i].signer, address(game), abi.encodeCall(ITugLauncher.refund, ()), 0);
            console2.log("Simulated refund (wei)", players[i].signer.account, refunds[i]);
        }
    }

    function claimAndStake() external {
        ITugLauncher game = _game();
        ITugVault vault = _launchedVault(game);
        IERC20 token = IERC20(game.token());
        Participant[6] memory players = _participants(game);
        for (uint256 i; i < players.length; ++i) {
            address account = players[i].signer.account;
            (bool ok, bytes4 reason) = game.canClaim(account);
            bool claimed = reason == ITugLauncher.NothingToClaim.selector && game.getPlayer(account).claimed != 0;
            TugScriptErrors.check(ok || claimed, reason);
            TugScriptErrors.check(vault.getStaker(account).team == players[i].team, ITugVault.WrongTeam.selector);
        }
        for (uint256 i; i < players.length; ++i) {
            _claimAndStake(game, vault, token, players[i]);
        }
    }

    function claimRewards() external {
        ITugLauncher game = _game();
        ITugVault vault = _launchedVault(game);
        Participant[6] memory players = _participants(game);
        for (uint256 i; i < players.length; ++i) {
            Signer memory player = players[i].signer;
            uint256 pending = vault.pendingRewards(player.account);
            if (pending == 0) continue;
            _send(player, address(vault), abi.encodeCall(ITugVault.claimRewards, ()), 0);
            console2.log("Simulated staker payout (wei)", player.account, pending);
        }
        for (uint256 i = 4; i < players.length; ++i) {
            Signer memory captain = players[i].signer;
            uint256 pending = vault.pendingCaptain(captain.account);
            if (pending != 0) {
                _send(captain, address(vault), abi.encodeCall(ITugVault.claimCaptain, ()), 0);
                console2.log("Simulated captain BNB payout (wei)", captain.account, pending);
            }
            console2.log(
                "Simulated captain token vest end (Unix seconds)",
                captain.account,
                game.getCaptain(captain.account).vestEnd
            );
        }
    }

    function tradeAndDispatch() external {
        ITugLauncher game = _game();
        ITugVault vault = _launchedVault(game);
        address token = game.token();
        address wrapped = TugTestnet.ROUTER.WETH();
        ITugTaxProcessor processor = ITugTaxProcessor(ITugTaxToken(token).taxProcessor());
        _requireCode(address(processor));
        RulesView memory rules = game.getRules();
        Trade memory trade = Trade(
            IERC20(token),
            _signer("TRADER_PRIVATE_KEY"),
            _path(wrapped, token),
            _path(token, wrapped),
            rules.buyTaxBps,
            rules.sellTaxBps
        );
        uint256 maxRounds = vm.envOr("TRADE_ROUNDS", uint256(5));
        if (maxRounds == 0) revert InvalidTradeRounds();

        uint256 tradingBalance = trade.trader.account.balance;
        // Recover a prior buy even if its failed sell left the trader short of the next buy amount.
        if (trade.token.balanceOf(trade.trader.account) != 0) {
            _sellBalance(trade);
        } else if (processor.marketQuoteBalance() == 0) {
            _requireBalance(trade.trader, BUY_AMOUNT);
        }
        uint256 rounds;
        while (rounds < maxRounds && processor.marketQuoteBalance() == 0 && trade.trader.account.balance >= BUY_AMOUNT)
        {
            _tradeRound(trade);
            ++rounds;
        }
        console2.log("Simulated trading rounds", rounds);
        if (trade.trader.account.balance < tradingBalance) {
            console2.log("Simulated trader net spend before gas (wei)", tradingBalance - trade.trader.account.balance);
        }
        console2.log("Simulated processor market quote (wei)", processor.marketQuoteBalance());

        uint256 beforeDispatch = address(vault).balance;
        _send(trade.trader, address(processor), abi.encodeCall(ITugTaxProcessor.dispatch, ()), 0);
        console2.log("Simulated native BNB delivered to the vault (wei)", address(vault).balance - beforeDispatch);
    }

    function _participants(ITugLauncher game) private view returns (Participant[6] memory players) {
        players[0] = Participant(_signer("BLUE_PLAYER_1_PRIVATE_KEY"), Team.BLUE);
        players[1] = Participant(_signer(BLUE_PLAYER_2_KEY), Team.BLUE);
        players[2] = Participant(_signer("RED_PLAYER_1_PRIVATE_KEY"), Team.RED);
        players[3] = Participant(_signer(RED_PLAYER_2_KEY), Team.RED);
        players[4] = Participant(_signer(BLUE_CAPTAIN_KEY), Team.BLUE);
        players[5] = Participant(_signer(RED_CAPTAIN_KEY), Team.RED);
        if (players[4].signer.account != game.captainBlue() || players[5].signer.account != game.captainRed()) {
            TugScriptErrors.check(false, ITugLauncher.NotCaptain.selector);
        }
        for (uint256 i; i < players.length; ++i) {
            for (uint256 j; j < i; ++j) {
                if (players[i].signer.account == players[j].signer.account) {
                    revert DuplicateParticipant(players[i].signer.account);
                }
            }
        }
    }

    function _envChoice(string memory key, string memory defaultValue) private view returns (bytes32) {
        return keccak256(bytes(vm.envOr(key, defaultValue)));
    }

    function _refundRehearsal() private view returns (bool) {
        bytes32 mode = _envChoice("GAME_MODE", "launch");
        if (mode == keccak256("launch")) return false;
        if (mode == keccak256("refund")) return true;
        revert InvalidGameMode();
    }

    function _overtimeTeam() private view returns (uint8) {
        bytes32 team = _envChoice("OVERTIME_TEAM", "red");
        if (team == keccak256("blue")) return Team.BLUE;
        if (team == keccak256("red")) return Team.RED;
        revert InvalidOvertimeTeam();
    }

    function _checkRaise(ITugLauncher game, uint256 plannedRaise, bool rehearsal) private view {
        uint256 minimum = game.minRaise();
        if (rehearsal && plannedRaise >= minimum) revert RefundRehearsalWouldMeetMinimum(plannedRaise, minimum);
        if (!rehearsal && plannedRaise < minimum) revert PlannedRaiseBelowMinimum(plannedRaise, minimum);
    }

    function _checkContribution(ITugLauncher game, Participant memory player, uint256 amount) private view {
        (bool ok, bytes4 reason) = game.canContribute(player.signer.account, player.team, amount);
        TugScriptErrors.check(ok, reason);
        _requireBalance(player.signer, amount);
    }

    function _contribute(ITugLauncher game, Participant memory player, uint256 amount) private {
        _send(player.signer, address(game), abi.encodeCall(ITugLauncher.contribute, (player.team)), amount);
    }

    function _launchedVault(ITugLauncher game) private view returns (ITugVault vault) {
        TugScriptErrors.check(game.launched(), ITugLauncher.NotLaunched.selector);
        vault = ITugVault(game.vault());
    }

    function _claimAndStake(ITugLauncher game, ITugVault vault, IERC20 token, Participant memory player) private {
        address account = player.signer.account;
        PlayerView memory info = game.getPlayer(account);
        if (info.claimable != 0) {
            _send(player.signer, address(game), abi.encodeCall(ITugLauncher.claim, ()), 0);
        }
        uint256 allocation = info.claimed + info.claimable;
        uint256 staked = vault.stakeOf(account);
        if (staked >= allocation) return;
        uint256 amount = allocation - staked;
        uint256 balance = token.balanceOf(account);
        if (amount > balance) amount = balance;
        TugScriptErrors.check(amount != 0, ITugVault.ZeroAmount.selector);
        _approve(player.signer, token, address(vault), amount);
        _send(player.signer, address(vault), abi.encodeCall(ITugVault.stake, (amount, player.team)), 0);
        console2.log("Simulated total stake (token wei)", account, vault.stakeOf(account));
    }

    function _approve(Signer memory signer, IERC20 token, address spender, uint256 amount) private {
        if (token.allowance(signer.account, spender) >= amount) return;
        bytes memory result = _send(signer, address(token), abi.encodeCall(IERC20.approve, (spender, amount)), 0);
        if (result.length != 0 && !abi.decode(result, (bool))) revert ApprovalFailed();
    }

    function _tradeRound(Trade memory trade) private {
        IPancakeV2Router router = TugTestnet.ROUTER;
        address account = trade.trader.account;
        uint256 deadline = block.timestamp + 5 minutes;
        uint256 buyMin = _tradeMinimum(BUY_AMOUNT, trade.buyPath, trade.buyTaxBps);
        _send(
            trade.trader,
            address(router),
            abi.encodeCall(
                IPancakeV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens,
                (buyMin, trade.buyPath, account, deadline)
            ),
            BUY_AMOUNT
        );
        _sellBalance(trade);
    }

    function _sellBalance(Trade memory trade) private {
        IPancakeV2Router router = TugTestnet.ROUTER;
        address account = trade.trader.account;
        uint256 amount = trade.token.balanceOf(account);
        _approve(trade.trader, trade.token, address(router), amount);
        uint256 sellMin = _tradeMinimum(amount, trade.sellPath, trade.sellTaxBps);
        uint256 deadline = block.timestamp + 5 minutes;
        _send(
            trade.trader,
            address(router),
            abi.encodeCall(
                IPancakeV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens,
                (amount, sellMin, trade.sellPath, account, deadline)
            ),
            0
        );
    }

    function _tradeMinimum(uint256 amount, address[] memory path, uint16 taxBps) private view returns (uint256) {
        uint256 quoted = TugTestnet.ROUTER.getAmountsOut(amount, path)[1];
        return quoted * (BPS - taxBps - TRADE_BUFFER_BPS) / BPS;
    }

    function _path(address from, address to) private pure returns (address[] memory path) {
        path = new address[](2);
        path[0] = from;
        path[1] = to;
    }
}
