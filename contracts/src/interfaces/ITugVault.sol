// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CaptainView, StakerView, VaultView} from "./TugTypes.sol";

/// @notice Frontend interface for post-launch staking and BNB tax revenue claims.
interface ITugVault {
    /// @notice The vault accounted for new revenue and distributable carry.
    /// @param revenue Newly received revenue in BNB wei.
    /// @param toCaptains Amount allocated to both captains in BNB wei.
    /// @param toBlue Amount allocated to Blue stakers in BNB wei after redirection.
    /// @param toRed Amount allocated to Red stakers in BNB wei after redirection.
    /// @param carried Revenue that remains undistributed in BNB wei.
    event Synced(uint256 revenue, uint256 toCaptains, uint256 toBlue, uint256 toRed, uint256 carried);

    /// @notice A wallet added stake.
    /// @param staker Wallet credited with the stake.
    /// @param team Staker's Team ID.
    /// @param amount Tokens actually credited after transfer, in token wei.
    event Staked(address indexed staker, uint8 indexed team, uint256 amount);

    /// @notice A wallet removed stake.
    /// @param staker Wallet from whose stake the amount was deducted.
    /// @param team Staker's Team ID.
    /// @param amount Amount deducted in token wei.
    event Unstaked(address indexed staker, uint8 indexed team, uint256 amount);

    /// @notice A staker claimed BNB tax rewards.
    /// @param staker Wallet receiving the rewards.
    /// @param team Staker's Team ID.
    /// @param amount Rewards paid in BNB wei.
    event RewardsClaimed(address indexed staker, uint8 indexed team, uint256 amount);

    /// @notice A captain claimed their BNB tax share.
    /// @param captain Wallet receiving the captain share.
    /// @param team Captain's Team ID.
    /// @param amount Amount paid in BNB wei.
    event CaptainClaimed(address indexed captain, uint8 indexed team, uint256 amount);

    /// @notice The team argument was neither Team.BLUE nor Team.RED.
    error InvalidTeam();
    /// @notice The token amount was zero.
    error ZeroAmount();
    /// @notice The requested team differs from the wallet's locked launcher or vault team.
    error WrongTeam();
    /// @notice The requested amount exceeds the wallet's credited stake in token wei.
    error InsufficientStake();
    /// @notice There is no BNB to pay for the requested claim.
    error NothingToClaim();
    /// @notice The caller is not one of the launcher's captains.
    error NotCaptain();
    /// @notice A BNB or token transfer failed.
    error TransferFailed();

    /// @notice Stake tokens on a team. The vault credits the amount it actually receives.
    /// @dev Reverts for zero amount, an invalid or wrong team, or a failed transfer.
    /// @param amount Amount to transfer in token wei. Approve the vault before calling.
    /// @param team Team.BLUE or Team.RED. The wallet keeps its locked team after unstaking.
    function stake(uint256 amount, uint8 team) external;

    /// @notice Remove tokens from the caller's stake after settling existing rewards.
    /// @dev Reverts for zero amount, insufficient stake, or a failed transfer.
    /// @param amount Amount to deduct in token wei.
    function unstake(uint256 amount) external;

    /// @notice Pay the caller's staker rewards in BNB wei after syncing revenue.
    /// @dev Reverts if no rewards are claimable or the BNB transfer fails.
    function claimRewards() external;

    /// @notice Pay the caller's captain share of trading tax in BNB wei.
    /// @dev Reverts for non-captains, when no captain revenue is claimable, or on transfer failure.
    function claimCaptain() external;

    /// @notice Account for newly received BNB and distribute any eligible carry to the staker pools.
    function sync() external;

    /// @notice Read both teams' stake, reward previews, captain ledgers and undistributed revenue.
    /// @return vaultView Current vault snapshot.
    function getVault() external view returns (VaultView memory vaultView);

    /// @notice Read a wallet's team, stake, projected pending rewards and token allowance.
    /// @param staker Wallet to inspect.
    /// @return stakerView Current staker snapshot.
    function getStaker(address staker) external view returns (StakerView memory stakerView);

    /// @notice Read a captain's BNB revenue ledger and amount claimable after a sync.
    /// @param captain Wallet to inspect.
    /// @return captainView Current vault captain snapshot.
    function getCaptain(address captain) external view returns (CaptainView memory captainView);

    /// @notice Read a wallet's credited stake in token wei.
    /// @param staker Wallet to inspect.
    function stakeOf(address staker) external view returns (uint256);
    /// @notice Read the wallet's recorded vault Team ID, or Team.NONE before its first stake.
    /// @param staker Wallet to inspect.
    function stakerTeam(address staker) external view returns (uint8);
    /// @notice Read a team's total in token wei. Reverts with InvalidTeam for any other ID.
    /// @param team Team.BLUE or Team.RED.
    function teamStake(uint8 team) external view returns (uint256);
    /// @notice Read BNB wei claimable by the staker using the same revenue snapshot as claimRewards.
    /// @param staker Wallet to inspect.
    function pendingRewards(address staker) external view returns (uint256);
    /// @notice Read BNB wei claimable by a captain using the same revenue snapshot as claimCaptain.
    /// @param captain Wallet to inspect.
    function pendingCaptain(address captain) external view returns (uint256);
    /// @notice Read the paired launcher address.
    function launcher() external view returns (address);
    /// @notice Read the staked tax token address.
    function taxToken() external view returns (address);
}
