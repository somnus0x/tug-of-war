// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {LibClone} from "solady/utils/LibClone.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";

import {DirectLaunchVaultFactoryBase} from "src/flap/DirectLaunchVaultFactoryBase.sol";
import {Distribution} from "src/flap/Distribution.sol";
import {IPortalTypes} from "src/flap/IPortal.sol";
import {FactoryPolicy, FieldDescriptor, VaultDataSchema} from "src/flap/IVaultSchemas.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";

import {TugVault} from "./TugVault.sol";

/// @notice Creates one vault per Tug token for the paired launcher factory.
contract TugVaultFactory is DirectLaunchVaultFactoryBase {
    uint16 private constant VAULT_SLOT_BPS = 8_000;

    address private immutable _deployer;
    UpgradeableBeacon public immutable beacon;
    address public launcherFactory;

    error OnlyDeployer();
    error LauncherFactoryAlreadySet();
    error LauncherFactoryUnset();
    error UnrecognizedLauncher();
    error LauncherNotLaunching();
    error InvalidVaultSlotBps();

    constructor() {
        _deployer = msg.sender;
        beacon = new UpgradeableBeacon(address(this), address(new TugVault(address(this))));
    }

    /// @notice Pair this vault factory with the launcher factory after both are deployed.
    function setLauncherFactory(address factory) external {
        if (msg.sender != _deployer) revert OnlyDeployer();
        if (launcherFactory != address(0)) revert LauncherFactoryAlreadySet();
        if (factory == address(0)) revert ZeroAddress();
        launcherFactory = factory;
    }

    function newVault(address token, address creator, uint8 kind, bytes calldata launchParams)
        external
        override
        onlyHub
        returns (address vault)
    {
        (IPortalTypes.CreateTaxTokenParams memory params, Distribution memory distribution, bytes memory vaultData) =
            _validateLaunch(token, creator, kind, launchParams);

        address paired = launcherFactory;
        if (paired == address(0)) revert LauncherFactoryUnset();
        if (!ITugLauncherFactory(paired).isLauncher(creator)) revert UnrecognizedLauncher();
        if (keccak256(vaultData) != keccak256(abi.encode(creator))) revert InvalidVaultData();
        _validateSlotBps(params.feeConfigs);
        _requireNoReserveDistribution(distribution);
        if (!ITugLauncher(creator).launching()) revert LauncherNotLaunching();

        vault = LibClone.deployDeterministicERC1967BeaconProxy(address(beacon), bytes32(uint256(uint160(token))));
        TugVault(payable(vault)).initialize(token, creator);
    }

    function upgradeVaultImplementation(address implementation) external override onlyGuardian {
        beacon.upgradeTo(implementation);
    }

    function isQuoteTokenSupported(address quoteToken) public pure override returns (bool) {
        return quoteToken == address(0);
    }

    function vaultDataSchema() public pure override returns (VaultDataSchema memory schema) {
        schema.description = "Distribute trading fees to Tug team captains and stakers";
        schema.fields = new FieldDescriptor[](1);
        schema.fields[0] = FieldDescriptor("launcher", "address", "Launching Tug game", 0);
    }

    function tokenCreationPolicies() public pure override returns (FactoryPolicy[] memory) {
        return new FactoryPolicy[](0);
    }

    function _validateSlotBps(IPortalTypes.FeeConfig[] memory slots) private view {
        for (uint256 i; i < slots.length; ++i) {
            IPortalTypes.FeeConfig memory slot = slots[i];
            if (slot.feeType != IPortalTypes.FeeSlotType.VAULT) continue;
            IPortalTypes.FeeConfigVault memory config = abi.decode(slot.configData, (IPortalTypes.FeeConfigVault));
            if (config.vaultFactory != address(this)) continue;
            if (slot.bps != VAULT_SLOT_BPS) revert InvalidVaultSlotBps();
            return;
        }
        revert MissingVaultSlot(address(this));
    }
}
