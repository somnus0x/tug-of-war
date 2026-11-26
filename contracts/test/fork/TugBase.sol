// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";

import {IPortal, IPortalTypes} from "src/flap/IPortal.sol";
import {LaunchVaultAddresses} from "src/flap/LaunchVaultAddresses.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";
import {TugConfig} from "src/interfaces/TugTypes.sol";
import {TugLauncher} from "src/launcher/TugLauncher.sol";
import {TugLauncherFactory} from "src/launcher/TugLauncherFactory.sol";
import {TugVaultFactory} from "src/vault/TugVaultFactory.sol";

import {TugTestnet} from "../../script/TugTestnet.sol";

interface IPortalProxyAdmin {
    function owner() external view returns (address);
}

abstract contract TugBase is Test {
    string private constant RPC_VARIABLE = "BSC_TESTNET_RPC_URL";
    address internal constant PORTAL_PROXY_ADMIN = TugTestnet.PORTAL_PROXY_ADMIN;
    address internal constant TRIGGER_SERVICE = TugTestnet.TRIGGER_SERVICE;
    uint8 internal constant LAUNCH_KIND = uint8(IPortalTypes.LaunchKind.DIRECT_V2_POOL_TAX);
    uint256 internal constant CAPTAIN_DEPOSIT = 0.1 ether;

    IPortal internal portal;
    address internal admin;
    TugLauncherFactory internal factory;
    TugVaultFactory internal vaultFactory;
    uint256 internal saltFee;

    address internal constant creator = address(0xA1);
    address internal constant blue = address(0xA2);
    address internal constant red = address(0xA3);
    address internal constant alice = address(0xA4);
    address internal constant bob = address(0xA5);

    function setUp() public {
        if (bytes(vm.envOr(RPC_VARIABLE, string(""))).length == 0) {
            vm.skip(true);
            return;
        }

        vm.createSelectFork("bsc_testnet");
        assertEq(block.chainid, TugTestnet.CHAIN_ID);
        emit log_named_uint("BSC testnet fork block", block.number);

        portal = IPortal(LaunchVaultAddresses.hub());
        admin = IPortalProxyAdmin(PORTAL_PROXY_ADMIN).owner();
        emit log_named_address("Portal admin", admin);
        saltFee = portal.SALT_LOCK_FEE();

        vaultFactory = new TugVaultFactory();
        factory = _deployLauncherFactory();
        vaultFactory.setLauncherFactory(address(factory));

        vm.label(creator, "Creator");
        vm.label(blue, "Blue captain");
        vm.label(red, "Red captain");
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.deal(creator, 20 ether);
        vm.deal(blue, 20 ether);
        vm.deal(red, 20 ether);
        vm.deal(alice, 20 ether);
        vm.deal(bob, 20 ether);

        vm.prank(admin);
        portal.setCreationPaused(true);
    }

    function _deployLauncherFactory() internal returns (TugLauncherFactory launcherFactory) {
        TugLauncher implementation = new TugLauncher();
        address predictedFactory = vm.computeCreateAddress(address(this), uint256(vm.getNonce(address(this))) + 1);
        UpgradeableBeacon beacon = new UpgradeableBeacon(predictedFactory, address(implementation));
        launcherFactory = new TugLauncherFactory(
            address(portal),
            LaunchVaultAddresses.guardian(),
            address(beacon),
            address(vaultFactory),
            TugTestnet.TOKEN_IMPLEMENTATION,
            TRIGGER_SERVICE
        );
        assertEq(address(launcherFactory), predictedFactory);
    }

    function _setFactories(uint16 vaultBps, bool vaultEnabled, uint16 launcherBps, bool launcherEnabled) internal {
        vm.startPrank(admin);
        portal.setLauncherFactoryMultiplier(address(factory), launcherBps, launcherEnabled);
        portal.setVaultFactoryMultiplier(address(vaultFactory), vaultBps, vaultEnabled);
        vm.stopPrank();
    }

    function _config() internal view returns (TugConfig memory config) {
        return _config("Tug launcher fork");
    }

    function _config(string memory saltDomain) internal view returns (TugConfig memory config) {
        config = factory.defaultConfig();
        config.name = "Tug of War";
        config.symbol = "TUG";
        config.meta = "QmTug";
        config.salt = _mineSalt(saltDomain);
        config.minRaise = 3 ether;
        config.walletCap = 10 ether;
        config.captainBlue = blue;
        config.captainRed = red;
        config.captainMinDeposit = CAPTAIN_DEPOSIT;
    }

    function _mineSalt(string memory saltDomain) private view returns (bytes32 salt) {
        bytes32 seed = keccak256(abi.encode(saltDomain, block.number, address(factory)));
        (salt,) = TugTestnet.mineSalt(ITugLauncherFactory(address(factory)), seed);
    }

    function _create(TugConfig memory config) internal returns (TugLauncher launcher) {
        bytes memory data = abi.encode(config);
        vm.prank(creator);
        launcher = TugLauncher(portal.newLauncher{value: saltFee}(address(factory), data));
    }

    function _newGame() internal returns (TugLauncher launcher) {
        _setFactories(10_000, true, 10_000, true);
        return _create(_config());
    }

    function _deposit(TugLauncher launcher, address captain, uint256 amount) internal {
        vm.prank(captain);
        launcher.depositCaptain{value: amount}();
    }

    function _start(TugLauncher launcher) internal {
        _deposit(launcher, blue, CAPTAIN_DEPOSIT);
        _deposit(launcher, red, CAPTAIN_DEPOSIT);
    }

    function _contribute(TugLauncher launcher, address player, uint8 team, uint256 amount) internal {
        vm.prank(player);
        launcher.contribute{value: amount}(team);
    }
}
