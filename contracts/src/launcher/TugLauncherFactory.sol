// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ClonesUpgradeable} from "@openzeppelin-contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";

import {IPortal, IPortalTypes} from "src/flap/IPortal.sol";
import {FieldDescriptor, LauncherDataSchema} from "src/flap/IVaultSchemas.sol";
import {LauncherFactoryBase} from "src/flap/LauncherFactoryBase.sol";
import {IPortalFloor} from "src/interfaces/IPortalFloor.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {BpsRange, DurationRange, Limits, TugConfig} from "src/interfaces/TugTypes.sol";
import {TugMath} from "src/libraries/TugMath.sol";

import {TUG_POOL_TOKEN, TUG_TOTAL_SUPPLY, TugLauncher} from "./TugLauncher.sol";

contract TugLauncherFactory is LauncherFactoryBase, ITugLauncherFactory {
    uint8 private constant LAUNCH_KIND = uint8(IPortalTypes.LaunchKind.DIRECT_V2_POOL_TAX);

    address public immutable portal;
    address public immutable pairedVaultFactory;
    address public immutable tokenImplementation;
    address private immutable _guardian;
    address private immutable _triggerService;
    UpgradeableBeacon private immutable _beacon;

    mapping(address => bool) public isLauncher;
    address[] private _games;
    mapping(address => address[]) private _captainGames;

    error InvalidFactorySetup();
    error GameIndexOutOfRange();

    /// @param beacon Beacon already owned by this factory so only its Guardian can upgrade launchers.
    constructor(
        address hub,
        address guardian,
        address beacon,
        address vaultFactory,
        address tokenImpl,
        address service
    ) {
        if (
            hub == address(0) || guardian == address(0) || vaultFactory == address(0) || tokenImpl == address(0)
                || service == address(0) || beacon.code.length == 0
        ) revert InvalidFactorySetup();

        _beacon = UpgradeableBeacon(beacon);
        if (_beacon.owner() != address(this)) revert InvalidFactorySetup();
        portal = hub;
        _guardian = guardian;
        pairedVaultFactory = vaultFactory;
        tokenImplementation = tokenImpl;
        _triggerService = service;
    }

    function limits() external view returns (Limits memory configLimits) {
        configLimits = _configRanges();
        (configLimits.creationFloorAvailable, configLimits.minRaiseFloor) = _creationFloor();
    }

    function defaultConfig() external view returns (TugConfig memory config) {
        config.duration = 3 minutes;
        config.vaultFactory = pairedVaultFactory;
        config.maxBonusShareBps = 7_000;
        config.acceptWindow = 1 hours;
        config.captainAllocBps = 200;
        config.captainVestDuration = 30 days;
        config.captainShareBps = 2_000;
    }

    function validateConfig(TugConfig calldata config) external view returns (bool ok, bytes4 reason) {
        reason = _validate(config);
        return (reason == bytes4(0), reason);
    }

    function encodeConfig(TugConfig calldata config) external pure returns (bytes memory) {
        return abi.encode(config);
    }

    function predictToken(bytes32 salt) public view returns (address) {
        return ClonesUpgradeable.predictDeterministicAddress(tokenImplementation, salt, portal);
    }

    function gamesCount() external view returns (uint256) {
        return _games.length;
    }

    function gameAt(uint256 index) external view returns (address) {
        if (index >= _games.length) revert GameIndexOutOfRange();
        return _games[index];
    }

    function gamesOf(address captain) external view returns (address[] memory) {
        return _captainGames[captain];
    }

    function launcherDataSchema() external pure override returns (LauncherDataSchema memory schema) {
        schema.description =
            "Create a two-team tug of war. Early contributions have more pull. The final rope splits rewards.";
        FieldDescriptor[] memory fields = new FieldDescriptor[](16);
        fields[0] = FieldDescriptor("name", "string", "Token name", 0);
        fields[1] = FieldDescriptor("symbol", "string", "Token symbol", 0);
        fields[2] = FieldDescriptor("meta", "string", "Token metadata IPFS CID", 0);
        fields[3] = FieldDescriptor("salt", "bytes32", "Token salt with a predicted address ending in 7777", 0);
        fields[4] = FieldDescriptor("duration", "uint64", "Buy-in period in seconds", 0);
        fields[5] = FieldDescriptor("minRaise", "uint256", "Minimum BNB raise", 18);
        fields[6] = FieldDescriptor("walletCap", "uint256", "Maximum BNB per wallet", 18);
        fields[7] = FieldDescriptor("captainBlue", "address", "Blue team's captain", 0);
        fields[8] = FieldDescriptor("captainRed", "address", "Red team's captain", 0);
        fields[9] = FieldDescriptor("vaultFactory", "address", "Paired Tug vault factory", 0);
        fields[10] = FieldDescriptor("maxBonusShareBps", "uint16", "Maximum team bonus share in basis points", 0);
        fields[11] = FieldDescriptor("captainMinDeposit", "uint256", "Minimum BNB deposit per captain", 18);
        fields[12] = FieldDescriptor("acceptWindow", "uint64", "Captain deposit window in seconds from creation", 0);
        fields[13] = FieldDescriptor("captainAllocBps", "uint16", "Captain token allocation in basis points", 0);
        fields[14] = FieldDescriptor("captainVestDuration", "uint64", "Captain vesting period in seconds", 0);
        fields[15] = FieldDescriptor("captainShareBps", "uint16", "Captain share of vault revenue in basis points", 0);
        schema.fields = fields;
    }

    function upgradeVaultImplementation(address implementation) external override onlyGuardian {
        _beacon.upgradeTo(implementation);
    }

    function _newLauncher(address creator, bytes calldata data) internal override returns (address launcher) {
        TugConfig memory config = abi.decode(data, (TugConfig));
        if (keccak256(abi.encode(config)) != keccak256(data)) revert NonCanonicalConfig();
        bytes4 reason = _validate(config);
        if (reason != bytes4(0)) {
            assembly ("memory-safe") {
                mstore(0, reason)
                revert(0, 4)
            }
        }

        launcher = LibClone.deployDeterministicERC1967BeaconProxy(address(_beacon), config.salt);
        TugLauncher(launcher).initialize{value: msg.value}(portal, creator, config, _triggerService);
        isLauncher[launcher] = true;
        _games.push(launcher);
        _captainGames[config.captainBlue].push(launcher);
        _captainGames[config.captainRed].push(launcher);
        emit TugLauncherCreated(launcher, creator, config.captainBlue, config.captainRed, config.salt);
    }

    function _validate(TugConfig memory config) internal view returns (bytes4) {
        if (config.vaultFactory != pairedVaultFactory) return InvalidVaultFactory.selector;
        if (
            config.captainBlue == address(0) || config.captainRed == address(0)
                || config.captainBlue == config.captainRed
        ) {
            return InvalidCaptains.selector;
        }
        if (config.salt == bytes32(0) || uint16(uint160(predictToken(config.salt))) != 0x7777) {
            return InvalidSalt.selector;
        }

        Limits memory ranges = _configRanges();
        if (!_inRange(config.duration, ranges.duration.min, ranges.duration.max)) return DurationOutOfRange.selector;
        if (!_inRange(config.acceptWindow, ranges.acceptWindow.min, ranges.acceptWindow.max)) {
            return AcceptWindowOutOfRange.selector;
        }
        if (!_inRange(config.captainVestDuration, ranges.captainVestDuration.min, ranges.captainVestDuration.max)) {
            return CaptainVestDurationOutOfRange.selector;
        }
        if (!_inRange(config.maxBonusShareBps, ranges.maxBonusShareBps.min, ranges.maxBonusShareBps.max)) {
            return MaxBonusShareOutOfRange.selector;
        }
        if (!_inRange(config.captainAllocBps, ranges.captainAllocBps.min, ranges.captainAllocBps.max)) {
            return CaptainAllocOutOfRange.selector;
        }
        if (!_inRange(config.captainShareBps, ranges.captainShareBps.min, ranges.captainShareBps.max)) {
            return CaptainShareOutOfRange.selector;
        }

        if (config.walletCap == 0) return InvalidWalletCap.selector;
        if (config.captainMinDeposit > config.walletCap) return CaptainDepositExceedsWalletCap.selector;
        if (config.minRaise == 0) return ZeroMinRaise.selector;
        (bool available, uint256 floor) = _creationFloor();
        if (!available) return CreationFloorUnavailable.selector;
        if (config.minRaise < floor) return MinRaiseBelowCreationFloor.selector;
        return bytes4(0);
    }

    function _creationFloor() private view returns (bool available, uint256 floor) {
        IPortalFloor floorPortal = IPortalFloor(portal);
        uint256 price;
        try floorPortal.launchQuoteConfig(LAUNCH_KIND, address(0)) returns (bool enabled, uint256 quotePriceUsd) {
            if (!enabled || quotePriceUsd == 0) return (false, 0);
            price = quotePriceUsd;
        } catch {
            return (false, 0);
        }

        (bool hasMultiplier, uint16 multiplier) = _floorMultiplier(floorPortal);
        if (!hasMultiplier) return (false, 0);
        IPortalFloor.GraduationFloorParams memory params =
            IPortalFloor.GraduationFloorParams(address(0), price, 0, TUG_POOL_TOKEN, TUG_TOTAL_SUPPLY, address(0));
        try floorPortal.graduationFloorV2(params) returns (IPortalFloor.GraduationFloorResultV2 memory base) {
            uint256 scaledUsdFloor = FixedPointMathLib.fullMulDiv(base.createFloorUsdWad, multiplier, TugMath.BPS);
            return (true, FixedPointMathLib.fullMulDivUp(scaledUsdFloor, 1 ether, price));
        } catch {
            return (false, 0);
        }
    }

    function _floorMultiplier(IPortalFloor floorPortal) private view returns (bool available, uint16 multiplier) {
        try floorPortal.vaultFactoryMultiplier(pairedVaultFactory) returns (bool enabled, uint16 bps) {
            if (enabled) return (true, bps);
        } catch {
            return (false, 0);
        }
        try IPortal(portal).launcherFactoryMultiplier(address(this)) returns (bool enabled, uint16 bps) {
            return (true, enabled ? bps : TugMath.BPS);
        } catch {
            return (false, 0);
        }
    }

    function _configRanges() private pure returns (Limits memory ranges) {
        ranges.duration = DurationRange(60 seconds, 7 days);
        ranges.acceptWindow = DurationRange(60 seconds, 1 days);
        ranges.captainVestDuration = DurationRange(1 days, 90 days);
        ranges.maxBonusShareBps = BpsRange(5_000, 10_000);
        ranges.captainAllocBps = BpsRange(0, 500);
        ranges.captainShareBps = BpsRange(0, 5_000);
    }

    function _inRange(uint256 value, uint256 min, uint256 max) private pure returns (bool) {
        return value >= min && value <= max;
    }

    function _getHub() internal view override returns (address) {
        return portal;
    }

    function _getGuardian() internal view override returns (address) {
        return _guardian;
    }
}
