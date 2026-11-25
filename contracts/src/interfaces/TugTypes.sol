// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Team IDs used by the launcher and vault.
library Team {
    uint8 internal constant NONE = 0;
    uint8 internal constant BLUE = 1;
    uint8 internal constant RED = 2;
}

/// @notice Launcher phases returned by the game view and phase getter.
library Phase {
    uint8 internal constant AWAITING_CAPTAINS = 0;
    uint8 internal constant BUY_IN = 1;
    uint8 internal constant AWAITING_LAUNCH = 2;
    uint8 internal constant REFUNDING = 3;
    uint8 internal constant LAUNCHED = 4;
    uint8 internal constant CANCELLED = 5;
}

/// @notice Two per-team values in the unit documented by the containing field.
/// @param blue Value for Team.BLUE.
/// @param red Value for Team.RED.
struct TeamPair {
    uint256 blue;
    uint256 red;
}

/// @notice Two per-team flags.
/// @param blue Flag for Team.BLUE.
/// @param red Flag for Team.RED.
struct TeamFlags {
    bool blue;
    bool red;
}

/// @notice Inclusive duration range.
/// @param min Lower bound in seconds.
/// @param max Upper bound in seconds.
struct DurationRange {
    uint64 min;
    uint64 max;
}

/// @notice Inclusive basis-point range.
/// @param min Lower bound in basis points.
/// @param max Upper bound in basis points.
struct BpsRange {
    uint16 min;
    uint16 max;
}

/// @notice Canonical configuration tuple encoded for Portal.newLauncher.
/// @param name Token name.
/// @param symbol Token symbol.
/// @param meta IPFS CID of the token metadata.
/// @param salt Nonzero CREATE2 salt whose predicted token address ends in 7777.
/// @param duration Initial buy-in period in seconds.
/// @param minRaise Minimum game raise in BNB wei. Must be positive.
/// @param walletCap Maximum contribution per wallet in BNB wei, including captain deposits.
/// @param captainBlue Address of the Blue captain.
/// @param captainRed Address of the Red captain.
/// @param vaultFactory Address of the paired vault factory.
/// @param maxBonusShareBps Maximum bonus share for either team, in basis points.
/// @param captainMinDeposit Minimum deposit from each captain in BNB wei.
/// @param acceptWindow Time from game creation for both captains to deposit, in seconds.
/// @param captainAllocBps Captain token allocation as basis points of total supply.
/// @param captainVestDuration Captain vesting period from launch, in seconds.
/// @param captainShareBps Captains' share of vault revenue in basis points.
struct TugConfig {
    string name;
    string symbol;
    string meta;
    bytes32 salt;
    uint64 duration;
    uint256 minRaise;
    uint256 walletCap;
    address captainBlue;
    address captainRed;
    address vaultFactory;
    uint16 maxBonusShareBps;
    uint256 captainMinDeposit;
    uint64 acceptWindow;
    uint16 captainAllocBps;
    uint64 captainVestDuration;
    uint16 captainShareBps;
}

/// @notice Data for the waiting, buy-in, and post-game screens.
/// @param launcher Address of this game's launcher.
/// @param creator Address that created the game through the Portal.
/// @param factory Address that deployed the launcher.
/// @param config Configuration fixed at game creation.
/// @param phase Current Phase value.
/// @param captainDeposited Whether each captain has deposited.
/// @param acceptDeadline Exclusive Unix deadline for captain deposits, in seconds.
/// @param gameStart Unix timestamp of the second captain deposit, in seconds. Zero until then.
/// @param originalDeadline Unix buy-in deadline in seconds before overtime. Zero before the game starts.
/// @param deadline Current Unix buy-in deadline in seconds, including overtime. Zero before the game starts.
/// @param extensionsUsed Number of overtime extensions applied.
/// @param currentWeightBps Contribution weight at the current time, in basis points.
/// @param raised Total BNB raised, in wei.
/// @param raisedByTeam BNB raised by each team, in wei.
/// @param pullByTeam Weighted contribution per team, in BNB wei.
/// @param playersByTeam Number of players on each team.
/// @param ropeBps Blue's current share of total pull, in basis points.
/// @param autoLaunchRequestId Current Trigger Service request ID. Zero can be a valid ID.
/// @param triggerBudget Unspent Trigger Service budget in BNB wei.
/// @param triggerFunder Address eligible to withdraw the unused budget. Zero before scheduling.
/// @param token Address of the launched token, or zero before launch.
/// @param pool Address of the liquidity pool, or zero before launch.
/// @param vault Address of the paired vault, or zero before launch.
/// @param finalBlueShareBps Blue's fixed share in basis points after launch.
struct GameView {
    address launcher;
    address creator;
    address factory;
    TugConfig config;
    uint8 phase;
    TeamFlags captainDeposited;
    uint64 acceptDeadline;
    uint64 gameStart;
    uint64 originalDeadline;
    uint64 deadline;
    uint8 extensionsUsed;
    uint16 currentWeightBps;
    uint256 raised;
    TeamPair raisedByTeam;
    TeamPair pullByTeam;
    TeamPair playersByTeam;
    uint16 ropeBps;
    uint256 autoLaunchRequestId;
    uint256 triggerBudget;
    address triggerFunder;
    address token;
    address pool;
    address vault;
    uint16 finalBlueShareBps;
}

/// @notice One wallet's buy-in, refund and token entitlement.
/// @param team Locked Team ID, or Team.NONE for a wallet with no team.
/// @param contribution Contribution in BNB wei, including a captain deposit where applicable.
/// @param pull Weighted contribution in BNB wei.
/// @param baseEntitlement Base allocation in token wei.
/// @param bonusEntitlement Bonus allocation in token wei.
/// @param claimed Base and bonus amount already claimed, in token wei.
/// @param claimable Base and bonus amount currently claimable, in token wei.
/// @param refundable Amount currently refundable in BNB wei.
/// @param remainingCap Remaining contribution headroom in BNB wei.
struct PlayerView {
    uint8 team;
    uint256 contribution;
    uint256 pull;
    uint256 baseEntitlement;
    uint256 bonusEntitlement;
    uint256 claimed;
    uint256 claimable;
    uint256 refundable;
    uint256 remainingCap;
}

/// @notice One captain's vested token allocation in the launcher.
/// @param team Captain's Team ID, or Team.NONE for a non-captain.
/// @param deposited Whether the captain deposited, including an accepted zero-value deposit.
/// @param allocation Total allocation in token wei.
/// @param vested Vested portion in token wei.
/// @param claimed Portion already claimed, in token wei.
/// @param claimable Vested and unclaimed portion, in token wei.
/// @param vestEnd Unix timestamp in seconds when vesting completes, or zero before launch.
struct CaptainAllocView {
    uint8 team;
    bool deposited;
    uint256 allocation;
    uint256 vested;
    uint256 claimed;
    uint256 claimable;
    uint64 vestEnd;
}

/// @notice Launch and contribution rules shown before buy-in.
/// @param buyTaxBps Buy tax in basis points.
/// @param sellTaxBps Sell tax in basis points.
/// @param vaultFeeBps Share of fee slots assigned to the vault, in basis points.
/// @param deflationFeeBps Share of fee slots assigned to deflation, in basis points.
/// @param captainShareBps Captains' share of vault revenue in basis points.
/// @param poolAllocBps Liquidity pool allocation as basis points of total supply.
/// @param baseAllocBps Base allocation as basis points of total supply.
/// @param bonusAllocBps Bonus allocation as basis points of total supply, equal to 1500 minus captainAllocBps.
/// @param captainAllocBps Captain allocation as basis points of total supply.
/// @param maxBonusShareBps Maximum team bonus share in basis points.
/// @param captainVestDuration Captain token vesting duration in seconds.
/// @param taxDuration Trading tax duration in seconds from launch.
/// @param antiFarmerDuration Anti-farmer duration in seconds from launch.
/// @param startWeightBps Initial contribution weight in basis points.
/// @param overtimeWindow Number of seconds before the current deadline in which a lead flip can extend it.
/// @param overtimeExtension Seconds added per overtime extension.
/// @param maxExtensions Maximum number of overtime extensions.
/// @param launchGrace Number of seconds after the final deadline before an unlaunched game opens refunds.
struct RulesView {
    uint16 buyTaxBps;
    uint16 sellTaxBps;
    uint16 vaultFeeBps;
    uint16 deflationFeeBps;
    uint16 captainShareBps;
    uint16 poolAllocBps;
    uint16 baseAllocBps;
    uint16 bonusAllocBps;
    uint16 captainAllocBps;
    uint16 maxBonusShareBps;
    uint64 captainVestDuration;
    uint32 taxDuration;
    uint32 antiFarmerDuration;
    uint16 startWeightBps;
    uint64 overtimeWindow;
    uint64 overtimeExtension;
    uint8 maxExtensions;
    uint64 launchGrace;
}

/// @notice Configuration limits and live creation floor for the factory's fixed pool and paired vault.
/// @param duration Allowed initial buy-in duration in seconds.
/// @param acceptWindow Allowed captain accept window in seconds.
/// @param captainVestDuration Allowed captain vesting duration in seconds.
/// @param maxBonusShareBps Allowed maximum team bonus share in basis points.
/// @param captainAllocBps Allowed captain allocation in basis points of total supply.
/// @param captainShareBps Allowed captain share of vault revenue in basis points.
/// @param minRaiseFloor Portal creation floor in BNB wei, rounded up. Read with creationFloorAvailable.
/// @param creationFloorAvailable Whether the Portal floor could be read. True with zero is a valid zero floor.
struct Limits {
    DurationRange duration;
    DurationRange acceptWindow;
    DurationRange captainVestDuration;
    BpsRange maxBonusShareBps;
    BpsRange captainAllocBps;
    BpsRange captainShareBps;
    uint256 minRaiseFloor;
    bool creationFloorAvailable;
}

/// @notice Vault data for both teams.
/// @param teamStaked Current team totals in token wei.
/// @param rewardPer1000NewTokensPerBnb BNB wei earned by 1,000 newly credited tokens for 1 BNB of new
///        vault revenue. Evaluate each team as an independent join. Deduct the captain share, split the
///        staker portion by the final rope, and redirect the other team's portion if it would still be
///        empty. Multiply the resulting team portion by 1,000e18 and divide by the team's current stake
///        plus 1,000e18, rounding down. This rate excludes previously carried revenue.
/// @param captainAccrued Total captain accrual by team in BNB wei, including the next sync.
/// @param captainClaimed Previously claimed captain revenue by team in BNB wei.
/// @param undistributed Staker revenue in BNB wei that would stay carried after the next sync.
struct VaultView {
    TeamPair teamStaked;
    TeamPair rewardPer1000NewTokensPerBnb;
    TeamPair captainAccrued;
    TeamPair captainClaimed;
    uint256 undistributed;
}

/// @notice Stake, rewards and approval for one wallet.
/// @param team Locked Team ID, or Team.NONE if the wallet has no team.
/// @param staked Amount credited to the wallet in token wei.
/// @param pendingRewards BNB wei claimable after the same sync used by claimRewards, including eligible carry.
/// @param tokenBalance Wallet's liquid token balance in token wei.
/// @param allowance Token allowance from the wallet to the vault, in token wei.
struct StakerView {
    uint8 team;
    uint256 staked;
    uint256 pendingRewards;
    uint256 tokenBalance;
    uint256 allowance;
}

/// @notice One captain's vault revenue in BNB wei.
/// @param team Captain's Team ID, or Team.NONE for a non-captain.
/// @param accrued Total BNB wei accrued, including what the next sync would credit.
/// @param claimed BNB wei already paid to the captain.
/// @param claimable BNB wei payable after the same sync used by the captain's claim.
struct CaptainView {
    uint8 team;
    uint256 accrued;
    uint256 claimed;
    uint256 claimable;
}
