// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ClonesUpgradeable} from "@openzeppelin-contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import {ITugLauncherFactory} from "src/interfaces/ITugLauncherFactory.sol";

interface IPancakeV2Router {
    function factory() external view returns (address);
    function WETH() external view returns (address);
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 minOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amount,
        uint256 minOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface ITugTaxToken {
    function taxProcessor() external view returns (address);
}

interface ITugTaxProcessor {
    function marketQuoteBalance() external view returns (uint256);
    function dispatch() external;
}

library TugTestnet {
    uint256 internal constant CHAIN_ID = 97;
    address internal constant PORTAL_PROXY_ADMIN = 0x0000Ed588dfc01749C20bA69b5f8c77d706E0000;
    address internal constant TOKEN_IMPLEMENTATION = 0x7777c57ff7dc441c1715b2e36fa581c48B782222;
    address internal constant TRIGGER_SERVICE = 0x560E9830926C9e0EB98a59c6b9902383Fc0D9Eb2;
    IPancakeV2Router internal constant ROUTER = IPancakeV2Router(0xc9D63ddCB9549578057EAB6A83a543DdFEE2b8c3);

    function mineSalt(ITugLauncherFactory factory, bytes32 seed) internal view returns (bytes32 salt, address token) {
        address implementation = factory.tokenImplementation();
        address portal = factory.portal();
        for (uint256 i;; ++i) {
            assembly ("memory-safe") {
                mstore(0, seed)
                mstore(32, i)
                salt := keccak256(0, 64)
            }
            token = ClonesUpgradeable.predictDeterministicAddress(implementation, salt, portal);
            if (salt != bytes32(0) && uint16(uint160(token)) == 0x7777 && token.code.length == 0) return (salt, token);
        }
    }
}
