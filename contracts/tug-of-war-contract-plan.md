# Tug of War Launch — contract plan

Flap Pool Launch version, BSC testnet (chain 97). Codex implements, Claude reviews, Nat runs tests, deploys and decides open questions.

Spec source: "Tug of War Launch: dev handover" doc (synced with rev 30 and its comments, 25 Nov 2026). Base code: `flap-sh/FlapPoolLaunchVaultExample` (`src/flap/` copied unchanged, `CrowdLauncher` / `CrowdVault` / `StakeMineVault` as references).

Deadline: build window ends the morning of Friday 27 November. The Flap version must be launching on testnet by Thursday afternoon. This plan covers the Flap contracts only, in the order of the doc's timeline.

Flap track hard requirements (from Flap's track text):
1. Launch through our own Launcher Factory. A vault on its own is not a submission.
2. Run the full flow on BSC testnet: create a Launcher and launch a token end to end, with the vault working as designed.
3. Bring our own UI, starting from Flap's templates.

What to show: the testnet launch, the code, and a short explanation of what makes the idea interesting. Judge: David, Flap DevRel Engineer. 1st place (5,000u) also gets a free Flap audit and help going live on mainnet.

---

## Conventions

- Solidity `^0.8.24`, Foundry.
- Teams: `0 = NONE`, `1 = BLUE`, `2 = RED` (`uint8`).
- Phases: `0 = AWAITING_CAPTAINS`, `1 = BUY_IN`, `2 = AWAITING_LAUNCH`, `3 = REFUNDING`, `4 = LAUNCHED`, `5 = CANCELLED` (`uint8`).
- Shares in basis points (`10000 = 100%`). BNB and token amounts in wei.
- Widen basis-point operands to `uint256` before multiplication in PRs 2–4. For example, use `uint256(captainShareBps) * finalBlueShareBps`.
- Custom errors only, so the frontend can decode reverts.
- State changes before external calls; `nonReentrant` on every function that sends BNB or tokens.
- Each PR ships with its own tests. No PR is "tests later".

## Repo layout

The Foundry project lives in `contracts/`. The frontend and the OpenFour port live outside it.

```
src/
  flap/                           Flap base contracts, unchanged
  interfaces/IPortalFloor.sol
  interfaces/TugTypes.sol
  interfaces/ITugLauncher.sol
  interfaces/ITugLauncherFactory.sol
  interfaces/ITugVault.sol
  libraries/TugMath.sol
  launcher/TugLauncher.sol
  launcher/TugLauncherFactory.sol
  vault/TugVault.sol
  vault/TugVaultFactory.sol
abi/                              exported ABIs for the frontend
test/unit/                        TugMath, interface compile test
test/fork/                        TugBase.sol, TugLauncher.fork.t.sol, Tug.fork.t.sol
script/                           Deploy, MineSalt, CreateGame, DemoGame
docs/frontend-api.md              calls per screen, for the frontend
```

## How the contracts call each other

1. Creator calls `Portal.newLauncher(TugLauncherFactory, abi.encode(TugConfig))` with `msg.value = Portal.SALT_LOCK_FEE()`.
2. Portal calls `TugLauncherFactory.newLauncher` → deploys `TugLauncher` beacon proxy → `initialize` (launcher locks its own salt).
3. Either named captain calls `TugLauncher.depositCaptain()` first (the challenge). The other calls it second (the accept), which starts the clock. Both deposits must land within the accept window, counted from game creation. If they do not, anyone calls `cancel()` and a captain who deposited gets it back.
4. Optional, and not used on testnet (decision 18): anyone calls `scheduleAutoLaunch()` with the Trigger Service fee, so Flap's Trigger Service calls the launcher back at the deadline.
5. Players call `TugLauncher.contribute(team)` until the deadline.
6. The Trigger Service calls `trigger()`, or anyone calls `launch()` → `Portal.launchTaxTokenV2{value: raised}`. Inside that one transaction:
   - Portal calls `TugVaultFactory.newVault` → deploys `TugVault`.
   - Portal calls `TugLauncher.initializeDistribution` → launcher pulls its 500k reserved tokens (base + bonus + captain pool).
7. Players call `TugLauncher.claim()`, then `TugVault.stake()`. Captains call `TugLauncher.claimCaptain()` as their allocation vests.
8. Trading tax (80% vault slot) reaches `TugVault` → captains and stakers claim BNB.

## Supply, fees and game parameters

| Item | Value |
|---|---|
| Total supply | 1,000,000 |
| Pool | 50% (500,000) |
| Base allocation | 35%, pro rata by BNB contributed, regardless of team |
| Bonus allocation | `1500 − captainAllocBps` bps of total supply (13% by default), split between teams by capped rope, then by pull within team |
| Max bonus share per team | 70% (floor for the other team 30%) |
| Captain allocation | 2% by default, split by capped rope (0.6% to 1.4% each at defaults), linear vest over 30 days by default from launch, held by the Launcher |
| Reserve handed to the Launcher | 50% (base + bonus + captain pool) |
| Buy / sell tax | 3% / 5% |
| Tax / anti-farmer duration | 30 days / 1 day |
| Fee slots | VAULT 8000, DEFLATION 2000 |
| Vault split | 20% captains, 80% stakers. Both split Blue / Red by final rope |
| Time weight | 2x → 1x linear from `gameStart` over `duration`, 1x in overtime. Both captain deposits get the full 2x |
| Overtime | Add 30 s when a contribution in the final 60 s changes the leader, counting a tie as `NONE`. Up to 5 extensions in total |
| Launch grace | 24 hours from the final buy-in deadline. Unlaunched games enter refunding at the cutoff |
| Captain minimum deposit | Set per game (0.1 tBNB for the demo) |
| Accept window | 1 hour from game creation (2 minutes for the demo) |
| Demo duration | 3 minutes |

**One number for everything.** `finalBlueShareBps` is the rope clamped to `[10000 − maxBonusShareBps, maxBonusShareBps]`, fixed at launch. It drives the bonus split, the captain allocation, the captain tax share and the vault pool split.

**Empty team.** Both captains must deposit, so normally no team is empty. If a team still has zero pull (captain minimum set to 0), the other team gets the whole bonus and its captain the whole captain share.

---

## Step 0 (PR 0): environment — Wed evening / night

Not product code.

**Testnet numbers (read from the Portal on 25 Nov):**

| Item | Value |
|---|---|
| Native BNB price set by Flap (`launchQuoteConfig(0, 0x0)`) | $700 |
| `SALT_LOCK_FEE` | 0.005 tBNB |
| Creation floor at 50% pool, 1x multiplier | $1,500 = 2.15 tBNB minimum raise |
| Creation floor at 100% pool, 1x multiplier | $750 = 1.08 tBNB |
| Graduation floor at 50% pool | $3,000 (only marks a token graduated; not needed to launch) |

**Tasks:**

- Foundry project, `src/flap/` copied, Flap's example fork tests green against a BSC testnet RPC.
- Start faucet claims tonight on at least 5 dev wallets (2 captains + 2 players per team, plus a creator). The official faucet gives about 0.3 tBNB per address per day; Chainstack and QuickNode add more; BNB Chain's Discord takes requests for larger amounts. Budget at 1x multiplier: about 5 tBNB (two launches plus the dry run).

**Done when:** faucet claims are running, a clean clone passes `forge build` with `src/flap/` copied unchanged, and Flap's own fork tests pass against BSC testnet.

---

## Step 1 (PR 1): frontend interfaces — Wed night

Interfaces, shared types and exported ABIs only. No implementation. Lets the frontend start immediately.

### `TugTypes.sol`

| Type | Fields and units |
|---|---|
| `Team`, `Phase` | `uint8` constants libraries |
| `TeamPair`, `TeamFlags` | Named `blue` and `red` fields of type `uint256` and `bool`, respectively |
| `DurationRange`, `BpsRange` | Inclusive named `min` and `max` fields. Durations use `uint64` seconds and basis-point ranges use `uint16` |
| `TugConfig` | In order: `string name, string symbol, string meta, bytes32 salt, uint64 duration, uint256 minRaise, uint256 walletCap, address captainBlue, address captainRed, address vaultFactory, uint16 maxBonusShareBps, uint256 captainMinDeposit, uint64 acceptWindow, uint16 captainAllocBps, uint64 captainVestDuration, uint16 captainShareBps` |
| `GameView` | `launcher, creator, factory, config, phase, captainDeposited, acceptDeadline, gameStart, originalDeadline, deadline, extensionsUsed, currentWeightBps, raised, raisedByTeam, pullByTeam, playersByTeam, ropeBps, autoLaunchRequestId, triggerBudget, triggerFunder, token, pool, vault, finalBlueShareBps`. Deposit flags use `TeamFlags`. Team totals use `TeamPair`. Clocks are `uint64` Unix seconds, overtime count is `uint8`, shares and weights are `uint16` basis points, and amounts and request IDs are `uint256` |
| `PlayerView` | `team, contribution, pull, baseEntitlement, bonusEntitlement, claimed, claimable, refundable, remainingCap`. `team` is `uint8`. Other fields are `uint256`. `refundable` is BNB wei |
| `CaptainAllocView` | `team, deposited, allocation, vested, claimed, claimable, vestEnd`. `team` is `uint8`, `deposited` is `bool`, token amounts are `uint256` wei, and `vestEnd` is `uint64` Unix seconds |
| `RulesView` | `buyTaxBps, sellTaxBps, vaultFeeBps, deflationFeeBps, captainShareBps, poolAllocBps, baseAllocBps, bonusAllocBps, captainAllocBps, maxBonusShareBps, captainVestDuration, taxDuration, antiFarmerDuration, startWeightBps, overtimeWindow, overtimeExtension, maxExtensions, launchGrace`. Basis points are `uint16`. Tax and anti-farmer durations use `uint32` seconds, other durations use `uint64` seconds, and `maxExtensions` is `uint8`. Time and weight defaults are in the game parameters above |
| `Limits` | `duration, acceptWindow, captainVestDuration` use `DurationRange`. `maxBonusShareBps, captainAllocBps, captainShareBps` use `BpsRange`. Then `uint256 minRaiseFloor` in BNB wei and `bool creationFloorAvailable`. True with zero is a valid floor. False with zero means unavailable |
| `VaultView` | Four `TeamPair` fields: `teamStaked` in token wei, `rewardPer1000NewTokensPerBnb` in BNB wei per 1 BNB of new revenue for a hypothetical new 1,000-token stake, `captainAccrued` and `captainClaimed` in BNB wei. Then `uint256 undistributed` in BNB wei. See Step 5 for the reward calculation |
| `StakerView` | `uint8 team`, then `uint256 staked, pendingRewards, tokenBalance, allowance`. The effective team is the recorded vault team when set, otherwise `launcher.teamOf(staker)`. `Team.NONE` means the wallet is free to choose on first stake. Amounts are token wei, except `pendingRewards` is BNB wei and projects the sync that the claim would settle |
| `CaptainView` | `uint8 team`, then `uint256 accrued, claimed, claimable` in BNB wei. `claimable` projects the sync that the claim would settle |

`captainIn(uint8 team)` and `teamStake(uint8 team)` take the numeric Blue and Red IDs and revert with `InvalidTeam()` for any other ID.

### `ITugLauncher`

| Kind | Functions |
|---|---|
| Write | `depositCaptain() payable`, `cancel()`, `scheduleAutoLaunch() payable`, `contribute(uint8 team) payable`, `launch()`, `refund()`, `claim()`, `claimCaptain()`, `withdrawTriggerBudget()` |
| Trigger callback | `trigger(uint256 requestId)` (from `ITriggerReceiver`; Trigger Service only) |
| One-call views | `getGame() → GameView`, `getPlayer(address) → PlayerView`, `getCaptain(address) → CaptainAllocView`, `getRules() → RulesView` |
| Button gates | `canDepositCaptain(address, uint256 amount) → (bool, bytes4 reason)`, `canCancel()`, `canScheduleAutoLaunch()`, `canContribute(address, uint8 team, uint256 amount)`, `canLaunch()`, `canRefund(address)`, `canClaim(address)`, `canClaimCaptain(address)` |
| Preview | `previewContribute(uint8 team, uint256 amount) → (pull, newRopeBps, wouldTriggerOvertime)`, `autoLaunchQuote() → uint256` (Trigger Service fee × 6: the first request plus one per possible overtime) |
| Getters | `phase, teamOf, contribution, pullOf, ropeBps, finalBlueShareBps, captainBlue, captainRed, captainIn, gameStart, raised, minRaise, deadline, launched, launching, token, pool, vault, creator, factory, triggerService, autoLaunchRequestId, triggerBudget` |
| Events | `CaptainDeposited(captain, team, amount)`, `GameStarted(gameStart, deadline)`, `AutoLaunchScheduled(requestId, executeAfter)`, `AutoLaunchStopped(requestId)`, `TriggerBudgetWithdrawn(funder, amount)`, `Cancelled(captain, refunded)`, `Contributed(player, team, amount, pull, weightBps, ropeBps)`, `Overtime(newDeadline, extensionsUsed)`, `Launched(token, pool, vault, raised, finalBlueShareBps)`, `Claimed(player, base, bonus)`, `CaptainVested(captain, amount)`, `Refunded(player, amount)`. Index player, captain, and team where present, plus `requestId`, `funder` and the three `Launched` addresses |
| Errors | `InvalidTeam, TeamLocked, ZeroContribution, WalletCapExceeded, NotCaptain, CaptainAlreadyIn, BelowCaptainMinimum, CaptainsNotIn, AcceptWindowOpen, AcceptWindowClosed, NotCancellable, GameCancelled, GameNotStarted, OnlyTriggerService, AutoLaunchAlreadyScheduled, InsufficientTriggerFee, BuyInClosed, BuyInOpen, BelowMinRaise, MinRaiseMet, CreationFloorUnavailable, BelowCreationFloor, LaunchGraceExpired, AlreadyLaunched, NotLaunched, NothingToClaim, NothingToRefund, NotTriggerFunder, TriggerBudgetLocked, TransferFailed` |

Gates return `(true, bytes4(0))` or the applicable state or validation error selector. `canScheduleAutoLaunch()` checks state and `autoLaunchQuote()` supplies the payment amount.

### `ITugLauncherFactory`

| Kind | Functions |
|---|---|
| Form | `limits() → Limits`, `defaultConfig() → TugConfig`, `validateConfig(TugConfig) → (bool, bytes4)`, `encodeConfig(TugConfig) → bytes`, `pairedVaultFactory()`, `portal()`. Validation returns `(true, bytes4(0))` on success or the matching creation error selector on failure |
| Salt mining | `tokenImplementation()`, `predictToken(bytes32 salt)` |
| Game list | `isLauncher(address)`, `gamesCount()`, `gameAt(i)`, `gamesOf(captain)` |
| Events | `TugLauncherCreated(launcher, creator, captainBlue, captainRed, salt)`. Index `launcher`, `captainBlue` and `captainRed` |
| Errors | `InvalidVaultFactory, InvalidCaptains, InvalidSalt, DurationOutOfRange, AcceptWindowOutOfRange, CaptainVestDurationOutOfRange, MaxBonusShareOutOfRange, CaptainAllocOutOfRange, CaptainShareOutOfRange, InvalidWalletCap, CaptainDepositExceedsWalletCap, ZeroMinRaise, CreationFloorUnavailable, MinRaiseBelowCreationFloor, NonCanonicalConfig`. All are parameterless |

### `ITugVault`

| Kind | Functions |
|---|---|
| Write | `stake(uint256 amount, uint8 team)`, `unstake(uint256)`, `claimRewards()`, `claimCaptain()`, `sync()` |
| One-call views | `getVault() → VaultView`, `getStaker(address) → StakerView`, `getCaptain(address) → CaptainView` |
| Getters | `stakeOf, stakerTeam, teamStake, pendingRewards, pendingCaptain, launcher, taxToken` |
| Events | `Synced(uint256 revenue, uint256 toCaptains, uint256 toBlue, uint256 toRed, uint256 carried)`, `Staked(address indexed staker, uint8 indexed team, uint256 amount)`, `Unstaked(address indexed staker, uint8 indexed team, uint256 amount)`, `RewardsClaimed(address indexed staker, uint8 indexed team, uint256 amount)`, `CaptainClaimed(address indexed captain, uint8 indexed team, uint256 amount)`. Staked amount is the token wei actually credited. Claim amounts and Synced fields are BNB wei |
| Errors | `InvalidTeam, ZeroAmount, WrongTeam, InsufficientStake, NothingToClaim, NotCaptain, TransferFailed` |

`TugLauncher.claimCaptain()` releases the vested coin allocation. `TugVault.claimCaptain()` pays the captain's BNB tax share. The frontend labels them differently.

### Calls per screen

| Screen | Calls |
|---|---|
| Create game | `limits`, `defaultConfig` → mine salt with `tokenImplementation` / `predictToken` → `validateConfig` → `Portal.newLauncher{value: SALT_LOCK_FEE}`; launcher address from `TugLauncherCreated` |
| Waiting for captains | Poll `getGame` and use `canDepositCaptain` → `depositCaptain`. At the accept cutoff with fewer than two deposits the phase stays `AWAITING_CAPTAINS` and `canCancel` → `cancel` becomes available. Do not show auto-launch scheduling. On testnet the Trigger Service callback cannot launch within its gas cap (plan decision 18), so the launch button is the path. |
| Game page | poll `getGame`, `getPlayer(me)`, `getRules`; `previewContribute` while typing; `canContribute` → `contribute`; feed from `Contributed`, `Overtime` |
| After the clock | Use `canLaunch` → `launch` whenever the gate succeeds during grace, regardless of automatic launch scheduling. The first eligible call launches. A later manual call reverts with `AlreadyLaunched`, and a later trigger does nothing. `AutoLaunchStopped` is an activity-feed hint. Use `canRefund` → `refund` once refunding opens. The auto-launch funder can call `withdrawTriggerBudget` after launch or when refunding opens |
| Claim and stake | `getPlayer` → `claim`; `getStaker` → approve + `stake`, `unstake`, `claimRewards`; captains: `getCaptain` on the launcher → `claimCaptain`, `getCaptain` on the vault → `claimCaptain` |

**Done when:** `forge build` passes, ABIs exported to `abi/` by one command, a compile test asserts key selectors, and `docs/frontend-api.md` lists the calls per screen.

---

## Step 2 (PR 2): `TugMath` — Wed night

Pure library, no storage, no platform imports (shared with OpenFour).

| Function | Returns |
|---|---|
| `timeWeightBps(start, end, now)` | 20000 at start → 10000 at end, 10000 after end |
| `pull(amount, weightBps)` | `amount * weightBps / 10000` |
| `ropeBps(pullBlue, pullRed)` | Blue share of total pull; 5000 if both zero |
| `leader(pullBlue, pullRed)` | BLUE, RED, or NONE on a tie |
| `finalBlueShareBps(pullBlue, pullRed, maxBps)` | rope clamped to `[10000 − max, max]`; 10000 or 0 if one team has zero pull |
| `split(amount, blueBps)` | `(blue, red)` with `red = amount − blue`, so nothing is lost to rounding |
| `playerBonus(teamBonus, playerPull, teamPull)` | `teamBonus * playerPull / teamPull` |
| `baseShare(baseTotal, contribution, raised)` | `baseTotal * contribution / raised` |
| `vested(total, start, duration, now)` | linear from `start` over `duration`; 0 at `start` |

**Tests (unit, in this PR):** start and deadline boundaries, overtime weight, zero pull one side, equal pull, cap at a blowout, captain split stays within 0.6% to 1.4%, vesting at 0 / half / end, rounding never over-allocates.

---

## Step 3 (PR 3): `TugLauncher` — Thu morning

Inherits `LauncherBase`, `Initializable`, `IStrategy`, `ReentrancyGuard`. Implements `ITugLauncher`. Starts from `CrowdLauncher`.

**Storage:** `hub, creator, factory, config, captainIn[2], acceptDeadline, gameStart, originalDeadline, deadline, extensionsUsed, raised, raisedByTeam[2], pull[2], playersByTeam[2], contribution, pullOf, teamOf, cancelled, launched, launching, launchedAt, distributionInitialized, token, pool, vault, finalBlueShareBps, claimed, captainAlloc[2], captainClaimed[2], triggerService, autoLaunchRequestId, triggerBudget, triggerFunder`.

| Function | Access | Behaviour |
|---|---|---|
| `initialize(hub, creator, cfg) payable` | factory, `initializer` | store config; `acceptDeadline = now + acceptWindow`; `lockSalt{value: SALT_LOCK_FEE}`. No game clock yet |
| `depositCaptain() payable` | named captain, once, either order | before `acceptDeadline`, `msg.value ≥ captainMinDeposit`, within wallet cap; record as a contribution on the captain's team with full 2x pull; the second deposit sets `gameStart` and `deadline = gameStart + duration` |
| `cancel()` | anyone | At `block.timestamp >= acceptDeadline` with fewer than two deposits, `phase()` stays `AWAITING_CAPTAINS` and `canCancel()` returns `(true, bytes4(0))` until cancellation succeeds. Mark cancelled, then return any captain deposit. The salt lock fee stays spent. `CANCELLED` and `GameCancelled()` apply after `cancel()` succeeds |
| `contribute(team) payable` | anyone | Require both captains in, `block.timestamp < deadline`, an unlaunched game, `msg.value > 0` and a valid team. Lock the team on first contribution, enforce the wallet cap, and update raised, contribution and weighted pull. Extend by `overtimeExtension` only when `leader(pullBlue, pullRed)` differs before and after the contribution, counting a tie as `NONE`, and `deadline − block.timestamp ≤ overtimeWindow` and `extensionsUsed < maxExtensions`. The five-extension limit covers every kind of leader change |
| `launch()` | anyone | From the final deadline until the grace cutoff, with `raised ≥ minRaise` and a met live creation floor. Fix `finalBlueShareBps` and captain allocations, set `launching = true`, call `launchTaxTokenV2{value: raised}`, then clear `launching` and store token, pool, vault and `launchedAt` |
| `initializeDistribution(token, amount, , )` | `onlyHub`, only while `launching`, once | pull exactly the reserved amount (base + bonus + captain pool) from the Hub |
| `refund()` | player or captain | In `REFUNDING`, zero the caller's contribution before sending the BNB. Refund eligibility uses game state and time |
| `claim()` | player or captain | pay base + bonus `entitlement − claimed`; state first |
| `claimCaptain()` | named captain | pay `vested(captainAlloc, launchedAt, captainVestDuration) − captainClaimed`; nothing at launch |
| `scheduleAutoLaunch() payable` | anyone, once | Game started, unlaunched, and `now ≤ deadline` so the request is for a current or future time. Require `msg.value ≥ autoLaunchQuote()`, schedule `requestTrigger{value: getFee()}(deadline)`, and record the request ID, unused `triggerBudget`, and `triggerFunder` |
| `trigger(requestId)` | Trigger Service only (a Flap `retryTrigger` arrives this way too) | Ignore stale requests and terminal states. When overtime requires a reschedule, read the fee and use `try/catch` around `requestTrigger`. If `triggerBudget < getFee()` or the request reverts, emit `AutoLaunchStopped(requestId)` and return with the request ID and budget unchanged. Manual launch remains available when eligible. From the deadline until the grace cutoff, launch only if both raise checks pass. An unavailable floor, a missed raise, or an elapsed grace cutoff is a no-op. `trigger()` never reverts on a state check. Only a non-Trigger Service caller reverts with `OnlyTriggerService()` on the caller check. Share launch execution with `launch()` and allow only the first eligible call to launch |
| `withdrawTriggerBudget()` | `triggerFunder` | After launch or once refunding opens, return the unused budget and emit `TriggerBudgetWithdrawn(funder, amount)` with the amount in BNB wei |
| Views from Step 1 | — | `getGame`, `getPlayer`, `getCaptain`, `getRules`, gates, preview, getters |
| `_description()` | internal | v1 JSON under 4 KB |
| `_buildParams()` | private | `quoteToken = 0`, `poolQuote = raised`, `poolToken = 500k`, tax 300/500, `taxDuration = 30 days`, `antiFarmerDuration = 1 days`, `antiSniperMode = 0`, `Distribution.target = EXPLICIT` with `strategy = address(this)`, `encodeCreator(creator)` |
| `_feeConfigs()` | private | VAULT 8000 with `vaultData = abi.encode(address(this))`, DEFLATION 2000 |

Captain deposits go through `depositCaptain()`, not the initializer, so creation still sends exactly `SALT_LOCK_FEE`.

**Refund cutoff.** An unlaunched game with a started clock enters `REFUNDING` at `block.timestamp >= deadline` if `raised < minRaise`, or for any raise at `block.timestamp >= deadline + LAUNCH_GRACE`. `LAUNCH_GRACE` is 24 hours from the overtime-adjusted deadline. At the grace cutoff, `canLaunch()` returns `LaunchGraceExpired.selector`, `launch()` reverts with it, and `trigger()` does nothing. `canRefund()` and `refund()` use local state even while the Portal is unavailable.

**Live creation floor.** Use [`IPortalFloor`](src/interfaces/IPortalFloor.sol) to read the native quote at call time with `launchQuoteConfig(uint8(IPortalTypes.LaunchKind.DIRECT_V2_POOL_TAX), address(0))`. Preview with `graduationFloorV2ForLauncher` using the live quote price, the actual launch parameters including `poolQuote = raised`, and this launcher's address. Use `meetsCreateFloor` for the launch decision. `canLaunch()` and `launch()` use `BelowCreationFloor()` if an available preview misses the floor. A disabled quote, a zero quote price, or a reverted Portal read maps to `CreationFloorUnavailable()`. Share these checks with the callback, which does nothing on either floor failure. Evaluate the grace cutoff before Portal reads.

**Auto-launch.** The Trigger Service has no cancel and no timing guarantee, so `trigger()` re-checks the deadline every time and `launch()` stays public. The launch sends exactly `raised`; `triggerBudget` is kept apart and never counted in it. A callback gets at most `getMaxCallbackGas()` (2,000,000 on testnet), and a callback that runs out becomes FAILED (anyone can `retryTrigger`). On BSC testnet at block 144938757, a callback capped at the live 2,000,000 gas reverted with `0xbbdf0a77` (origin unconfirmed). Uncapped, the same call launched with the stand-in vault and used 4,643,735 gas. Manual launch is the default and the UI hides scheduling.

---

## Step 4 (PR 3): `TugLauncherFactory` — Thu morning

Inherits `LauncherFactoryBase`. Implements `ITugLauncherFactory`.

| Function | Behaviour |
|---|---|
| `constructor(hub, guardian, beacon, pairedVaultFactory, tokenImpl, triggerService)` | the Trigger Service address goes to every launcher (testnet `0x560E9830926C9e0EB98a59c6b9902383Fc0D9Eb2`) |
| `_newLauncher(creator, data)` | Decode `TugConfig` and reject noncanonical encoding with `NonCanonicalConfig()`. Validate using the same checks as `validateConfig()`. Deploy the beacon proxy, call `initialize{value: msg.value}` and record the game |
| `launcherDataSchema()` | field list |
| `upgradeVaultImplementation(impl)` | `onlyGuardian` |
| Views from Step 1 | `limits()` returns inclusive ranges and the live BNB floor with its availability flag. `defaultConfig()` returns the defaults below. `validateConfig()` returns the same selector that factory validation would revert with. Also expose `encodeConfig`, `predictToken` and game discovery |

| Field | Min | Max | Default |
|---|---:|---:|---:|
| `duration` | 60 s | 7 days | 3 min |
| `acceptWindow` | 60 s | 1 day | 1 hour (2 min for the demo) |
| `captainVestDuration` | 1 day | 90 days | 30 days |
| `maxBonusShareBps` | 5000 | 10000 | 7000 |
| `captainAllocBps` | 0 | 500 | 200 |
| `captainShareBps` | 0 | 5000 | 2000 |

**Validation.** Require the configured paired vault factory, distinct nonzero captain addresses, and a nonzero salt with a token prediction ending in `7777`. Check all six ranges. Require `walletCap > 0` (`InvalidWalletCap()`), `captainMinDeposit ≤ walletCap` (`CaptainDepositExceedsWalletCap()`), and `minRaise > 0` (`ZeroMinRaise()`). An unavailable floor returns or reverts with `CreationFloorUnavailable()`. A positive configured raise below an available floor returns or reverts with `MinRaiseBelowCreationFloor()`.

**Factory floor preview.** Read the native quote as in Step 3 with [`IPortalFloor`](src/interfaces/IPortalFloor.sol). Before a launcher exists, mirror the Portal multiplier rule below using `IPortalFloor.vaultFactoryMultiplier(pairedVaultFactory)` and, on fallback, `IPortal.launcherFactoryMultiplier(address(this))`. Compute the USD creation floor for the fixed supply and pool allocation, then round `createFloorUsdWad × 1e18 / quotePriceUsd` up to BNB wei. A disabled or zero-priced quote or a revert from any needed Portal read means `creationFloorAvailable = false` and `minRaiseFloor = 0`. An enabled zero multiplier yields `creationFloorAvailable = true` and `minRaiseFloor = 0`. A disabled Vault Factory selects the next multiplier according to the Portal rule.

**Tests (fork, in this PR):** `TugBase.sol` (fork BSC testnet, open our factory as admin with `setLauncherFactoryMultiplier`, mine a `7777` salt, fund 5+ wallets, `vm.startPrank` / `vm.stopPrank`) and the PR 3 rows of the fork test checklist below.

---

## Step 5 (PR 4): `TugVault` — Thu midday

Inherits `DirectLaunchVaultBase`, `Initializable`, `ReentrancyGuard`. Implements `ITugVault`. Accounting pattern from `StakeMineVault` (`_syncRevenue`, `_spendBaseline`). One vault, two ledgers: Flap allows one vault per token.

**Storage:** `token, launcher, captainShareBps, finalBlueShareBps, baseline, accRewardPerShare[2], totalStaked[2], stakeOf, rewardDebt, stakerTeam, captainAccrued[2], captainClaimed[2], undistributed, totals`.

| Function | Behaviour |
|---|---|
| `initialize(token, launcher)` | factory only; read `captainShareBps` and `finalBlueShareBps` from the launcher |
| `receive()` | empty; never reverts |
| `sync()` / `_sync()` | `delta = balance − baseline`; `captainShareBps` (20%) of `delta` to captains split by `finalBlueShareBps`; staker part = rest of `delta` + `undistributed`, split Blue / Red by `finalBlueShareBps` into `accRewardPerShare[team]`; a team with no stakers passes its part to the other; neither → `undistributed` (captains are never charged twice on carried revenue); `baseline = balance` |
| `stake(amount, team)` | sync; team from `launcher.teamOf`, otherwise chosen on first stake and fixed; settle pending; pull tokens; credit actual received amount |
| `unstake(amount)` | sync; settle; return tokens; rewards stop from this point |
| `claimRewards()` | sync; pay pending BNB from the caller's team pool; `baseline −= paid` |
| `claimCaptain()` | sync; pay caller's captain accrual; `baseline −= paid` |
| `description()` | every fee and recipient |
| `vaultUISchema()` | `stake`, `unstake`, `claimRewards`, `claimCaptain` |
| Views from Step 1 | `getVault()` exposes the two reward previews below. `getStaker().pendingRewards` and `getCaptain().claimable` use the same revenue snapshot as the corresponding claim, including any carry the next sync would distribute. Apply the same snapshot to `pendingRewards(address)` and `pendingCaptain(address)` |

**New-stake reward preview.** For each team's `rewardPer1000NewTokensPerBnb`, simulate adding 1,000 credited tokens to that team. From 1 BNB of new vault revenue, the staker portion is `1 ether × (10000 − captainShareBps) / 10000`. Split it by `finalBlueShareBps`. If the other team would still be empty, redirect its share to the joining team. Report `teamPortion × 1000e18 / (teamStaked + 1000e18)` in BNB wei, rounded down, with prior carry excluded. Calculate Blue and Red independently. With both teams empty, each preview shows the full staker portion. A team with zero final-rope share and stake in the other team can have a zero preview.

Every permissioned function also accepts the Guardian. Deploy vaults deterministically behind a beacon.

---

## Step 6 (PR 4): `TugVaultFactory` — Thu midday

Inherits `DirectLaunchVaultFactoryBase`.

| Function | Behaviour |
|---|---|
| `newVault(token, creator, kind, params)` | `onlyHub`; `_validateLaunch`; creator came from our launcher factory; `vaultData` names creator; native quote; vault slot 8000; launcher `launching()`; deploy and initialize |
| `isQuoteTokenSupported`, `vaultDataSchema`, `tokenCreationPolicies` | |
| `factorySpecVersion()` | `"pl-v1"` |
| `upgradeVaultImplementation` | `onlyGuardian` |
| `setLauncherFactory(addr)` | once, at deploy (the two factories need each other's address) |

**Tests (fork, in this PR):** the full-journey test and the PR 4 rows of the checklist.

---

## Step 7 (PR 5): scripts and testnet launch — Thu afternoon

- `Deploy.s.sol` — deploy both factories and beacons, link them.
- `MineSalt.s.sol` — salt ending in `7777`.
- `CreateGame.s.sol` — create a game through the Portal.
- `DemoGame.s.sol` — scripted game: both captains deposit, at least two wallets per team contribute, launch, trade so tax flows, claim, stake.

Factories cannot be changed after deployment, and a change means a new factory and a new Flap audit. Deploy once, after PRs 3 and 4 pass, with every config range final. Then ping Flap with both factory addresses and ask for a Trigger Service callback cap above PR 4's measured `trigger()` → launch gas, with headroom. Flap approves testnet factories on request.

**Small amounts first.** Only `launch()` needs the floor; the raised BNB goes into the pool and is not returned.

| Run | What it covers | tBNB |
|---|---|---|
| Fork tests (PRs 3–4) | Everything, including the full journey | None (`vm.deal`, admin opens the factory) |
| Testnet dry run | Create, captain deposits, contributions, overtime, cancel, and refund with a raise below `minRaise` | ~0.1 plus a 0.005 salt fee per game |
| Testnet launch | One real game create → deposits → launch → trade → claim → stake | ≥ 2.15 (default 1x multiplier) |
| Live demo | A second launch on stage, unless the demo reuses the first token or a video | Same as above |

**Done when:** factories are deployed and opened on testnet, the dry run passed, one real game ran create → deposits → launch → claim → stake, tax reached the vault, and the addresses are in the README.

If this checkpoint slips, the doc says to drop the OpenFour port and spend the time on the Flap demo.

---

## Fork test checklist

| PR | Test |
|---|---|
| 3 | With creation paused and both factory flags disabled, `newLauncher` registered the game and `launch()` created the token, pool and vault (BSC testnet, Portal v1.2.0, block 144932590). Flap's `IPortal` NatSpec says `newLauncher` reverts for a disabled factory. |
| 3 | With an otherwise valid config, `validateConfig` accepts `maxBonusShareBps` values of 5,000 and 10,000. At 4,999 and 10,001 it returns `(false, MaxBonusShareOutOfRange.selector)`, and creation reverts with the same error |
| 3 | Only the named captains can call `depositCaptain`, once each, at or above the minimum |
| 3 | `contribute` reverts until both captains are in |
| 3 | At the accept deadline with zero or one captain in, `depositCaptain` reverts, `phase()` stays `AWAITING_CAPTAINS`, and `canCancel()` is `(true, bytes4(0))`. A successful cancel returns any captain deposit and then exposes `CANCELLED` and `GameCancelled()` |
| 3 | No team switch, wallet cap enforced (captain deposits count toward it) |
| 3 | Early contribution earns more pull than equal late one |
| 3 | Within the overtime window, tie → lead, lead → tie and Blue → Red each extend. Keeping the same leader adds no time. A mix of ties and swaps stops after 5 extensions in total |
| 3 | Refund path when minimum missed, launch impossible |
| 3 | At the grace cutoff an unlaunched game enters `REFUNDING` even when it reached `minRaise`. Manual launch returns `LaunchGraceExpired()`, the trigger does nothing, and refunds work during a Portal outage |
| 3 | Factory floor parity across the six multiplier cases below and disabled or unreadable quote cases. Compare `limits().minRaiseFloor` and `creationFloorAvailable` with the Portal |
| 3 | An available zero floor returns true with zero wei. Zero `minRaise` is rejected independently with `ZeroMinRaise()` |
| 3 | Second launch reverts |
| 3 | Base + bonus + captain allocations sum to the reserve within 1 token |
| 3 | Bonus respects max team share at a blowout |
| 3 | Captain allocations stay within 0.6% to 1.4% each; vesting is linear and nothing is claimable at launch |
| 4 | Full journey: create, deposits, both teams contribute, launch, trade so tax flows, claims, stake, reward claims |
| 4 | A post-launch buyer picks a side on first stake and cannot change it |
| 4 | Team pools receive tax by the fixed rope split, independent of how much is staked in each |
| 4 | An empty pool's part goes to the other pool; with both empty it is carried to the next sync |
| 4 | The two new-stake reward previews match their independent hypothetical joins, including an empty opposite team, both teams empty, and a zero effective team share. Claimable views agree with the next sync and eligible carry |
| 4 | Vault accounting correct across a zero-value ping |
| 4 | Stranger launcher refused by vault factory |
| 4 | Auto-launch at the deadline when both raise checks pass. A trigger during overtime requests again at the new deadline. An unmet or unavailable floor, a missed raise, an expired grace period or a stale ID is a no-op. Only the Trigger Service can call `trigger`. These call `trigger()` without the gas cap. |
| 4 | Raise the Trigger Service fee after scheduling so the overtime reschedule is underfunded. Assert `AutoLaunchStopped` and launch manually when eligible. These call `trigger()` without the gas cap. |
| 4 | Measure `trigger()` → launch with the real `TugVault` against the live `getMaxCallbackGas()`, and record both numbers. PR 3's stand-in measured 4,643,735 against 2,000,000. Do not assert that it fits. |

**PR 3 factory parity tests.** Move the precedence probe into `test/fork/TugLauncher.fork.t.sol` with the real Tug factory and a freshly registered launcher. Set the Portal's factory flags and multipliers on the fork, then exercise every row of the verified table below. For the both-disabled case, register the launcher before disabling both flags and compare the preview. Use the same live quote price for both sides of the comparison. Compare the factory's BNB wei floor with `ceil(createFloorUsdWad × 1e18 / quotePriceUsd)` from `graduationFloorV2ForLauncher` and assert availability. For positive floors in launchable cases, assert that the Portal preview accepts that wei amount and rejects one wei less. For an enabled zero multiplier assert `(creationFloorAvailable, minRaiseFloor) = (true, 0)`, and test `ZeroMinRaise()` separately. For a disabled or zero-priced quote or a reverted Portal read assert `(false, 0)` and `CreationFloorUnavailable()` from validation and creation.

---

## After the testnet launch (should-have)

Only after Step 7 is done:

1. **OpenFour port** — Thu night, separate from these contracts (see the doc's OpenFour section). One project can enter several tracks, so it stays a should-have after the Flap launch.

**Trigger Service auto-launch is built into the launcher in PR 3** (see Step 3), because factories cannot change once deployed.

**Not used:** Token Locker (Flap describes it as locking tokens "while they keep earning dividends"; this design has no dividend slot, so captain vesting stays in the Launcher) and VaultEX (the vault pays BNB and needs no swaps).

Frontend (Thu evening), demo videos and the submission (Fri early morning) are outside this plan, but the UI is a Flap hard requirement: start from Flap's launcher UI template. A friend of the team builds the frontend and the OpenFour port independently. The handoff is PR 1: the exported ABIs and `docs/frontend-api.md`, so PR 1 goes to them as soon as it merges.

**Stretch goals (underdog boost, market-cap handicap, X Verifier challenge posts) are out of scope** unless the Flap version is launched on testnet with time left. Nothing in Steps 1–7 builds hooks for them.

---

## Platform constraints (review checklist)

- Create only through `Portal.newLauncher`. Flap audits and opens factories. On BSC testnet, Portal v1.2.0, block 144932590, neither creation nor launch required the factories to be enabled (decision 7). Factories are immutable, so a change means a new factory and a new audit.
- Factories inherit `LauncherFactoryBase` / `DirectLaunchVaultFactoryBase` (required by Flap).
- Launcher locks its own salt; factory never does.
- Token address ends in `7777`; never call the token before launch.
- One launch per launcher; `msg.value == poolQuote + creatorBuyQuote`.
- Whole reserve handed off in the launch transaction (≤ 1 token left).
- Tax ≤ 1000 bps each. Use `taxDuration = 30 days`, `antiFarmerDuration = 1 days` and `antiSniperMode = 0`.
- ≤ 4 fee slots, each type once, sum 10000; no VAULT + MARKETING.
- The floor multiplier is **enabled Vault Factory → enabled Launcher Factory → 10,000 bps default.** Read the applicable multiplier live. An enabled zero multiplier is a valid zero floor.
- The positive `minRaise` must clear the creation floor, `$750 × multiplier × totalSupply / poolToken`. At the observed $700 testnet quote price, 50% pool share and 1x multiplier, the minimum is `2,142,857,142,857,142,858` BNB wei. Recheck the live floor before launch with `graduationFloorV2ForLauncher` and `meetsCreateFloor`. The Portal rejects a launch below it with `LaunchLiquidityTooLow`.
- Use [`IPortalFloor`](src/interfaces/IPortalFloor.sol) for the live native quote, floor previews, and Vault Factory multiplier. Pass the named direct V2 launch kind to `launchQuoteConfig`. Catch reverts from each required Portal floor, quote or multiplier read. A disabled quote, zero price or reverted read makes the creation floor unavailable. Refunds at the grace cutoff use game state and time alone.
- Salt lock fee (0.005 tBNB on testnet, 0.01 BNB on mainnet) is lost if a game is cancelled.
- Trigger Service: `requestTrigger(uint64 executeAfter) payable` with the fee from `getFee()` (0.0002 tBNB on testnet, never hardcoded); callback `trigger(uint256)` checks `msg.sender == triggerService`; gas cap `getMaxCallbackGas()`; no cancel, no timing guarantee.
- Upgrades Guardian-only, ~24 h review: do not design around upgrades.

The BSC testnet fork probe used a newly registered launcher and confirmed this matrix at block 144827506.

| Vault Factory | Launcher Factory | Portal multiplier (bps) |
|---|---|---:|
| Enabled at 10,000 | Enabled at 10,000 | 10,000 |
| Enabled at 5,000 | Enabled at 10,000 | 5,000 |
| Disabled | Enabled at 5,000 | 5,000 |
| Enabled at 10,000 | Enabled at 5,000 | 10,000 |
| Enabled at 0 | Enabled at 5,000 | 0 |
| Disabled | Disabled | 10,000 |

---

## Workflow

1. Codex implements one PR in step order, tests included.
2. Nat runs `forge build` and `forge test` locally, shares the diff or PR.
3. Claude reviews against this plan and the constraints, returns fixes.
4. Codex fixes, Claude re-checks, Nat merges.

| PR | Steps | Due | Review focus |
|---|---|---|---|
| 0 | Environment, factory check | Wed evening / night | faucet claims running; `src/flap/` unchanged and pinned; Flap's fork tests pass on testnet |
| 1 | Frontend interfaces | Wed night | completeness for every screen including captains, stable ABIs |
| 2 | TugMath + unit tests | Wed night | rounding, bps edges, cap, empty team, captain split, vesting |
| 3 | Launcher + factory + fork tests | Thu morning | salt lock, exact value, reserve handoff, launching flag, captain deposits and cancel, cap, team lock, overtime, reentrancy, claim sums |
| 4 | Vault + factory + full journey | Thu midday | balance-delta accounting, baseline on every outflow, `receive()`, captain/pool split, empty pool carry, mid-stream stake/unstake, stranger refusal, Guardian |
| 5 | Scripts + testnet launch | Thu afternoon | config ranges final before the one deploy, small dry run first, then a real game end to end, clean clone passes with README only |

PR 1 and PR 2 can merge into one if review time is short.

---

## Decisions settled by the handover doc

| # | Question | Answer |
|---|---|---|
| 1 | Can holders who did not contribute stake? | Yes. They pick a side on their first stake and stay on it |
| 2 | Staker rewards: one pool or split by team? | Two pools, Blue and Red, split by final rope. Empty pool passes to the other; both empty carries to the next sync |
| 3 | Captain token allocation? | Yes. 2% of supply (bonus drops from 15% to 13%), split by capped rope, vested linearly over 30 days in the Launcher |
| 4 | Zero-pull team's bonus? | Other team gets the whole bonus, and its captain the whole captain share |
| 5 | 70% maximum bonus share? | Kept (comment resolved) |
| 6 | How does a game start? | Captain challenge and accept deposits; cancel and refund if B does not accept in time |
| 7 | Does Flap have to open our factory? | Not observed to be required. On BSC testnet, Portal v1.2.0, block 144932590, a fork probe created and launched a game with creation paused and both factory flags disabled. The floor parity tests cover how the flags select the multiplier. Still ask Flap to open both factories (decision 16) using `setLauncherFactoryMultiplier(launcherFactory, 10000, true)` and `setVaultFactoryMultiplier(vaultFactory, 10000, true)`. |
| 8 | What is the liquidity floor? | $750 × multiplier × totalSupply / poolToken. Read from the testnet Portal: BNB at $700, so 2.15 tBNB at a 50% pool share and 1x multiplier. About 7 faucet-days from one address, so funding is spread over 5+ wallets and several faucets |
| 9 | Can a captain deposit more than the minimum? | Yes. `depositCaptain` takes "at least captainMinDeposit", and the deposit counts toward the wallet cap |
| 10 | Can we copy Flap's base contracts? | Yes, and we must: Flap requires factories to inherit `LauncherFactoryBase`. Example sources are marked MIT (the repo has no LICENSE file). The README says what is ours and what came from Flap |
| 11 | Does a game fit the Flap track? | Yes. Flap's full track text lists "a game" as a launcher, asks for mechanisms that are "fun, surprising", and sets no rule on prediction markets beyond the doc's own |
| 12 | Captain vesting through Token Locker? | No. It suits tokens with a dividend slot, which this design does not use. Vesting stays in the Launcher |
| 13 | Ask Flap for a lower floor multiplier? | No. Follow Flap's defaults: 1x multiplier, about 2.15 tBNB per launch |
| 14 | Can one project enter the Developer, Flap and OpenFour tracks? | Yes. OpenFour stays a should-have after the Flap launch |
| 15 | Who builds the frontend and the OpenFour port? | A friend of the team, independently, calling the PR 1 interfaces |
| 16 | How do our testnet factories get opened? | Ping Flap with the addresses after deploy and they approve. No audit needed for testnet |
| 17 | Captain share of vault revenue? | 20%, as the doc says. `captainShareBps` in `TugConfig`, default 2000, configurable per game like every other default |
| 18 | Trigger Service auto-launch? | Built into the launcher. On BSC testnet at block 144938757, a callback capped at the live 2,000,000 gas reverted with `0xbbdf0a77` (origin unconfirmed). Uncapped, the same call launched with the stand-in vault and used 4,643,735 gas. Manual launch is the default and the UI hides scheduling. Ask Flap for a callback cap with headroom over PR 4's real-vault measurement. |
| 19 | Must one captain deposit first? | No. Either named captain can go first; the first deposit is the challenge, the second the accept |
| 20 | When does the accept window start? | At game creation. Both captains must deposit within it, or the game can be cancelled |
| 21 | Does a tie count as a lead change for overtime? | Yes. Moving into or out of a tie extends the deadline, within the same limit of 5 extensions. |

## Open questions

None. Every question that blocks code is settled.
