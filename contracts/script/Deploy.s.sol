// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console2} from "forge-std/console2.sol";
import {UpgradeableBeacon} from "solady/utils/UpgradeableBeacon.sol";
import {IPortal} from "src/flap/IPortal.sol";
import {LaunchVaultAddresses} from "src/flap/LaunchVaultAddresses.sol";
import {TugLauncher} from "src/launcher/TugLauncher.sol";
import {TugLauncherFactory} from "src/launcher/TugLauncherFactory.sol";
import {TugVaultFactory} from "src/vault/TugVaultFactory.sol";

import {TugScript} from "./TugScript.sol";
import {TugScriptErrors} from "./TugScriptErrors.sol";
import {TugTestnet} from "./TugTestnet.sol";

contract Deploy is TugScript {
    struct Deployment {
        TugLauncherFactory launcherFactory;
        TugVaultFactory vaultFactory;
        UpgradeableBeacon launcherBeacon;
        TugLauncher launcherImplementation;
    }

    error LauncherFactoryAddressMismatch(address predicted, address actual);
    error FactoryPairingMismatch();
    error BeaconOwnerMismatch();

    function run() external returns (Deployment memory deployed) {
        _requireTestnet();
        address hub = LaunchVaultAddresses.hub();
        _requireCode(hub);
        _requireCode(TugTestnet.TOKEN_IMPLEMENTATION);
        _requireCode(TugTestnet.TRIGGER_SERVICE);
        try IPortal(hub).SALT_LOCK_FEE() returns (uint256 fee) {
            console2.log("Live salt lock fee (wei)", fee);
        } catch (bytes memory reason) {
            TugScriptErrors.fail(reason);
        }

        Signer memory deployer = _signer("DEPLOYER_PRIVATE_KEY");
        address guardian = LaunchVaultAddresses.guardian();
        vm.startBroadcast(deployer.key);
        deployed.vaultFactory = new TugVaultFactory();
        deployed.launcherImplementation = new TugLauncher();
        address expectedFactory = vm.computeCreateAddress(deployer.account, uint256(vm.getNonce(deployer.account)) + 1);
        deployed.launcherBeacon = new UpgradeableBeacon(expectedFactory, address(deployed.launcherImplementation));
        deployed.launcherFactory = new TugLauncherFactory(
            hub,
            guardian,
            address(deployed.launcherBeacon),
            address(deployed.vaultFactory),
            TugTestnet.TOKEN_IMPLEMENTATION,
            TugTestnet.TRIGGER_SERVICE
        );
        vm.stopBroadcast();

        address factory = address(deployed.launcherFactory);
        if (factory != expectedFactory) revert LauncherFactoryAddressMismatch(expectedFactory, factory);
        _send(
            deployer, address(deployed.vaultFactory), abi.encodeCall(TugVaultFactory.setLauncherFactory, (factory)), 0
        );
        if (
            deployed.vaultFactory.launcherFactory() != factory
                || deployed.launcherFactory.pairedVaultFactory() != address(deployed.vaultFactory)
        ) revert FactoryPairingMismatch();

        UpgradeableBeacon vaultBeacon = deployed.vaultFactory.beacon();
        if (deployed.launcherBeacon.owner() != factory || vaultBeacon.owner() != address(deployed.vaultFactory)) {
            revert BeaconOwnerMismatch();
        }
        _writeDeployment(deployed, vaultBeacon, deployer.account);
        console2.log("Simulated launcher factory", factory);
        console2.log("Simulated vault factory", address(deployed.vaultFactory));
    }

    function _writeDeployment(Deployment memory deployed, UpgradeableBeacon vaultBeacon, address deployer) private {
        string memory object = "tugDeployment";
        vm.serializeUint(object, "chainId", block.chainid);
        vm.serializeUint(object, "blockNumber", block.number);
        vm.serializeAddress(object, "deployer", deployer);
        vm.serializeAddress(object, "launcherFactory", address(deployed.launcherFactory));
        vm.serializeAddress(object, "vaultFactory", address(deployed.vaultFactory));
        vm.serializeAddress(object, "launcherBeacon", address(deployed.launcherBeacon));
        vm.serializeAddress(object, "vaultBeacon", address(vaultBeacon));
        vm.serializeAddress(object, "launcherImplementation", address(deployed.launcherImplementation));
        string memory json = vm.serializeAddress(object, "vaultImplementation", vaultBeacon.implementation());
        vm.createDir("./deployments", true);
        vm.writeJson(json, _deploymentPath());
    }

    function _deploymentPath() internal pure virtual returns (string memory) {
        return "./deployments/97.json";
    }
}
