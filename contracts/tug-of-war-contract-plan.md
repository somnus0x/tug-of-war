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
- Phases: `0 = AWAITING_CAPTAINS`, `1 = BUY_IN`, `2 = AWAITING_LAUNCH`, `3 = REFUNDING`, `4 = LAUNCHED`, `5 = CANCELLED`.
- Shares in basis points (`10000 = 100%`). BNB and token amounts in wei.
- Custom errors only, so the frontend can decode reverts.
- State changes before external calls; `nonReentrant` on every function that sends BNB or tokens.
- Each PR ships with its own tests. No PR is "tests later".

## Repo layout

The Foundry project lives in `contracts/`. The frontend and the OpenFour port live outside it.

```
src/
  flap/                           Flap base contracts, unchanged
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
4. Anyone calls `scheduleAutoLaunch()` with the Trigger Service fee, so Flap's Trigger Service calls the launcher back at the deadline.
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
| Bonus allocation | 13%, split between teams by capped rope, then by pull within team |
| Max bonus share per team | 70% (floor for the other team 30%) |
| Captain allocation | 2%, split by capped rope (0.6% to 1.4% each), linear vest over 30 days from launch, held by the Launcher |
| Reserve handed to the Launcher | 50% (base + bonus + captain pool) |
| Buy / sell tax | 3% / 5% |
| Fee slots | VAULT 8000, DEFLATION 2000 |
| Vault split | 20% captains, 80% stakers. Both split Blue / Red by final rope |
| Time weight | 2x → 1x linear from `gameStart` over `duration`, 1x in overtime. Both captain deposits get the full 2x |
| Overtime | +30 s if lead flips in last 60 s, max 5 |
| Captain minimum deposit | Set per game (0.1 tBNB for the demo) |
| Accept window | 1 hour from game creation (2 minutes for the demo) |
| Demo duration | 3 minutes |

**One number for everything.** `finalBlueShareBps` is the rope clamped to `[10000 − maxBonusShareBps, maxBonusShareBps]`, fixed at launch. It drives the bonus split, the captain allocation, the captain tax share and the vault pool split.

**Empty team.** Both captains must deposit, so normally no team is empty. If a team still has zero pull (captain minimum set to 0), the other team gets the whole bonus and its captain the whole captain share.

---

## Step 0 (PR 0): environment — Wed evening / night

Not product code. Codex brief for PRs 0–2: `codex-brief-pr0-2.md`.

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

| Type | Purpose |
|---|---|
| `Team`, `Phase` | constants libraries |
| `TugConfig` | create-game form: `name, symbol, meta, salt, duration, minRaise, walletCap, captainBlue, captainRed, vaultFactory, maxBonusShareBps, captainMinDeposit, acceptWindow, captainAllocBps, captainVestDuration, captainShareBps` |
| `GameView` | everything the game page renders: identity, config, phase, captains (deposited per team, accept deadline = creation + accept window), clock (gameStart, originalDeadline, deadline, extensionsUsed, currentWeightBps), raised and pull per team, players per team, ropeBps, auto-launch (request id, budget), launch results (token, pool, vault, finalBlueShareBps) |
| `PlayerView` | one wallet: team, contribution, pull, base and bonus entitlement, claimed, claimable, refundable, remainingCap |
| `CaptainAllocView` | one captain: team, deposited, allocation, vested, claimed, claimable, vestEnd |
| `RulesView` | taxes, fee slots, captain share of vault revenue, supply split, max bonus share, captain allocation and vesting — shown before contributing |

### `ITugLauncher`

| Kind | Functions |
|---|---|
| Write | `depositCaptain() payable`, `cancel()`, `scheduleAutoLaunch() payable`, `contribute(uint8 team) payable`, `launch()`, `refund()`, `claim()`, `claimCaptain()`, `withdrawTriggerBudget()` |
| Trigger callback | `trigger(uint256 requestId)` (from `ITriggerReceiver`; Trigger Service only) |
| One-call views | `getGame() → GameView`, `getPlayer(address) → PlayerView`, `getCaptain(address) → CaptainAllocView`, `getRules() → RulesView` |
| Button gates | `canDepositCaptain(address, uint256 amount) → (bool, bytes4 reason)`, `canCancel()`, `canScheduleAutoLaunch()`, `canContribute(address, uint8 team, uint256 amount)`, `canLaunch()`, `canRefund(address)`, `canClaim(address)`, `canClaimCaptain(address)` |
| Preview | `previewContribute(uint8 team, uint256 amount) → (pull, newRopeBps, wouldTriggerOvertime)`, `autoLaunchQuote() → uint256` (Trigger Service fee × 6: the first request plus one per possible overtime) |
| Getters | `phase, teamOf, contribution, pullOf, ropeBps, finalBlueShareBps, captainBlue, captainRed, captainIn, gameStart, raised, minRaise, deadline, launched, launching, token, pool, vault, creator, factory, triggerService, autoLaunchRequestId, triggerBudget` |
| Events | `CaptainDeposited(captain, team, amount)`, `GameStarted(gameStart, deadline)`, `AutoLaunchScheduled(requestId, executeAfter)`, `Cancelled(captain, refunded)`, `Contributed(player, team, amount, pull, weightBps, ropeBps)`, `Overtime(newDeadline, extensionsUsed)`, `Launched(token, pool, vault, raised, finalBlueShareBps)`, `Claimed(player, base, bonus)`, `CaptainVested(captain, amount)`, `Refunded(player, amount)` |
| Errors | `InvalidTeam, TeamLocked, ZeroContribution, WalletCapExceeded, NotCaptain, CaptainAlreadyIn, BelowCaptainMinimum, CaptainsNotIn, AcceptWindowOpen, AcceptWindowClosed, NotCancellable, GameCancelled, GameNotStarted, OnlyTriggerService, AutoLaunchAlreadyScheduled, InsufficientTriggerFee, BuyInClosed, BuyInOpen, BelowMinRaise, MinRaiseMet, AlreadyLaunched, NotLaunched, NothingToClaim, NothingToRefund, TransferFailed` |

### `ITugLauncherFactory`

| Kind | Functions |
|---|---|
| Form | `limits() → Limits`, `defaultConfig() → TugConfig`, `validateConfig(TugConfig) → (bool, bytes4)`, `encodeConfig(TugConfig) → bytes`, `pairedVaultFactory()`, `portal()` |
| Salt mining | `tokenImplementation()`, `predictToken(bytes32 salt)` |
| Game list | `isLauncher(address)`, `gamesCount()`, `gameAt(i)`, `gamesOf(captain)` |
| Events | `TugLauncherCreated(launcher, creator, captainBlue, captainRed, salt)` |

### `ITugVault`

| Kind | Functions |
|---|---|
| Write | `stake(uint256 amount, uint8 team)`, `unstake(uint256)`, `claimRewards()`, `claimCaptain()`, `sync()` |
| One-call views | `getVault() → VaultView` (per team: staked, reward per 1,000 coins; captain ledger; undistributed), `getStaker(address) → StakerView` (team, staked, pendingRewards, tokenBalance, allowance), `getCaptain(address) → CaptainView` |
| Getters | `stakeOf, stakerTeam, teamStake, pendingRewards, pendingCaptain, launcher, taxToken` |
| Events | `Synced(revenue, toCaptains, toBlue, toRed, carried)`, `Staked`, `Unstaked`, `RewardsClaimed`, `CaptainClaimed` |
| Errors | `ZeroAmount, WrongTeam, InsufficientStake, NothingToClaim, NotCaptain, TransferFailed` |

`TugLauncher.claimCaptain()` releases the vested coin allocation. `TugVault.claimCaptain()` pays the captain's BNB tax share. The frontend labels them differently.

### Calls per screen

| Screen | Calls |
|---|---|
| Create game | `limits`, `defaultConfig` → mine salt with `tokenImplementation` / `predictToken` → `validateConfig` → `Portal.newLauncher{value: SALT_LOCK_FEE}`; launcher address from `TugLauncherCreated` |
| Waiting for captains | poll `getGame`; captain sees `canDepositCaptain` → `depositCaptain`; after the accept window `canCancel` → `cancel`; after `GameStarted`, `autoLaunchQuote` → `scheduleAutoLaunch{value: quote}` |
| Game page | poll `getGame`, `getPlayer(me)`, `getRules`; `previewContribute` while typing; `canContribute` → `contribute`; feed from `Contributed`, `Overtime` |
| After the clock | the Trigger Service normally launches; the launch button stays for a late or failed callback (`canLaunch` → `launch`); or `canRefund` → `refund`; the auto-launch funder sees `withdrawTriggerBudget` |
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
| `cancel()` | anyone | `acceptDeadline` passed with fewer than two captains in; mark cancelled, then send back the deposit of the captain who is in, if any. Salt lock fee is not returned |
| `contribute(team) payable` | anyone | both captains in, before deadline, not launched, `msg.value > 0`, valid team; lock team on first call; enforce wallet cap; update raised, contribution, pull with weight from `gameStart`; overtime if leader changed, `deadline − now ≤ 60`, `extensionsUsed < 5` |
| `launch()` | anyone | after deadline, `raised ≥ minRaise`, not launched; fix `finalBlueShareBps`; set captain allocations; `launching = true`; `launchTaxTokenV2{value: raised}`; `launching = false`; store token, pool, vault, `launchedAt` |
| `initializeDistribution(token, amount, , )` | `onlyHub`, only while `launching`, once | pull exactly the reserved amount (base + bonus + captain pool) from the Hub |
| `refund()` | player or captain | after deadline, `raised < minRaise`, not launched; zero contribution, then send BNB |
| `claim()` | player or captain | pay base + bonus `entitlement − claimed`; state first |
| `claimCaptain()` | named captain | pay `vested(captainAlloc, launchedAt, captainVestDuration) − captainClaimed`; nothing at launch |
| `scheduleAutoLaunch() payable` | anyone, once | game started, not launched, `msg.value ≥ autoLaunchQuote()`; `requestTrigger{value: getFee()}(deadline)`; store the request id; keep the rest as `triggerBudget`; record the caller as `triggerFunder` |
| `trigger(requestId)` | Trigger Service only (a Flap `retryTrigger` arrives this way too) | do nothing if the id is not the current one or the game already launched; if `now < deadline` (overtime moved it), request again at the new deadline from `triggerBudget`; else if the raise met the minimum, launch; else do nothing. Never reverts on a state check. Shares the launch code with `launch()`, so whichever runs first launches and the other does nothing (`trigger`) or reverts `AlreadyLaunched` (`launch`) |
| `withdrawTriggerBudget()` | `triggerFunder` | after launch, or once refunding: return the unused budget |
| Views from Step 1 | — | `getGame`, `getPlayer`, `getCaptain`, `getRules`, gates, preview, getters |
| `_description()` | internal | v1 JSON under 4 KB |
| `_buildParams()` | private | `quoteToken = 0`, `poolQuote = raised`, `poolToken = 500k`, tax 300/500, `antiSniperMode = 0`, `Distribution.target = EXPLICIT` with `strategy = address(this)`, `encodeCreator(creator)` |
| `_feeConfigs()` | private | VAULT 8000 with `vaultData = abi.encode(address(this))`, DEFLATION 2000 |

Captain deposits go through `depositCaptain()`, not the initializer, so creation still sends exactly `SALT_LOCK_FEE`.

**Auto-launch.** The Trigger Service has no cancel and no timing guarantee, so `trigger()` re-checks the deadline every time and `launch()` stays public. The launch sends exactly `raised`; `triggerBudget` is kept apart and never counted in it. A callback gets at most `getMaxCallbackGas()` (2,000,000 on testnet), and a callback that runs out becomes FAILED (anyone can `retryTrigger`). PR 4's fork tests measure the gas of `trigger()` → launch. If it is over the cap, auto-launch cannot work and the launch button is the path.

---

## Step 4 (PR 3): `TugLauncherFactory` — Thu morning

Inherits `LauncherFactoryBase`. Implements `ITugLauncherFactory`.

| Function | Behaviour |
|---|---|
| `constructor(hub, guardian, beacon, pairedVaultFactory, tokenImpl, triggerService)` | the Trigger Service address goes to every launcher (testnet `0x560E9830926C9e0EB98a59c6b9902383Fc0D9Eb2`) |
| `_newLauncher(creator, data)` | decode `TugConfig`, require canonical encoding; validate (paired vault factory, ranges, max bonus share 5000–10000, distinct non-zero captains, non-zero salt, `captainMinDeposit ≤ walletCap`, accept window and vesting ranges, `captainShareBps` range, `minRaise` clears the creation floor via the Portal's `graduationFloorV2`, so no game is created that can never launch); deploy beacon proxy; `initialize{value: msg.value}`; record game |
| `launcherDataSchema()` | field list |
| `upgradeVaultImplementation(impl)` | `onlyGuardian` |
| Views from Step 1 | `limits, defaultConfig, validateConfig, encodeConfig, predictToken, games…` |

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
| Views from Step 1 | `getVault`, `getStaker`, `getCaptain`, getters |

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

Factories cannot be changed after deployment, and a change means a new factory and a new Flap audit. Deploy once, after PRs 3 and 4 pass, with every config range final. Then ping Flap with both factory addresses: they approve testnet factories on request.

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
| 3 | Unopened factory cannot create a launcher |
| 3 | Only the named captains can call `depositCaptain`, once each, at or above the minimum |
| 3 | `contribute` reverts until both captains are in |
| 3 | After the accept window (counted from creation) `depositCaptain` reverts; `cancel` works with zero or one captain in, and a captain who deposited gets it back |
| 3 | No team switch, wallet cap enforced (captain deposits count toward it) |
| 3 | Early contribution earns more pull than equal late one |
| 3 | Overtime extends on lead flip in last 60 s, stops after 5 |
| 3 | Refund path when minimum missed, launch impossible |
| 3 | Second launch reverts |
| 3 | Base + bonus + captain allocations sum to the reserve within 1 token |
| 3 | Bonus respects max team share at a blowout |
| 3 | Captain allocations stay within 0.6% to 1.4% each; vesting is linear and nothing is claimable at launch |
| 4 | Full journey: create, deposits, both teams contribute, launch, trade so tax flows, claims, stake, reward claims |
| 4 | A post-launch buyer picks a side on first stake and cannot change it |
| 4 | Team pools receive tax by the fixed rope split, independent of how much is staked in each |
| 4 | An empty pool's part goes to the other pool; with both empty it is carried to the next sync |
| 4 | Vault accounting correct across a zero-value ping |
| 4 | Stranger launcher refused by vault factory |
| 4 | Auto-launch: a trigger at the deadline launches; a trigger during overtime requests again at the new deadline; a trigger below the minimum raise does nothing; a stale or foreign request id is ignored; only the Trigger Service can call `trigger` |
| 4 | Gas of `trigger()` → launch stays under the Trigger Service callback cap |

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

- Create only through `Portal.newLauncher`; factory audited and opened by Flap. Factories are immutable: a change means a new factory and a new audit.
- Factories inherit `LauncherFactoryBase` / `DirectLaunchVaultFactoryBase` (required by Flap).
- Launcher locks its own salt; factory never does.
- Token address ends in `7777`; never call the token before launch.
- One launch per launcher; `msg.value == poolQuote + creatorBuyQuote`.
- Whole reserve handed off in the launch transaction (≤ 1 token left).
- Tax ≤ 1000 bps each; `antiSniperMode = 0`.
- ≤ 4 fee slots, each type once, sum 10000; no VAULT + MARKETING.
- `minRaise` clears the creation floor, `$750 × multiplier × totalSupply / poolToken`: 2.15 tBNB on testnet at a 50% pool share and 1x multiplier. Below it the Portal reverts with `LaunchLiquidityTooLow`. Preview with `graduationFloorV2ForLauncher`.
- Native BNB quote enabled (`launchQuoteConfig`).
- Salt lock fee (0.005 tBNB on testnet, 0.01 BNB on mainnet) is lost if a game is cancelled.
- Trigger Service: `requestTrigger(uint64 executeAfter) payable` with the fee from `getFee()` (0.0002 tBNB on testnet, never hardcoded); callback `trigger(uint256)` checks `msg.sender == triggerService`; gas cap `getMaxCallbackGas()`; no cancel, no timing guarantee.
- Upgrades Guardian-only, ~24 h review: do not design around upgrades.

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
| 5 | 70% bonus cap? | Kept (comment resolved) |
| 6 | How does a game start? | Captain challenge and accept deposits; cancel and refund if B does not accept in time |
| 7 | Does Flap have to open our factory? | Yes. An unopened factory is refused; Flap opens it with `setLauncherFactoryMultiplier(factory, 10000, true)` (platform constraints) |
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
| 18 | Trigger Service auto-launch? | Yes, built into the launcher in PR 3, with the launch button kept as the fallback |
| 19 | Must one captain deposit first? | No. Either named captain can go first; the first deposit is the challenge, the second the accept |
| 20 | When does the accept window start? | At game creation. Both captains must deposit within it, or the game can be cancelled |

## Open questions

None. Every question that blocks code is settled.