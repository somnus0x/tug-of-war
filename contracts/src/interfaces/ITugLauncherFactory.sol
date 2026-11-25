// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Limits, TugConfig} from "./TugTypes.sol";

/// @notice Frontend interface for creating and discovering Tug launchers.
interface ITugLauncherFactory {
    /// @notice The Portal created a game through this factory.
    /// @param launcher Address of the new game.
    /// @param creator Wallet that called Portal.newLauncher.
    /// @param captainBlue Blue captain's wallet.
    /// @param captainRed Red captain's wallet.
    /// @param salt CREATE2 salt reserved for the token.
    event TugLauncherCreated(
        address indexed launcher, address creator, address indexed captainBlue, address indexed captainRed, bytes32 salt
    );

    /// @notice The configuration does not name this factory's paired vault factory.
    error InvalidVaultFactory();
    /// @notice Captain addresses must be distinct and nonzero.
    error InvalidCaptains();
    /// @notice The salt is zero or its predicted token address does not end in 7777.
    error InvalidSalt();
    /// @notice The initial buy-in duration in seconds falls outside the allowed range.
    error DurationOutOfRange();
    /// @notice The captain accept window in seconds falls outside the allowed range.
    error AcceptWindowOutOfRange();
    /// @notice The captain vesting duration in seconds falls outside the allowed range.
    error CaptainVestDurationOutOfRange();
    /// @notice The maximum team bonus share is outside its basis-point range.
    error MaxBonusShareOutOfRange();
    /// @notice The captain token allocation is outside its basis-point range.
    error CaptainAllocOutOfRange();
    /// @notice The captain share of vault revenue is outside its basis-point range.
    error CaptainShareOutOfRange();
    /// @notice The wallet contribution cap is zero BNB wei.
    error InvalidWalletCap();
    /// @notice The captain minimum deposit exceeds the wallet cap in BNB wei.
    error CaptainDepositExceedsWalletCap();
    /// @notice The configured minimum raise is zero BNB wei.
    error ZeroMinRaise();
    /// @notice The native quote is disabled, has a zero price, or a Portal floor or quote read reverted.
    error CreationFloorUnavailable();
    /// @notice The configured minimum raise is below the live creation floor in BNB wei.
    error MinRaiseBelowCreationFloor();
    /// @notice The Portal supplied decodable configuration bytes that differ from their canonical encoding.
    error NonCanonicalConfig();

    /// @notice Read the accepted ranges and live creation floor in BNB wei.
    /// @return configLimits Factory limits. An unavailable floor is returned as false with zero wei.
    function limits() external view returns (Limits memory configLimits);

    /// @notice Read suggested inputs for the game creation form.
    /// @return config Default values, with creator-supplied fields to be filled before validation.
    function defaultConfig() external view returns (TugConfig memory config);

    /// @notice Check a typed configuration before creating a launcher.
    /// @param config Complete configuration in canonical field order.
    /// @return ok Whether the factory validation would accept the configuration.
    /// @return reason The selector creation would revert with on validation failure, or bytes4(0) on success.
    function validateConfig(TugConfig calldata config) external view returns (bool ok, bytes4 reason);

    /// @notice Encode the tuple to pass as data to Portal.newLauncher.
    /// @param config Configuration to encode.
    /// @return data Canonical ABI encoding of the configuration tuple.
    function encodeConfig(TugConfig calldata config) external pure returns (bytes memory data);

    /// @notice Read the paired vault factory address required by TugConfig.
    function pairedVaultFactory() external view returns (address);
    /// @notice Read the Pool Launch Portal address.
    function portal() external view returns (address);
    /// @notice Read the token implementation used to predict launch addresses.
    function tokenImplementation() external view returns (address);

    /// @notice Predict the token address from a CREATE2 salt.
    /// @param salt Candidate salt to check for the 7777 suffix.
    /// @return token Predicted address.
    function predictToken(bytes32 salt) external view returns (address token);

    /// @notice Check whether this factory deployed a launcher.
    /// @param launcher Address to inspect.
    function isLauncher(address launcher) external view returns (bool);
    /// @notice Read the number of launchers created by this factory.
    function gamesCount() external view returns (uint256);

    /// @notice Read a launcher by zero-based creation index. Reverts for an out-of-range index.
    /// @param index Index below gamesCount.
    /// @return launcher Recorded launcher address.
    function gameAt(uint256 index) external view returns (address launcher);

    /// @notice List games that named a given wallet as either captain.
    /// @param captain Wallet to look up.
    /// @return games Recorded launcher addresses.
    function gamesOf(address captain) external view returns (address[] memory games);
}
