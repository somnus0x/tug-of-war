# Tug of War frontend API

Use the exported [launcher](../abi/ITugLauncher.json), [factory](../abi/ITugLauncherFactory.json), [vault](../abi/ITugVault.json), and [Portal](../abi/IPortal.json) ABIs on BSC testnet (chain ID 97). The Portal ABI comes from the part of Flap's interface copied into this repo and covers `SALT_LOCK_FEE`, `newLauncher`, and `getLauncher`. From the repository root, regenerate them with `./contracts/script/export-abi.sh`.

BNB and token amounts use their respective wei units. Pull uses weighted BNB wei. Timestamps are Unix seconds and durations are in seconds. Rates and shares are in basis points, where 10,000 is 100%. Team IDs are `0` for no team, `1` for Blue, and `2` for Red. Team tuples expose named `blue` and `red` fields. Explicit team arguments accept Blue and Red only and use `InvalidTeam()` for any other ID.

| Phase | Value |
|---|---:|
| `AWAITING_CAPTAINS` | 0 |
| `BUY_IN` | 1 |
| `AWAITING_LAUNCH` | 2 |
| `REFUNDING` | 3 |
| `LAUNCHED` | 4 |
| `CANCELLED` | 5 |

Action gates return `(bool ok, bytes4 reason)`. A successful gate returns `(true, 0x00000000)`. For a failed gate, decode its selector using the ABI for that contract. Use current state to prepare and simulate any write before sending it.

## Create game

| Call | Arguments and return fields | What the UI handles |
|---|---|---|
| Factory `limits()` | Returns `duration`, `acceptWindow`, `captainVestDuration`, `maxBonusShareBps`, `captainAllocBps`, and `captainShareBps`, each with inclusive `min` and `max`. Also returns `minRaiseFloor` in BNB wei and `creationFloorAvailable`. | `(creationFloorAvailable, minRaiseFloor) = (true, 0)` is a zero Portal floor. The configured `minRaise` still needs to be positive. `(false, 0)` means creation is unavailable. |
| Factory `defaultConfig()` | Returns `TugConfig`, with the canonical order below. | Fill in the creator's inputs, including both captains and the mined salt, then validate. |
| Factory `pairedVaultFactory()`, `portal()`, `tokenImplementation()` | Return the paired vault factory, Pool Launch Portal, and tax token implementation addresses, respectively. | Use the paired vault factory in the config and the implementation and Portal for salt mining. |
| Factory `predictToken(bytes32 salt)` | Returns the predicted token address. | A salt must be nonzero and predict an address ending in `7777`. |
| Factory `validateConfig(TugConfig config)` | Returns `(ok, reason)` for the proposed configuration. | Handle the factory errors below. The live creation floor can change before the transaction. |
| Factory `encodeConfig(TugConfig config)` | Returns canonical configuration bytes. | Pass these bytes as `data` to the Portal. |
| Portal `SALT_LOCK_FEE()` and `newLauncher(address launcherFactory, bytes data)` | Read the fee in BNB wei, then send exactly that fee to the Portal with the factory address and encoded data. | Read `TugLauncherCreated(launcher, creator, captainBlue, captainRed, salt)` from the factory's logs for the game address. Decode factory validation and Portal transaction errors. |
| Factory `isLauncher(address launcher)`, `gamesCount()`, `gameAt(uint256 index)`, `gamesOf(address captain)` | Return membership, count, address at a zero-based index, or the list of games for either captain, respectively. | Query indices below `gamesCount()`. The creation event indexes the launcher and both captains. |

`TugConfig` order is `name, symbol, meta, salt, duration, minRaise, walletCap, captainBlue, captainRed, vaultFactory, maxBonusShareBps, captainMinDeposit, acceptWindow, captainAllocBps, captainVestDuration, captainShareBps`. Name, symbol, and metadata CID are strings. Amounts use `uint256`, durations use `uint64`, basis points use `uint16`, and the salt uses `bytes32`.

| Factory error | Condition |
|---|---|
| `InvalidVaultFactory`, `InvalidCaptains`, `InvalidSalt` | Wrong paired vault factory, zero or matching captain addresses, or a zero or invalid vanity salt. |
| `DurationOutOfRange`, `AcceptWindowOutOfRange`, `CaptainVestDurationOutOfRange` | A time field falls outside its corresponding range. |
| `MaxBonusShareOutOfRange`, `CaptainAllocOutOfRange`, `CaptainShareOutOfRange` | A basis-point field falls outside its corresponding range. |
| `InvalidWalletCap`, `CaptainDepositExceedsWalletCap` | The wallet cap is zero or below the captain minimum deposit. |
| `ZeroMinRaise`, `MinRaiseBelowCreationFloor` | The configured raise is zero or below the available Portal floor. |
| `CreationFloorUnavailable` | The native quote is disabled, its price is zero, or a required Portal read reverted. |
| `NonCanonicalConfig` | The factory received decodable creation bytes that differ from their canonical encoding. Use `encodeConfig` for the creation call. |

## Waiting for captains

| Call | Arguments and return fields | What the UI handles |
|---|---|---|
| Launcher `getGame()` | Read `phase`, `config.captainBlue`, `config.captainRed`, `captainDeposited.blue`, `captainDeposited.red`, and `acceptDeadline`. | The accept clock starts at game creation. Either captain can deposit first. Refresh `getGame()` on `CaptainDeposited`. The second deposit emits `GameStarted` and starts the buy-in clock. |
| Launcher `canDepositCaptain(address captain, uint256 amount)` and payable `depositCaptain()` | Pass the wallet and proposed BNB wei to the gate, then send the same amount as value. | `NotCaptain`, `CaptainAlreadyIn`, `BelowCaptainMinimum`, `WalletCapExceeded`, `AcceptWindowClosed`, `GameCancelled`. Both deposits earn the full starting weight. |
| Launcher `canCancel()` and `cancel()` | No arguments. At `block.timestamp >= acceptDeadline` with fewer than two deposits, the gate returns `(true, 0x00000000)` and the phase stays `AWAITING_CAPTAINS` until `cancel()` succeeds. | Show the cancel action when the gate succeeds. A sole captain's deposit is returned. `CANCELLED` and `GameCancelled` apply after successful cancellation. Also handle `AcceptWindowOpen`, `NotCancellable`, and `TransferFailed`. |
| Launcher `canScheduleAutoLaunch()`, `autoLaunchQuote()`, and payable `scheduleAutoLaunch()` | The gate checks game state. The quote is the live fee in BNB wei for one request plus up to five overtime requests. Send the quote as value. | Schedule once after `GameStarted` while the deadline is current or in the future. Handle `GameNotStarted`, `GameCancelled`, `BuyInClosed`, `AlreadyLaunched`, `AutoLaunchAlreadyScheduled`, `InsufficientTriggerFee`, and Trigger Service errors. Use `getGame().triggerFunder` to identify the funder. Refresh `getGame()` on `AutoLaunchScheduled` for the current request ID and budget. Request ID zero can be valid. |

## Game page

| Call | Arguments and return fields | What the UI handles |
|---|---|---|
| Launcher `getGame()` | Returns `launcher`, `creator`, `factory`, `config`, `phase`, `captainDeposited`, `acceptDeadline`, `gameStart`, `originalDeadline`, `deadline`, `extensionsUsed`, `currentWeightBps`, `raised`, `raisedByTeam`, `pullByTeam`, `playersByTeam`, `ropeBps`, `autoLaunchRequestId`, `triggerBudget`, `triggerFunder`, `token`, `pool`, `vault`, and `finalBlueShareBps`. | Display the overtime-adjusted `deadline`. Buy-in closes at that timestamp, and contributions require `block.timestamp < deadline`. `ropeBps` is Blue's current share. It rounds down, so a narrow Blue lead can show 5000. Take the leader from `pullByTeam`, which is the comparison overtime uses. The final share and launch addresses are available after launch. |
| Launcher `getPlayer(address player)` | Returns `team`, `contribution`, `pull`, `baseEntitlement`, `bonusEntitlement`, `claimed`, `claimable`, `refundable`, and `remainingCap`. | Contributions, cap headroom and refunds use BNB wei. Allocations and claims use token wei. |
| Launcher `getRules()` | Returns buy and sell tax, vault and deflation fee slots, captain revenue share, pool, base, bonus and captain allocation shares, the maximum team bonus share, captain vest duration, tax and anti-farmer durations, starting weight, overtime window and extension, maximum extensions, and `launchGrace`. | The tax and anti-farmer durations are 30 days and 1 day. The start weight is 20,000 bps. During buy-in, extend only when the contribution changes the leader, counting a tie as `Team.NONE`, `deadline - block.timestamp <= overtimeWindow`, and `extensionsUsed < maxExtensions`. Each qualifying change adds 30 seconds within the 60-second window, up to five extensions in total. |
| Launcher `previewContribute(uint8 team, uint256 amount)` | Returns weighted `pull`, projected Blue share `newRopeBps` rounded down in basis points, and `wouldTriggerOvertime`. Amount is BNB wei. | Use `wouldTriggerOvertime` to preview an extension. To preview a leader change, compare the exact team pulls in `getGame().pullByTeam` before and after adding the previewed `pull` to the contributing team. The preview is computed at the current block, so a close leader-change or overtime prediction is an estimate. Handle `InvalidTeam` and use the contribution gate for wallet eligibility. |
| Launcher `canContribute(address player, uint8 team, uint256 amount)` and payable `contribute(uint8 team)` | Gate takes wallet, Team ID, and BNB wei. Send that amount as value to the write. | `InvalidTeam`, `TeamLocked`, `ZeroContribution`, `WalletCapExceeded`, `CaptainsNotIn`, `BuyInClosed`, `GameCancelled`, `AlreadyLaunched`. Use `Contributed` and `Overtime` for the activity feed. |

## After the clock

Read the final deadline from `getGame()` and the 24-hour grace period from `getRules().launchGrace` in seconds. At `block.timestamp >= deadline`, an unlaunched game below its configured minimum enters `REFUNDING`. A game that met the minimum can launch from that timestamp during the grace period when the live Portal floor also clears. At `block.timestamp >= deadline + launchGrace`, any unlaunched game enters `REFUNDING` and the manual and automatic launch paths close. Refunds depend on local game state and time.

After the deadline, show the launch button whenever `canLaunch()` returns `(true, 0x00000000)`, whether or not automatic launch is scheduled. Manual launch and the trigger share one launch path. The first eligible call launches, a later manual call reverts with `AlreadyLaunched`, and a later trigger does nothing. Use `AutoLaunchStopped(uint256 requestId)` only as an activity-feed hint.

| Call | Arguments and return fields | What the UI handles |
|---|---|---|
| Launcher `canLaunch()` and `launch()` | No arguments. The gate checks the minimum raise and live creation floor. | `GameNotStarted`, `BuyInOpen`, `BelowMinRaise`, `BelowCreationFloor`, `CreationFloorUnavailable`, `LaunchGraceExpired`, `AlreadyLaunched`, `GameCancelled`. While the floor is unavailable or unmet, recheck during grace. At the cutoff, show refunds. The Trigger Service calls `trigger(uint256 requestId)` automatically and skips launch in those floor or cutoff states. |
| Launcher `canRefund(address player)` and `refund()` | Gate takes the wallet. The write refunds the caller's `getPlayer(player).refundable` amount in BNB wei. | `GameNotStarted`, `BuyInOpen`, `MinRaiseMet` (during grace), `NothingToRefund`, `AlreadyLaunched`, `GameCancelled`, `TransferFailed`. Refresh `getPlayer(player)` on that wallet's `Refunded` event. |
| Launcher `withdrawTriggerBudget()` | No arguments. Sends the remaining `getGame().triggerBudget` in BNB wei to the funder once launched or refunding. | `NotTriggerFunder`, `TriggerBudgetLocked`, `NothingToClaim`, `TransferFailed`. Use `TriggerBudgetWithdrawn(funder, amount)` to refresh the budget. |

## Claim and stake

Use the token and vault addresses from `getGame()` or `Launched`. The launcher's captain claim pays vested **tokens**. The vault's captain claim pays **BNB tax revenue**.

| Call | Arguments and return fields | What the UI handles |
|---|---|---|
| Launcher `getPlayer(address player)`, `canClaim(address player)`, and `claim()` | Use `baseEntitlement`, `bonusEntitlement`, `claimed`, and `claimable` from the player view and the claim gate. | `NotLaunched`, `NothingToClaim`, `TransferFailed`. |
| Launcher `getCaptain(address captain)`, `canClaimCaptain(address captain)`, and `claimCaptain()` | Read `team`, boolean `deposited`, `allocation`, `vested`, `claimed`, `claimable`, and `vestEnd` before claiming vested tokens. | `NotCaptain`, `NotLaunched`, `NothingToClaim`, `TransferFailed`. Refresh this view on the captain's `CaptainVested` event. |
| Vault `getVault()` | Read named team pairs `teamStaked`, `rewardPer1000NewTokensPerBnb`, `captainAccrued`, and `captainClaimed`, plus `undistributed` in BNB wei. | The rate is BNB wei for 1,000 newly credited tokens per 1 BNB of new vault revenue. Blue and Red are independent hypothetical joins. If the other team would still be empty, its portion redirects to the joining team. Prior carry is excluded from the rate. |
| Vault `getStaker(address staker)` | Returns `team`, `staked`, `pendingRewards`, `tokenBalance`, and `allowance`. Pending BNB includes eligible carry from the same snapshot that a claim would settle. | `team` is the effective locked team. It uses the recorded vault team when set and falls back to `launcher.teamOf(staker)`. Show a team picker on first stake only for `Team.NONE`. |
| Token `approve(address spender, uint256 amount)` and vault `stake(uint256 amount, uint8 team)` | Approve the vault when necessary, then send the requested token wei and Team ID to the vault. | `ZeroAmount`, `InvalidTeam`, `WrongTeam`, `TransferFailed`. `Staked.amount` is the token wei actually credited. |
| Vault `unstake(uint256 amount)` | Amount to deduct from the caller's stake in token wei. | `ZeroAmount`, `InsufficientStake`, `TransferFailed`. Refresh `getVault()` and the affected `getStaker(address staker)` view on `Unstaked`. |
| Vault `claimRewards()` | No arguments. Pays the caller's pending BNB rewards. | `NothingToClaim`, `TransferFailed`. Refresh `getStaker(address staker)` on that wallet's `RewardsClaimed` event. |
| Vault `getCaptain(address captain)` and `claimCaptain()` | Read `team`, `accrued`, `claimed`, and `claimable` from the vault view, then claim as the captain. Claimable uses the next sync's snapshot. | `NotCaptain`, `NothingToClaim`, `TransferFailed`. Refresh `getVault()` and the affected captain view on `CaptainClaimed`. |
| Vault `sync()` | No arguments. Accounts for incoming BNB and eligible carry. | Optional manual refresh. Claims sync before settling, and the `Synced` event reports allocation and carry in BNB wei. |
