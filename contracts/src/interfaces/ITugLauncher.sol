// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ITriggerReceiver} from "../flap/IFlapTriggerService.sol";
import {CaptainAllocView, GameView, PlayerView, RulesView} from "./TugTypes.sol";

/// @notice Frontend interface for one Tug of War game.
interface ITugLauncher is ITriggerReceiver {
    /// @notice A named captain deposited and locked their team.
    /// @param captain Captain's wallet.
    /// @param team Captain's Team ID.
    /// @param amount Deposit in BNB wei.
    event CaptainDeposited(address indexed captain, uint8 indexed team, uint256 amount);

    /// @notice The second captain deposited and opened buy-in.
    /// @param gameStart Unix timestamp in seconds when buy-in opened.
    /// @param deadline Initial Unix buy-in deadline in seconds.
    event GameStarted(uint64 gameStart, uint64 deadline);

    /// @notice A Trigger Service request was scheduled or rescheduled.
    /// @param requestId Trigger Service request ID.
    /// @param executeAfter Earliest execution Unix timestamp in seconds.
    event AutoLaunchScheduled(uint256 indexed requestId, uint64 executeAfter);

    /// @notice An overtime reschedule stopped because the trigger budget could not pay the fee or the request reverted.
    /// @param requestId Trigger Service request ID whose callback could not reschedule.
    event AutoLaunchStopped(uint256 indexed requestId);

    /// @notice The automatic launch funder withdrew the unused budget.
    /// @param funder Wallet receiving the withdrawal.
    /// @param amount Unused budget paid in BNB wei.
    event TriggerBudgetWithdrawn(address indexed funder, uint256 amount);

    /// @notice The accept window expired and the game was cancelled.
    /// @param captain Captain who deposited, or zero if neither captain deposited.
    /// @param refunded BNB wei returned to that captain.
    event Cancelled(address indexed captain, uint256 refunded);

    /// @notice A player added BNB and pull to a team.
    /// @param player Contributing wallet.
    /// @param team Team ID chosen by the player.
    /// @param amount Contribution in BNB wei.
    /// @param pull Pull added by this contribution, in weighted BNB wei.
    /// @param weightBps Weight applied to the contribution, in basis points.
    /// @param ropeBps Blue's share of total pull after this contribution, in basis points.
    event Contributed(
        address indexed player, uint8 indexed team, uint256 amount, uint256 pull, uint16 weightBps, uint16 ropeBps
    );

    /// @notice A change in leader extended the buy-in clock. A tie counts as Team.NONE.
    /// @param newDeadline New Unix deadline in seconds.
    /// @param extensionsUsed Total overtime extensions used after this change.
    event Overtime(uint64 newDeadline, uint8 extensionsUsed);

    /// @notice The Portal created the token, pool and vault.
    /// @param token Launched token address.
    /// @param pool Liquidity pool address.
    /// @param vault Paired vault address.
    /// @param raised BNB seeded into the pool, in wei.
    /// @param finalBlueShareBps Blue's fixed share in basis points.
    event Launched(
        address indexed token, address indexed pool, address indexed vault, uint256 raised, uint16 finalBlueShareBps
    );

    /// @notice A player claimed their token allocation.
    /// @param player Wallet receiving the tokens.
    /// @param base Base allocation paid in token wei.
    /// @param bonus Bonus allocation paid in token wei.
    event Claimed(address indexed player, uint256 base, uint256 bonus);

    /// @notice A captain claimed vested tokens.
    /// @param captain Wallet receiving vested tokens.
    /// @param amount Amount paid in token wei.
    event CaptainVested(address indexed captain, uint256 amount);

    /// @notice A player's contribution was refunded.
    /// @param player Wallet receiving the refund.
    /// @param amount Amount paid in BNB wei.
    event Refunded(address indexed player, uint256 amount);

    /// @notice A team argument was neither Team.BLUE nor Team.RED.
    error InvalidTeam();
    /// @notice A participant tried to contribute to a different team.
    error TeamLocked();
    /// @notice A player sent zero BNB wei to contribute.
    error ZeroContribution();
    /// @notice The payment would push the wallet above its contribution cap in BNB wei.
    error WalletCapExceeded();
    /// @notice The caller is not a named captain.
    error NotCaptain();
    /// @notice The captain has already deposited.
    error CaptainAlreadyIn();
    /// @notice The captain deposit was below the configured minimum in BNB wei.
    error BelowCaptainMinimum();
    /// @notice Both captains must deposit before players can contribute.
    error CaptainsNotIn();
    /// @notice The captain accept window is still open.
    error AcceptWindowOpen();
    /// @notice The captain deposit arrived at or after the accept deadline.
    error AcceptWindowClosed();
    /// @notice The game cannot be cancelled in its current state.
    error NotCancellable();
    /// @notice The game was cancelled.
    error GameCancelled();
    /// @notice The game clock has not started.
    error GameNotStarted();
    /// @notice Only the configured Trigger Service may invoke the callback.
    error OnlyTriggerService();
    /// @notice A funder has already scheduled an automatic launch.
    error AutoLaunchAlreadyScheduled();
    /// @notice The payment was below the automatic launch quote in BNB wei.
    error InsufficientTriggerFee();
    /// @notice The buy-in deadline has passed.
    error BuyInClosed();
    /// @notice The buy-in deadline has not arrived.
    error BuyInOpen();
    /// @notice The raise is below the game's configured minimum in BNB wei.
    error BelowMinRaise();
    /// @notice The game met its minimum raise and the launch grace period is still open.
    error MinRaiseMet();
    /// @notice The live Portal floor preview or quote is unavailable.
    error CreationFloorUnavailable();
    /// @notice The raise is below the Portal's live creation floor.
    error BelowCreationFloor();
    /// @notice The launch grace period ended and refunds opened.
    error LaunchGraceExpired();
    /// @notice The game has already launched a token.
    error AlreadyLaunched();
    /// @notice The game has yet to launch a token.
    error NotLaunched();
    /// @notice The caller has no tokens or unused trigger budget to claim from the requested operation.
    error NothingToClaim();
    /// @notice The wallet has no refundable contribution.
    error NothingToRefund();
    /// @notice The caller did not fund the automatic launch request.
    error NotTriggerFunder();
    /// @notice Unused trigger fees stay locked until the game launches or enters refunding.
    error TriggerBudgetLocked();
    /// @notice The requested BNB or token transfer failed.
    error TransferFailed();

    /// @notice Deposit BNB wei as one of the two captains. The second deposit starts buy-in.
    /// @dev Reverts for a non-captain, repeat deposit, closed or cancelled game, or an amount outside the wallet limits.
    function depositCaptain() external payable;

    /// @notice Cancel at or after the accept deadline if fewer than two captains deposited and return any deposit.
    /// @dev The phase stays AWAITING_CAPTAINS until this call succeeds. CANCELLED and GameCancelled apply after
    ///      cancellation. Reverts while acceptance is open, when the game cannot cancel, or if the refund fails.
    function cancel() external;

    /// @notice Add BNB wei and weighted pull to a team before the buy-in deadline.
    /// @dev Reverts for invalid team, team switch, zero value, cap excess, or when buy-in is unavailable.
    /// @param team Team.BLUE or Team.RED.
    function contribute(uint8 team) external payable;

    /// @notice Launch through the Portal during the launch grace period using the BNB raised as seed.
    /// @dev Reverts with GameNotStarted, BuyInOpen, GameCancelled, BelowMinRaise, CreationFloorUnavailable,
    ///      BelowCreationFloor, LaunchGraceExpired or AlreadyLaunched when applicable.
    ///      Portal launch errors may also propagate.
    function launch() external;

    /// @notice Recover the caller's BNB contribution when the game enters refunding.
    /// @dev Refunds open at the deadline below minRaise, or at deadline plus launchGrace for any unlaunched game.
    ///      Reverts before refunds open, for a launched or cancelled game, or if the BNB transfer fails or is empty.
    function refund() external;

    /// @notice Claim the caller's base and bonus allocation in token wei.
    /// @dev Reverts before launch, if nothing is claimable, or if the token transfer fails.
    function claim() external;

    /// @notice Release the caller's vested captain allocation in token wei.
    /// @dev Reverts for non-captains, before launch, if nothing is vested and unclaimed, or if the transfer fails.
    function claimCaptain() external;

    /// @notice Fund the first Trigger Service request and the overtime budget in BNB wei.
    /// @dev Reverts before the game starts, after the deadline, on a repeat schedule or terminal game,
    ///      or if the payment is below the live quote. Trigger Service errors may also propagate.
    function scheduleAutoLaunch() external payable;

    /// @notice Return the unused automatic launch budget in BNB wei to its funder.
    /// @dev Reverts for a different caller, before launch or refunding, for a zero balance, or on transfer failure.
    ///      Emits TriggerBudgetWithdrawn on success.
    function withdrawTriggerBudget() external;

    /// @notice Process the current request, reschedule for overtime, or launch if eligible.
    /// @dev State checks return without reverting. Caller checks revert with OnlyTriggerService for any other caller.
    ///      Stale requests, refunding, and an unavailable or unmet floor are no-ops, as are callbacks after launch
    ///      or at or after the grace cutoff. For an overtime reschedule, if triggerBudget is below getFee() or
    ///      requestTrigger reverts, emit AutoLaunchStopped and return with the request ID and budget unchanged.
    ///      Manual launch remains available when eligible.
    /// @param requestId Trigger Service request ID.
    function trigger(uint256 requestId) external override;

    /// @notice Read the game's identity, rules configuration, clocks, totals and launch state.
    /// @return game Current game snapshot.
    function getGame() external view returns (GameView memory game);

    /// @notice Read a player's BNB contribution, pull and token entitlements.
    /// @param player Wallet to inspect.
    /// @return playerView Current player snapshot.
    function getPlayer(address player) external view returns (PlayerView memory playerView);

    /// @notice Read a named captain's deposit status and vested token allocation.
    /// @param captain Wallet to inspect.
    /// @return captainView Current captain allocation snapshot.
    function getCaptain(address captain) external view returns (CaptainAllocView memory captainView);

    /// @notice Read the game, issuance and tax rules.
    /// @return rules Current game's rules, with durations in seconds and rates in basis points.
    function getRules() external view returns (RulesView memory rules);

    /// @notice Check whether a wallet can make a captain deposit of the proposed size.
    /// @param captain Prospective depositor.
    /// @param amount Proposed deposit in BNB wei.
    /// @return ok Whether the deposit can proceed.
    /// @return reason Deposit error selector, or bytes4(0) on success.
    function canDepositCaptain(address captain, uint256 amount) external view returns (bool ok, bytes4 reason);

    /// @notice Check whether the game can be cancelled.
    /// @dev With fewer than two deposits at or after the accept deadline, returns (true, bytes4(0)) while phase
    ///      remains AWAITING_CAPTAINS. CANCELLED and GameCancelled apply after cancel succeeds.
    /// @return ok Whether the accept window expired with fewer than two deposits.
    /// @return reason Cancellation error selector, or bytes4(0) on success.
    function canCancel() external view returns (bool ok, bytes4 reason);

    /// @notice Check game eligibility to schedule the first automatic launch.
    /// @return ok Whether the game state permits scheduling.
    /// @return reason State error selector, or bytes4(0) on success. Use autoLaunchQuote for the payment.
    function canScheduleAutoLaunch() external view returns (bool ok, bytes4 reason);

    /// @notice Check whether a wallet can contribute the proposed amount to a team.
    /// @param player Prospective contributor.
    /// @param team Proposed Team ID.
    /// @param amount Proposed payment in BNB wei.
    /// @return ok Whether contribution can proceed.
    /// @return reason Contribution error selector, or bytes4(0) on success.
    function canContribute(address player, uint8 team, uint256 amount) external view returns (bool ok, bytes4 reason);

    /// @notice Check game eligibility and the Portal's live creation floor before attempting a launch.
    /// @return ok Whether the game currently clears its own and the Portal floor checks.
    /// @return reason Launch error selector, including CreationFloorUnavailable, BelowCreationFloor
    ///         or LaunchGraceExpired when applicable, or bytes4(0) on success.
    function canLaunch() external view returns (bool ok, bytes4 reason);

    /// @notice Check whether a wallet has a payable refund.
    /// @param player Wallet to inspect.
    /// @return ok Whether refunding is open and the contribution is unclaimed.
    /// @return reason Refund error selector, or bytes4(0) on success.
    function canRefund(address player) external view returns (bool ok, bytes4 reason);

    /// @notice Check whether a wallet has unclaimed base or bonus tokens.
    /// @param player Wallet to inspect.
    /// @return ok Whether the player can claim.
    /// @return reason Claim error selector, or bytes4(0) on success.
    function canClaim(address player) external view returns (bool ok, bytes4 reason);

    /// @notice Check whether a captain has vested tokens to claim.
    /// @param captain Wallet to inspect.
    /// @return ok Whether a vested allocation can be claimed.
    /// @return reason Captain claim error selector, or bytes4(0) on success.
    function canClaimCaptain(address captain) external view returns (bool ok, bytes4 reason);

    /// @notice Preview the pull, rope and overtime effect of a contribution at the current time.
    /// @dev Reverts with InvalidTeam for an invalid Team ID. Use canContribute for wallet eligibility.
    /// @param team Team.BLUE or Team.RED.
    /// @param amount Proposed contribution in BNB wei.
    /// @return pull Weighted contribution in BNB wei.
    /// @return newRopeBps Blue's projected share of total pull in basis points.
    /// @return wouldTriggerOvertime Whether a contribution during buy-in changes the leader, counting a tie as
    ///         Team.NONE, with deadline minus block.timestamp at most overtimeWindow and extensionsUsed below
    ///         maxExtensions.
    function previewContribute(uint8 team, uint256 amount)
        external
        view
        returns (uint256 pull, uint16 newRopeBps, bool wouldTriggerOvertime);

    /// @notice Read the live Trigger Service fee for the first request and the five possible overtime requests.
    /// @dev Reverts if the Trigger Service fee read fails.
    /// @return amount Recommended scheduling payment in BNB wei.
    function autoLaunchQuote() external view returns (uint256 amount);

    /// @notice Read the current Phase value.
    function phase() external view returns (uint8);
    /// @notice Read a wallet's Team ID, or Team.NONE if it has no team.
    /// @param player Wallet to inspect.
    function teamOf(address player) external view returns (uint8);
    /// @notice Read a wallet's contribution in BNB wei.
    /// @param player Wallet to inspect.
    function contribution(address player) external view returns (uint256);
    /// @notice Read a wallet's weighted pull in BNB wei.
    /// @param player Wallet to inspect.
    function pullOf(address player) external view returns (uint256);
    /// @notice Read Blue's current share of total pull in basis points.
    function ropeBps() external view returns (uint16);
    /// @notice Read Blue's final share in basis points, fixed at launch.
    function finalBlueShareBps() external view returns (uint16);
    /// @notice Read the Blue captain address.
    function captainBlue() external view returns (address);
    /// @notice Read the Red captain address.
    function captainRed() external view returns (address);
    /// @notice Check whether a team's captain has deposited. Reverts with InvalidTeam for any other ID.
    /// @param team Team.BLUE or Team.RED.
    function captainIn(uint8 team) external view returns (bool);
    /// @notice Read the Unix game start time in seconds, or zero before the second captain deposit.
    function gameStart() external view returns (uint64);
    /// @notice Read the total BNB raised in wei.
    function raised() external view returns (uint256);
    /// @notice Read the game's configured minimum raise in BNB wei.
    function minRaise() external view returns (uint256);
    /// @notice Read the current Unix buy-in deadline in seconds, including overtime.
    function deadline() external view returns (uint64);
    /// @notice Check whether the token has launched.
    function launched() external view returns (bool);
    /// @notice Check whether the Portal launch call is in progress.
    function launching() external view returns (bool);
    /// @notice Read the launched token address, or zero before launch.
    function token() external view returns (address);
    /// @notice Read the liquidity pool address, or zero before launch.
    function pool() external view returns (address);
    /// @notice Read the paired vault address, or zero before launch.
    function vault() external view returns (address);
    /// @notice Read the game creator address.
    function creator() external view returns (address);
    /// @notice Read the launcher factory address.
    function factory() external view returns (address);
    /// @notice Read the configured Trigger Service address.
    function triggerService() external view returns (address);
    /// @notice Read the current request ID. Use getGame().triggerFunder to check whether a request was scheduled.
    function autoLaunchRequestId() external view returns (uint256);
    /// @notice Read the unused Trigger Service budget in BNB wei.
    function triggerBudget() external view returns (uint256);
}
