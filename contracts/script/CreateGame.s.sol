// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console2} from "forge-std/console2.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {IPortal} from "src/flap/IPortal.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {Limits, TugConfig} from "src/interfaces/TugTypes.sol";

import {TugScript} from "./TugScript.sol";
import {TugScriptErrors} from "./TugScriptErrors.sol";

contract CreateGame is TugScript {
    uint256 private constant FUNDING_STEP = 0.01 ether;

    function run() external returns (ITugLauncher game) {
        ITugLauncherFactory factory = _factory();
        TugConfig memory config = _config(factory);
        bool depositCaptains = vm.envOr("DEPOSIT_CAPTAINS", false);

        Signer memory blue;
        Signer memory red;
        if (depositCaptains) {
            blue = _signer("CAPTAIN_BLUE_PRIVATE_KEY");
            red = _signer("CAPTAIN_RED_PRIVATE_KEY");
            if (config.captainBlue == address(0)) config.captainBlue = blue.account;
            if (config.captainRed == address(0)) config.captainRed = red.account;
            if (blue.account != config.captainBlue || red.account != config.captainRed) {
                TugScriptErrors.check(false, ITugLauncher.NotCaptain.selector);
            }
        }

        (bool ok, bytes4 reason) = factory.validateConfig(config);
        TugScriptErrors.check(ok, reason);

        Signer memory creator = _signer("CREATOR_PRIVATE_KEY");
        IPortal portal = IPortal(factory.portal());
        uint256 fee = portal.SALT_LOCK_FEE();
        console2.log("Live salt lock fee (wei)", fee);
        if (depositCaptains) {
            _requireBalance(blue, config.captainMinDeposit + (blue.account == creator.account ? fee : 0));
            _requireBalance(red, config.captainMinDeposit + (red.account == creator.account ? fee : 0));
        }
        bytes memory data = factory.encodeConfig(config);
        game = ITugLauncher(
            abi.decode(
                _send(creator, address(portal), abi.encodeCall(IPortal.newLauncher, (address(factory), data)), fee),
                (address)
            )
        );
        console2.log("Simulated launcher", address(game));
        console2.log(string.concat("export TUG_LAUNCHER=", vm.toString(address(game))));

        if (depositCaptains) {
            _checkCaptain(game, blue, config.captainBlue, config.captainMinDeposit);
            _checkCaptain(game, red, config.captainRed, config.captainMinDeposit);
            _deposit(game, blue, config.captainMinDeposit);
            _deposit(game, red, config.captainMinDeposit);
        }
        _printClocks(game);
    }

    function _config(ITugLauncherFactory factory) private view returns (TugConfig memory config) {
        config = factory.defaultConfig();
        Limits memory limits = factory.limits();
        TugScriptErrors.check(limits.creationFloorAvailable, ITugLauncherFactory.CreationFloorUnavailable.selector);

        uint256 duration = vm.envOr("DURATION", uint256(config.duration));
        uint256 acceptWindow = vm.envOr("ACCEPT_WINDOW", uint256(2 minutes));
        TugScriptErrors.check(duration <= type(uint64).max, ITugLauncherFactory.DurationOutOfRange.selector);
        TugScriptErrors.check(acceptWindow <= type(uint64).max, ITugLauncherFactory.AcceptWindowOutOfRange.selector);
        config.duration = uint64(duration);
        config.acceptWindow = uint64(acceptWindow);
        config.captainMinDeposit = vm.envOr("CAPTAIN_MIN_DEPOSIT", uint256(0.1 ether));
        config.name = vm.envOr("TOKEN_NAME", config.name);
        config.symbol = vm.envOr("TOKEN_SYMBOL", config.symbol);
        config.meta = vm.envOr("TOKEN_META", config.meta);
        config.captainBlue = vm.envOr("CAPTAIN_BLUE", config.captainBlue);
        config.captainRed = vm.envOr("CAPTAIN_RED", config.captainRed);
        config.walletCap = vm.envOr("WALLET_CAP", config.walletCap);

        uint256 bufferedFloor =
            FixedPointMathLib.fullMulDivUp(limits.minRaiseFloor, 105, 100 * FUNDING_STEP) * FUNDING_STEP;
        if (bufferedFloor == 0) bufferedFloor = FUNDING_STEP;
        string memory configuredMinRaise = vm.envOr("MIN_RAISE", string(""));
        config.minRaise = bytes(configuredMinRaise).length == 0 ? bufferedFloor : vm.parseUint(configuredMinRaise);
        console2.log("Live creation floor (wei)", limits.minRaiseFloor);
        console2.log("Selected minimum raise (wei)", config.minRaise);

        string memory configuredSalt = vm.envOr("SALT", string(""));
        if (bytes(configuredSalt).length == 0) (config.salt,) = _mineSalt(factory);
        else config.salt = vm.parseBytes32(configuredSalt);
    }
}
