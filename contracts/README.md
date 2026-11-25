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
