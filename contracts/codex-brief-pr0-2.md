# Codex brief: PRs 0–2 (setup, interfaces, TugMath)

You are implementing the first three PRs of Tug of War Launch, a two-team token launch on Flap Pool Launch, BSC testnet (chain 97), for the BNB Bangkok hackathon. The build window ends the morning of Friday 27 November 2026, so these three PRs are due Wednesday night.

**The spec is `contracts/tug-of-war-contract-plan.md`.** Read it in full first. This brief says what to build in each PR and what "done" means; the plan has the details. If the plan and this brief disagree, or the plan leaves something out, stop and ask in the PR description. Do not guess.

Claude reviews every PR against the plan. Nat runs `forge build` and `forge test` locally and merges.

---

## Ground rules (all PRs)

- One PR per step, branched from `main`: `pr0-setup`, `pr1-interfaces`, `pr2-tugmath`. PR 1 and PR 2 may branch from PR 0 if it is not merged yet.
- The Foundry project lives in `contracts/`. All paths below are relative to `contracts/`.
- Solidity `^0.8.24` (match Flap's example if it pins a higher 0.8.x), Foundry, `forge fmt` clean.
- Custom errors only, no `require` strings.
- `src/flap/` is Flap's code, copied unchanged. Never edit it.
- Build only what the plan's Steps 0–2 describe. Do **not** add: underdog boost, market-cap handicap, challenge board, X Verifier, Trigger Service, Token Locker, VaultEX. They are out of scope.
- Never deploy, broadcast, or use a private key. No `.env` committed; add `.env.example` instead.
- Every PR description has: what changed, how to test, the `forge build` / `forge test` output, and a "Deviations from the plan" section (write "None" if none).

---

## PR 0: setup (`pr0-setup`)

Goal: a clean Foundry project with Flap's base contracts, and proof that Flap's own fork tests pass against BSC testnet.

1. `forge init` in `contracts/` without the sample `Counter` files. Keep `tug-of-war-contract-plan.md` and this brief where they are.
2. From `https://github.com/flap-sh/FlapPoolLaunchVaultExample` (default branch), copy into `src/flap/`, unchanged, every Flap base contract, interface and library the Tug contracts will inherit or call, including at least:
   - `LauncherBase`, `LauncherFactoryBase`, `IStrategy`
   - `DirectLaunchVaultBase`, `DirectLaunchVaultFactoryBase`
   - the Portal interfaces, `LaunchExtensionHelper`, and the types they use
   Keep SPDX headers. Do not copy the Crowd / StakeMine examples into `src/`; they are references only.
3. Add `src/flap/README.md` naming the source repo, the exact commit hash copied from, and the file list.
4. Install the same dependencies (OpenZeppelin and anything else the example uses) at the same versions the example pins, with matching remappings.
5. `foundry.toml`: `rpc_endpoints.bsc_testnet = "${BSC_TESTNET_RPC_URL}"`. `.env.example` with `BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545`. `.gitignore` covers `out/`, `cache/`, `broadcast/`, `.env`.
6. Run Flap's own fork tests in a separate clone of their repo against the testnet RPC, and paste the summary into the PR description. They are not committed to our repo.
7. `README.md` stub in `contracts/`: prerequisites, `forge install`, `forge build`, `forge test`, and how to set the RPC.

**Done when:** a clean clone of our repo passes `forge build` from `contracts/` using only the README steps, `src/flap/` matches the recorded commit, and the PR description shows Flap's fork tests passing on BSC testnet.

---

## PR 1: frontend interfaces (`pr1-interfaces`)

Goal: every type, function, event and error the frontend needs, with no implementation. A separate frontend developer builds against these ABIs, so this PR is the handoff and its signatures must not change afterwards.

Build exactly what the plan's **Step 1** lists:

- `src/interfaces/TugTypes.sol`: `Team` and `Phase` constants libraries, and the structs `TugConfig`, `GameView`, `PlayerView`, `CaptainAllocView`, `RulesView`, plus the factory's `Limits` and the vault's `VaultView`, `StakerView`, `CaptainView`.
- `src/interfaces/ITugLauncher.sol`, `ITugLauncherFactory.sol`, `ITugVault.sol`: the functions, events and errors in the plan's tables.

Details that matter:

- Teams: `0 = NONE`, `1 = BLUE`, `2 = RED`. Phases: `0 = AWAITING_CAPTAINS`, `1 = BUY_IN`, `2 = AWAITING_LAUNCH`, `3 = REFUNDING`, `4 = LAUNCHED`, `5 = CANCELLED`. Shares in basis points (`10000 = 100%`).
- `TugConfig` field order exactly as in the plan: `name, symbol, meta, salt, duration, minRaise, walletCap, captainBlue, captainRed, vaultFactory, maxBonusShareBps, captainMinDeposit, acceptWindow, captainAllocBps, captainVestDuration, captainShareBps`.
- `GameView` must give the "waiting for captains" screen what it needs: which captains have deposited, the first deposit time, and the accept deadline. It has no boost or handicap fields.
- The launcher's `claimCaptain()` releases vested coins; the vault's `claimCaptain()` pays BNB tax. Say so in their NatSpec.
- Gates return `(bool ok, bytes4 reason)`, where `reason` is the selector of the custom error the write call would revert with.
- NatSpec on every function, event, error and struct field: units (wei, bps, seconds) and when it reverts.

Also in this PR:

- `abi/`: one command exports the ABIs of the three interfaces as JSON (for example `make abi` or `script/export-abi.sh` using `forge inspect`). Commit the generated files.
- `test/unit/Interfaces.t.sol`: a compile test that asserts the selectors of the key write functions and the one-call views.
- `docs/frontend-api.md`: the plan's "Calls per screen" table, expanded with each call's arguments, return fields and the errors to handle.

**Done when:** `forge build` and `forge test` pass, the ABI export is one command and its output is committed, and `docs/frontend-api.md` covers every screen: create game, waiting for captains, game page, after the clock, claim and stake.

---

## PR 2: TugMath (`pr2-tugmath`)

Goal: the pure math library shared by the launcher, the vault and the later OpenFour port.

Build `src/libraries/TugMath.sol` exactly as the plan's **Step 2** table lists: `timeWeightBps`, `pull`, `ropeBps`, `leader`, `finalBlueShareBps`, `split`, `playerBonus`, `baseShare`, `vested`.

Rules:

- Pure functions only. No storage, no Flap imports, no other project imports.
- Round down everywhere, so allocations never sum to more than the total. `split(amount, blueBps)` returns `red = amount − blue`, so it never loses or creates wei.
- `finalBlueShareBps` clamps the rope to `[10000 − maxBps, maxBps]`, except when one team has zero pull: then it returns 10000 or 0 (the other team takes everything).
- `ropeBps` returns 5000 when both pulls are zero. `leader` returns `NONE` on a tie.
- `timeWeightBps` is 20000 at `start`, falls linearly to 10000 at `end`, and stays 10000 after `end` (overtime).

Tests in `test/unit/TugMath.t.sol`, covering at least the plan's list:

- weight at start, at the deadline, mid-way, and in overtime
- zero pull on one side, equal pull, and a blowout hitting the cap
- captain split stays within 0.6% to 1.4% of supply at the default 2% pool and 70% cap
- vesting at 0, half and full duration
- fuzz tests: `split` parts always sum to `amount`; base and bonus shares summed over players never exceed their totals

**Done when:** `forge test` passes, including the fuzz tests at the default run count, and every function in the table is covered.

---

## Not in these PRs

The launcher, factories, vault, fork tests and scripts (plan Steps 3–7) come in later briefs. Three team decisions are still open for PR 3 (when the accept window starts, Trigger Service, and the captain share default). None of them changes PRs 0–2.
