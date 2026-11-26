# Tug of War Launch contracts

Install Git and Foundry. Forge installs Solidity 0.8.26 on the first build. [Foundry installation](https://getfoundry.sh/)

From the repo root, run the following commands.

```sh
cd contracts
forge install
forge build
forge test
```

The dependency submodules use Flap's exact commits. [Vendored Flap contracts](src/flap/README.md)

For BSC testnet fork work, copy `.env.example` to `.env` and set `BSC_TESTNET_RPC_URL` to a BSC testnet endpoint. Forge loads `.env` from `contracts/` and exposes the endpoint as `bsc_testnet`. The local build and unit tests need no RPC.

## BSC testnet runbook for Nat

Work from `contracts/` after running the setup above. Nat runs the commands with `--broadcast`.

### 1. Prepare the wallets and RPC

Copy the environment template and use testnet-only wallets. Fill in the RPC and the public captain addresses. Fill in the signer variables and the Etherscan API key after the fork check in step 2. The four player wallets and the two captain wallets are distinct. Use a separate wallet for the trader.

```sh
cp .env.example .env
chmod 600 .env
```

Set `TOKEN_NAME`, `TOKEN_SYMBOL` and `TOKEN_META` (an IPFS metadata CID), and set `WALLET_CAP` in wei. Set wallet amounts in wei and durations in seconds. Keep optional variables commented out to use their defaults. Source the filled-in file from a private shell without shell tracing.

```sh
set -a
. ./.env
set +a
test "$(cast chain-id --rpc-url "$BSC_TESTNET_RPC_URL")" = 97
cast gas-price --rpc-url "$BSC_TESTNET_RPC_URL"
```

The wallet amounts below are tBNB on hand **before gas**. Set aside additional tBNB for each wallet based on the transactions it sends and the live gas price from `cast gas-price`.

| Wallet | Dry run on hand | Real game on hand |
|---|---:|---:|
| Deployer | Gas for the one deployment and pairing | Use the same factories |
| Creator | Two live salt lock fees (~0.010 total at the observed 0.005 fee), plus gas for both registrations and cancellation | One live salt fee (~0.005 at the observed fee), plus creation and launch gas |
| Blue captain | 0.015, reused after cancellation | 0.10 |
| Red captain | 0.015 | 0.10 |
| Blue player 1 | 0.010 | 0.60 in the example below |
| Blue player 2 | 0.010 | 0.55 in the example below |
| Red player 1 | 0.005 | 0.50 in the example below |
| Red player 2 | 0.045 including overtime | 0.41 in the example below |
| Trader | Gas and principal are only needed for the real game | Start with 0.15 working tBNB plus gas. Each buy needs 0.10 available. |

The dry run costs **two salt fees plus gas**. Cancel returns the sole captain's deposit and refund returns all 0.10 tBNB from the overtime game. The real game's raise goes into the pool. The observed floor was about 2.15 tBNB. `CreateGame` adds 5% rounded up to 0.01 tBNB by default, which made the target 2.26 tBNB at the observed wei floor of 2,142,857,142,857,142,858. After each full sell the trader recovers most of the buy. The earlier demo-size fork run spent about 0.017 tBNB net before gas.

### 2. Simulate the scripts

Run this with `BSC_TESTNET_RPC_URL` set. The test uses synthetic keys and fork balances and covers the full game, cancellation, overtime and refunds.

```sh
forge build
forge fmt --check
forge test --match-path test/fork/Scripts.fork.t.sol -vv
forge test
```

### 3. Deploy and verify once

Confirm the config ranges are final. Use a current Foundry release with Etherscan V2 support and set `ETHERSCAN_API_KEY`. Use the checked-in compiler profile, Solidity 0.8.26 with the optimizer at 200 runs and Cancun EVM. [Etherscan verification with Foundry](https://docs.etherscan.io/contract-verification/verify-with-foundry)

```sh
set -a
. ./.env
set +a
forge script script/Deploy.s.sol:Deploy --rpc-url "$BSC_TESTNET_RPC_URL" \
  --chain 97 --broadcast --slow --verify --verifier etherscan
```

After confirmed receipts, check that both factories have code and that the source verification succeeded. If verification fails after deployment, verify the existing addresses. Commit `deployments/97.json` and add the factory addresses to this README. The JSON records the script block, and Foundry's broadcast receipts record the blocks where the transactions landed. Use the reported launcher factory address for the rest of these steps.

```sh
export TUG_LAUNCHER_FACTORY='<launcher-factory-address>'
```

### 4. Send the addresses to Flap

Give Flap both factory addresses and ask them to open both at 10,000 bps. Ask for a 6,000,000-gas Trigger Service callback cap. Confirm whether a keeper calls `dispatch()` on testnet and whether the Token Dock rule covers user stakes. Use manual launch for this run.

### 5. Configure the web build

Set the repository Actions variables `VITE_TUG_FACTORY` to the launcher factory address and `VITE_FIXTURES` to `0`. Run the **Web** workflow on `main` and verify the published app shows chain 97.

### 6. Rehearse cancellation, overtime and refunds

Define these shortcuts in the current shell. The create command prints the launcher address and accept deadline. Replace the address placeholder with that address after each creation. Contribution amounts are per-wallet targets, so a retry sends only the amount still needed.

```sh
create_game() {
  forge script script/CreateGame.s.sol:CreateGame --rpc-url "$BSC_TESTNET_RPC_URL" --broadcast --slow
}
phase() {
  forge script script/DemoGame.s.sol:DemoGame --sig "$1" --rpc-url "$BSC_TESTNET_RPC_URL" --broadcast --slow
}
```

For **cancellation**, set the accept window to 60 seconds and deposit for Blue immediately after creation.

```sh
unset MIN_RAISE SALT SALT_SEED
export DURATION=180 ACCEPT_WINDOW=60 WALLET_CAP=1000000000000000000
export CAPTAIN_MIN_DEPOSIT=15000000000000000 DEPOSIT_CAPTAINS=false
create_game
export TUG_LAUNCHER='<cancel-game-address>'
CAPTAIN_DEPOSIT_TEAM=blue phase 'deposits()'
```

At or after the printed accept deadline, cancel and confirm the Blue captain's deposit came back.

```sh
phase 'cancel()'
```

For **overtime and refunds**, use a new game and both captains. These planned contributions include the 0.03 tBNB already raised by the deposits and keep the game below its configured minimum.

```sh
export ACCEPT_WINDOW=120 DEPOSIT_CAPTAINS=false GAME_MODE=refund
export BLUE_PLAYER_1_AMOUNT=10000000000000000 BLUE_PLAYER_2_AMOUNT=10000000000000000
export RED_PLAYER_1_AMOUNT=5000000000000000 RED_PLAYER_2_AMOUNT=5000000000000000
export OVERTIME_TEAM=red OVERTIME_AMOUNT=40000000000000000
create_game
export TUG_LAUNCHER='<refund-game-address>'
CAPTAIN_DEPOSIT_TEAM=both phase 'deposits()'
phase 'contribute()'
```

After the clock enters the final 60 seconds, ideally with 30–45 seconds remaining, run overtime. Confirm the deadline advanced by 30 seconds. At or after the extended deadline, refund both captains and all four players.

```sh
phase 'overtime()'
# Wait until the extended deadline.
phase 'refund()'
```

### 7. Launch the real game

Keep `MIN_RAISE` unset for the live floor plus the buffer. You can preview a salt and token address without sending a transaction. If you export the printed `SALT`, use it for this creation only. With `SALT` unset, `CreateGame` mines one automatically.

```sh
forge script script/MineSalt.s.sol:MineSalt --rpc-url "$BSC_TESTNET_RPC_URL"
export GAME_MODE=launch DEPOSIT_CAPTAINS=true CAPTAIN_MIN_DEPOSIT=100000000000000000
export DURATION=180 ACCEPT_WINDOW=120
create_game
export TUG_LAUNCHER='<real-game-address>'
```

Read the selected minimum from `CreateGame` and fund the players accordingly. The example below brings the raise to 2.26 tBNB including both 0.10 tBNB deposits. Increase the amounts and fund the wallets first if the selected minimum is higher, while staying within each wallet's cap.

```sh
export BLUE_PLAYER_1_AMOUNT=600000000000000000 BLUE_PLAYER_2_AMOUNT=550000000000000000
export RED_PLAYER_1_AMOUNT=500000000000000000 RED_PLAYER_2_AMOUNT=410000000000000000
phase 'contribute()'
# Wait until the displayed buy-in deadline.
phase 'launch()'
phase 'claimAndStake()'
phase 'tradeAndDispatch()'
phase 'claimRewards()'
```

Stake on both teams before trading so dispatch distributes new tax to both. The trader buys with 0.1 tBNB and sells the full amount bought per round, for up to `TRADE_ROUNDS` (default 5). Check the printed BNB delivered to the vault. If it is zero, replenish the trader's working balance if needed and run the phase again. `claimRewards()` pays available staker and captain BNB and logs the end of the captains' token vesting.

### 8. Record the result

Save the real game's launcher, token, pool and vault addresses and the relevant transaction links. The run is complete once the factories are deployed and opened, the dry run passes, the real game runs from creation through staking, trading tax reaches the vault, rewards are paid, and the addresses are listed here.
