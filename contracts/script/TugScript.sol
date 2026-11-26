// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {GameView} from "src/interfaces/TugTypes.sol";

import {TugScriptErrors} from "./TugScriptErrors.sol";
import {TugTestnet} from "./TugTestnet.sol";

abstract contract TugScript is Script {
    struct Signer {
        uint256 key;
        address account;
    }

    error WrongChain(uint256 chainId);
    error MissingContract(address target);
    error InvalidSigner(string variableName);
    error InsufficientBalance(address account, uint256 required, uint256 available);
    error SaltPredictionMismatch();

    function _requireTestnet() internal view {
        if (block.chainid != TugTestnet.CHAIN_ID) revert WrongChain(block.chainid);
    }

    function _requireCode(address target) internal view {
        if (target.code.length == 0) revert MissingContract(target);
    }

    function _signer(string memory variableName) internal view returns (Signer memory signer) {
        signer.key = vm.envUint(variableName);
        if (signer.key == 0 || signer.key >= 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141) {
            revert InvalidSigner(variableName);
        }
        signer.account = vm.addr(signer.key);
    }

    function _requireBalance(Signer memory signer, uint256 amount) internal view {
        uint256 available = signer.account.balance;
        if (available < amount) revert InsufficientBalance(signer.account, amount, available);
    }

    function _send(Signer memory signer, address target, bytes memory data, uint256 amount)
        internal
        returns (bytes memory result)
    {
        _requireCode(target);
        _requireBalance(signer, amount);
        vm.broadcast(signer.key);
        (bool ok, bytes memory response) = target.call{value: amount}(data);
        if (!ok) TugScriptErrors.fail(response);
        return response;
    }

    function _game() internal view returns (ITugLauncher game) {
        _requireTestnet();
        game = ITugLauncher(vm.envAddress("TUG_LAUNCHER"));
        _requireCode(address(game));
    }

    function _factory() internal view returns (ITugLauncherFactory factory) {
        _requireTestnet();
        factory = ITugLauncherFactory(vm.envAddress("TUG_LAUNCHER_FACTORY"));
        _requireCode(address(factory));
    }

    function _mineSalt(ITugLauncherFactory factory) internal view returns (bytes32 salt, address token) {
        bytes32 defaultSeed = keccak256(abi.encode(address(factory), factory.gamesCount()));
        (salt, token) = TugTestnet.mineSalt(factory, vm.envOr("SALT_SEED", defaultSeed));
        if (factory.predictToken(salt) != token) revert SaltPredictionMismatch();
    }

    function _checkCaptain(ITugLauncher game, Signer memory captain, address expected, uint256 amount) internal view {
        if (captain.account != expected) TugScriptErrors.check(false, ITugLauncher.NotCaptain.selector);
        (bool ok, bytes4 reason) = game.canDepositCaptain(captain.account, amount);
        TugScriptErrors.check(ok, reason);
        _requireBalance(captain, amount);
    }

    function _deposit(ITugLauncher game, Signer memory captain, uint256 amount) internal {
        _send(captain, address(game), abi.encodeCall(ITugLauncher.depositCaptain, ()), amount);
        console2.log("Simulated captain deposit (wei)", captain.account, amount);
    }

    function _printClocks(ITugLauncher game) internal view {
        GameView memory state = game.getGame();
        console2.log("Simulated accept deadline (Unix seconds)", state.acceptDeadline);
        if (state.deadline != 0) console2.log("Simulated buy-in deadline (Unix seconds)", state.deadline);
    }
}
