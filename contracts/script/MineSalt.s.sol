// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console2} from "forge-std/console2.sol";
import {TugScript} from "./TugScript.sol";

contract MineSalt is TugScript {
    function run() external view returns (bytes32 salt, address token) {
        (salt, token) = _mineSalt(_factory());
        console2.log("Salt");
        console2.logBytes32(salt);
        console2.log("Predicted token", token);
    }
}
