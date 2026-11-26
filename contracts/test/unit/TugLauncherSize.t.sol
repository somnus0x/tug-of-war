// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {TugLauncher} from "src/launcher/TugLauncher.sol";

contract TugLauncherSizeTest is Test {
    function test_LauncherFitsRuntimeSizeLimit() public {
        TugLauncher launcher = new TugLauncher();
        assertLe(address(launcher).code.length, 24_576);
    }
}
