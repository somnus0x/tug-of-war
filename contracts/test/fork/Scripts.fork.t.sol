// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPortal} from "src/flap/IPortal.sol";
import {LaunchVaultAddresses} from "src/flap/LaunchVaultAddresses.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";
import {GameView, Phase, Team} from "src/interfaces/TugTypes.sol";

import {CreateGame} from "../../script/CreateGame.s.sol";
import {DemoGame} from "../../script/DemoGame.s.sol";
import {Deploy} from "../../script/Deploy.s.sol";
import {MineSalt} from "../../script/MineSalt.s.sol";
import {TugTestnet} from "../../script/TugTestnet.sol";
import {IPortalProxyAdmin} from "./TugBase.sol";

string constant FORK_DEPLOYMENT_PATH = "./deployments/97-fork-test.json";

contract ForkDeploy is Deploy {
    function _deploymentPath() internal pure override returns (string memory) {
        return FORK_DEPLOYMENT_PATH;
    }
}

contract ScriptsForkTest is Test {
    string private constant CREATOR_KEY = "CREATOR_PRIVATE_KEY";
    string private constant BLUE_CAPTAIN_KEY = "CAPTAIN_BLUE_PRIVATE_KEY";
    string private constant RED_CAPTAIN_KEY = "CAPTAIN_RED_PRIVATE_KEY";
    string private constant BLUE_PLAYER_1_KEY = "BLUE_PLAYER_1_PRIVATE_KEY";
    string private constant BLUE_PLAYER_2_KEY = "BLUE_PLAYER_2_PRIVATE_KEY";
    string private constant RED_PLAYER_1_KEY = "RED_PLAYER_1_PRIVATE_KEY";
    string private constant RED_PLAYER_2_KEY = "RED_PLAYER_2_PRIVATE_KEY";

    ITugLauncher private game;
    Deploy.Deployment private deployed;
    CreateGame private createGame;
    DemoGame private demo;
    address[6] private participants;

    function test_RunDeployAndDemoScriptsOnBscTestnet() public {
        if (bytes(vm.envOr("BSC_TESTNET_RPC_URL", string(""))).length == 0) {
            vm.skip(true);
            return;
        }
        vm.createSelectFork("bsc_testnet");
        assertEq(block.chainid, TugTestnet.CHAIN_ID);
        emit log_named_uint("BSC testnet fork block", block.number);

        address deployer = _fund("DEPLOYER_PRIVATE_KEY", 1, 1 ether);
        _fund(CREATOR_KEY, 2, 1 ether);
        participants[0] = _fund(BLUE_PLAYER_1_KEY, 3, 3 ether);
        participants[1] = _fund(BLUE_PLAYER_2_KEY, 4, 3 ether);
        participants[2] = _fund(RED_PLAYER_1_KEY, 5, 3 ether);
        participants[3] = _fund(RED_PLAYER_2_KEY, 6, 3 ether);
        participants[4] = _fund(BLUE_CAPTAIN_KEY, 7, 1 ether);
        participants[5] = _fund(RED_CAPTAIN_KEY, 8, 1 ether);
        _fund("TRADER_PRIVATE_KEY", 9, 0.15 ether);

        // Execute the Solidity script entrypoints without subjecting the script containers to the EIP-170 size limit.
        ForkDeploy deploy = ForkDeploy(address(0xD001));
        createGame = CreateGame(address(0xD002));
        demo = DemoGame(address(0xD003));
        vm.etch(address(deploy), vm.getDeployedCode("Scripts.fork.t.sol:ForkDeploy"));
        vm.etch(address(createGame), vm.getDeployedCode("CreateGame.s.sol:CreateGame"));
        vm.etch(address(demo), vm.getDeployedCode("DemoGame.s.sol:DemoGame"));
        vm.allowCheatcodes(address(deploy));
        vm.allowCheatcodes(address(createGame));
        vm.allowCheatcodes(address(demo));

        deployed = abi.decode(_run("Deploy.run", address(deploy), abi.encodeCall(Deploy.run, ())), (Deploy.Deployment));
        _assertAndRemoveDeploymentFile(deployer);
        _openFactories();
        vm.setEnv("TUG_LAUNCHER_FACTORY", vm.toString(address(deployed.launcherFactory)));

        _realGame();
        _cancelGame();
        _refundGame();
    }

    function _realGame() private {
        _configure("Tug Main", 0.1 ether, 120);
        vm.setEnv("DEPOSIT_CAPTAINS", "true");
        vm.setEnv("GAME_MODE", "launch");

        MineSalt mine = new MineSalt();
        (bytes32 salt, address prediction) =
            abi.decode(_run("MineSalt.run", address(mine), abi.encodeCall(MineSalt.run, ())), (bytes32, address));
        assertEq(uint16(uint160(prediction)), 0x7777);
        assertEq(prediction, deployed.launcherFactory.predictToken(salt));
        vm.setEnv("SALT", vm.toString(salt));
        _create("CreateGame.run real game");
        GameView memory state = game.getGame();
        assertEq(state.config.salt, salt);
        assertEq(state.config.duration, 180);
        assertEq(state.config.acceptWindow, 120);
        uint256 floor = deployed.launcherFactory.limits().minRaiseFloor;
        assertGe(state.config.minRaise * 100, floor * 105);
        assertEq(state.config.minRaise % 0.01 ether, 0);
        assertEq(state.raised, 0.2 ether);

        uint256 remaining = state.config.minRaise - state.raised;
        uint256 perWallet = remaining / 4;
        _amounts(perWallet, perWallet, perWallet, remaining - 3 * perWallet);
        vm.setEnv("GAME_MODE", "refund");
        vm.expectRevert(
            abi.encodeWithSelector(
                DemoGame.RefundRehearsalWouldMeetMinimum.selector, state.config.minRaise, state.config.minRaise
            )
        );
        demo.contribute();
        assertEq(game.raised(), state.raised);

        vm.setEnv("GAME_MODE", "launch");
        _phase("DemoGame.contribute real game", DemoGame.contribute.selector);
        assertEq(game.raised(), game.minRaise());
        vm.warp(game.deadline());
        _phase("DemoGame.launch", DemoGame.launch.selector);
        assertEq(game.token(), prediction);
        assertGt(game.pool().code.length, 0);

        ITugVault vault = ITugVault(game.vault());
        _phase("DemoGame.claimAndStake", DemoGame.claimAndStake.selector);
        for (uint256 i; i < participants.length; ++i) {
            assertGt(vault.stakeOf(participants[i]), 0);
            assertEq(vault.stakerTeam(participants[i]), i == 0 || i == 1 || i == 4 ? Team.BLUE : Team.RED);
        }

        vm.setEnv("TRADE_ROUNDS", "5");
        _phase("DemoGame.tradeAndDispatch", DemoGame.tradeAndDispatch.selector);
        emit log_named_uint("Demo vault native balance (wei)", address(vault).balance);
        assertGt(address(vault).balance, 0);
        uint256[6] memory previous;
        for (uint256 i; i < participants.length; ++i) {
            previous[i] = participants[i].balance;
            assertGt(vault.pendingRewards(participants[i]), 0);
        }
        assertGt(vault.pendingCaptain(participants[4]), 0);
        assertGt(vault.pendingCaptain(participants[5]), 0);
        _phase("DemoGame.claimRewards", DemoGame.claimRewards.selector);
        for (uint256 i; i < participants.length; ++i) {
            assertGt(participants[i].balance, previous[i]);
            assertEq(vault.pendingRewards(participants[i]), 0);
        }
        assertGt(vault.getCaptain(participants[4]).claimed, 0);
        assertGt(vault.getCaptain(participants[5]).claimed, 0);
        assertEq(game.getCaptain(participants[4]).claimed, 0);
        assertEq(game.getCaptain(participants[5]).claimed, 0);
    }

    function _cancelGame() private {
        _configure("Tug Cancel", 0.015 ether, 60);
        vm.setEnv("DEPOSIT_CAPTAINS", "false");
        vm.setEnv("CAPTAIN_DEPOSIT_TEAM", "blue");
        _create("CreateGame.run cancel game");
        GameView memory state = game.getGame();
        assertEq(state.acceptDeadline, block.timestamp + 60);
        uint256 before = participants[4].balance;
        _phase("DemoGame.deposits blue only", DemoGame.deposits.selector);
        assertTrue(game.captainIn(Team.BLUE));
        assertFalse(game.captainIn(Team.RED));
        assertEq(participants[4].balance, before - 0.015 ether);
        vm.expectRevert(ITugLauncher.AcceptWindowOpen.selector);
        demo.cancel();
        vm.warp(state.acceptDeadline);
        _phase("DemoGame.cancel", DemoGame.cancel.selector);
        assertEq(game.phase(), Phase.CANCELLED);
        assertEq(participants[4].balance, before);
    }

    function _refundGame() private {
        _configure("Tug Refund", 0.015 ether, 120);
        vm.setEnv("DEPOSIT_CAPTAINS", "false");
        vm.setEnv("CAPTAIN_DEPOSIT_TEAM", "both");
        vm.setEnv("GAME_MODE", "refund");
        _create("CreateGame.run refund game");
        uint256[6] memory before;
        for (uint256 i; i < participants.length; ++i) {
            before[i] = participants[i].balance;
        }
        _phase("DemoGame.deposits both", DemoGame.deposits.selector);
        _amounts(0.01 ether, 0.01 ether, 0.005 ether, 0.005 ether);
        _phase("DemoGame.contribute refund game", DemoGame.contribute.selector);
        assertEq(game.raised(), 0.06 ether);
        demo.contribute();
        assertEq(game.raised(), 0.06 ether);

        uint64 deadline = game.deadline();
        vm.setEnv("OVERTIME_TEAM", "red");
        vm.setEnv("OVERTIME_AMOUNT", vm.toString(uint256(0.04 ether)));
        vm.expectRevert(DemoGame.OvertimePreviewRejected.selector);
        demo.overtime();
        vm.warp(deadline - 40);
        _phase("DemoGame.overtime", DemoGame.overtime.selector);
        assertEq(game.deadline(), deadline + 30);
        assertEq(game.raised(), 0.1 ether);
        assertGt(game.getGame().pullByTeam.red, game.getGame().pullByTeam.blue);

        vm.warp(game.deadline());
        _phase("DemoGame.refund", DemoGame.refund.selector);
        assertEq(address(game).balance, 0);
        for (uint256 i; i < participants.length; ++i) {
            assertEq(participants[i].balance, before[i]);
        }
    }

    function _configure(string memory name, uint256 captainDeposit, uint256 acceptWindow) private {
        vm.setEnv("TOKEN_NAME", name);
        vm.setEnv("TOKEN_SYMBOL", "TUG");
        vm.setEnv("TOKEN_META", "QmTug");
        vm.setEnv("CAPTAIN_BLUE", vm.toString(participants[4]));
        vm.setEnv("CAPTAIN_RED", vm.toString(participants[5]));
        vm.setEnv("DURATION", "180");
        vm.setEnv("ACCEPT_WINDOW", vm.toString(acceptWindow));
        vm.setEnv("MIN_RAISE", "");
        vm.setEnv("WALLET_CAP", vm.toString(uint256(3 ether)));
        vm.setEnv("CAPTAIN_MIN_DEPOSIT", vm.toString(captainDeposit));
        vm.setEnv("SALT", "");
        vm.setEnv("SALT_SEED", vm.toString(keccak256(abi.encode(name, address(deployed.launcherFactory)))));
    }

    function _amounts(uint256 blue1, uint256 blue2, uint256 red1, uint256 red2) private {
        vm.setEnv("BLUE_PLAYER_1_AMOUNT", vm.toString(blue1));
        vm.setEnv("BLUE_PLAYER_2_AMOUNT", vm.toString(blue2));
        vm.setEnv("RED_PLAYER_1_AMOUNT", vm.toString(red1));
        vm.setEnv("RED_PLAYER_2_AMOUNT", vm.toString(red2));
    }

    function _openFactories() private {
        IPortal portal = IPortal(LaunchVaultAddresses.hub());
        address admin = IPortalProxyAdmin(TugTestnet.PORTAL_PROXY_ADMIN).owner();
        vm.startPrank(admin);
        portal.setCreationPaused(true);
        portal.setLauncherFactoryMultiplier(address(deployed.launcherFactory), 10_000, true);
        portal.setVaultFactoryMultiplier(address(deployed.vaultFactory), 10_000, true);
        vm.stopPrank();
    }

    function _assertAndRemoveDeploymentFile(address deployer) private {
        string memory json = vm.readFile(FORK_DEPLOYMENT_PATH);
        vm.removeFile(FORK_DEPLOYMENT_PATH);
        assertEq(vm.parseJsonUint(json, ".chainId"), TugTestnet.CHAIN_ID);
        assertEq(vm.parseJsonUint(json, ".blockNumber"), block.number);
        assertEq(vm.parseJsonAddress(json, ".deployer"), deployer);
        assertEq(vm.parseJsonAddress(json, ".launcherFactory"), address(deployed.launcherFactory));
        assertEq(vm.parseJsonAddress(json, ".vaultFactory"), address(deployed.vaultFactory));
        assertEq(vm.parseJsonAddress(json, ".launcherBeacon"), address(deployed.launcherBeacon));
        assertEq(vm.parseJsonAddress(json, ".vaultBeacon"), address(deployed.vaultFactory.beacon()));
        assertEq(vm.parseJsonAddress(json, ".launcherImplementation"), address(deployed.launcherImplementation));
        assertEq(vm.parseJsonAddress(json, ".vaultImplementation"), deployed.vaultFactory.beacon().implementation());
    }

    function _fund(string memory name, uint256 accountIndex, uint256 amount) private returns (address account) {
        uint256 key = uint256(keccak256(abi.encode("Tug scripts fork-only test wallet", accountIndex)));
        vm.setEnv(name, vm.toString(key));
        account = vm.addr(key);
        vm.deal(account, amount);
    }

    function _create(string memory name) private {
        bytes memory result = _run(name, address(createGame), abi.encodeCall(CreateGame.run, ()));
        game = ITugLauncher(abi.decode(result, (address)));
        vm.setEnv("TUG_LAUNCHER", vm.toString(address(game)));
    }

    function _phase(string memory name, bytes4 selector) private {
        _run(name, address(demo), abi.encodePacked(selector));
    }

    function _run(string memory name, address target, bytes memory data) private returns (bytes memory result) {
        uint256 before = gasleft();
        (bool ok, bytes memory response) = target.call(data);
        emit log_named_uint(string.concat(name, " fork gas"), before - gasleft());
        if (!ok) {
            assembly ("memory-safe") {
                revert(add(response, 32), mload(response))
            }
        }
        return response;
    }
}
