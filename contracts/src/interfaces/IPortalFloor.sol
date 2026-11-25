// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Flap Pool Launch Portal reads used to quote the creation floor.
/// @dev https://docs.flap.sh/en/flap/v2/developers/pool-launch/build-an-indexer
interface IPortalFloor {
    /// @notice Inputs to the Portal's floor preview.
    /// @param quoteToken Pool quote asset. The zero address represents native BNB.
    /// @param quotePriceUsd USD value of one quote token with 18 decimals.
    /// @param poolQuote Quote amount seeded into the pool, in the quote asset's smallest units.
    /// @param poolToken Launch token amount seeded into the pool, in token wei.
    /// @param totalSupply Total launch token supply in token wei.
    /// @param vaultFactory Factory assigned to the VAULT slot, or zero when absent.
    struct GraduationFloorParams {
        address quoteToken;
        uint256 quotePriceUsd;
        uint256 poolQuote;
        uint256 poolToken;
        uint256 totalSupply;
        address vaultFactory;
    }

    /// @notice Preview of the two Pool Launch floors.
    /// @param meetsFloor Whether the pool quote meets the graduation floor.
    /// @param floorUsdWad Graduation floor in USD with 18 decimals.
    /// @param quoteUsdWad USD value of the pool quote with 18 decimals.
    /// @param multiplierBps Effective floor multiplier in basis points.
    /// @param meetsCreateFloor Whether the pool quote meets the creation floor.
    /// @param createFloorUsdWad Creation floor in USD with 18 decimals.
    struct GraduationFloorResultV2 {
        bool meetsFloor;
        uint256 floorUsdWad;
        uint256 quoteUsdWad;
        uint16 multiplierBps;
        bool meetsCreateFloor;
        uint256 createFloorUsdWad;
    }

    /// @notice Preview the creation and graduation floors for the given pool.
    /// @param params Pool allocation and quote inputs.
    function graduationFloorV2(GraduationFloorParams calldata params)
        external
        view
        returns (GraduationFloorResultV2 memory);

    /// @notice Preview both floors, including the registered launcher's factory in multiplier resolution.
    /// @param params Pool allocation and quote inputs.
    /// @param launcher Recorded launcher address.
    function graduationFloorV2ForLauncher(GraduationFloorParams calldata params, address launcher)
        external
        view
        returns (GraduationFloorResultV2 memory);

    /// @notice Read the current quote configuration. The Portal can revert for an unconfigured launch kind.
    /// @param kind Portal launch kind ID.
    /// @param quoteToken Quote asset, or zero for native BNB.
    /// @return enabled Whether this quote asset is enabled for the launch kind.
    /// @return quotePriceUsd USD value of one quote token with 18 decimals.
    function launchQuoteConfig(uint8 kind, address quoteToken)
        external
        view
        returns (bool enabled, uint256 quotePriceUsd);

    /// @notice Read the live Vault Factory multiplier and its enabled flag on the Portal.
    /// @param factory Vault Factory address.
    /// @return enabled Whether the Portal applies the factory's multiplier.
    /// @return multiplierBps Floor multiplier in basis points.
    function vaultFactoryMultiplier(address factory) external view returns (bool enabled, uint16 multiplierBps);
}
