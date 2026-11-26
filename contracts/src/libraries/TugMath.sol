// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @notice Pull, allocation and vesting math shared by Tug launchers and vaults.
library TugMath {
    uint16 internal constant BPS = 10_000;
    uint16 internal constant START_WEIGHT_BPS = 20_000;

    // Match the public Team IDs while keeping the library independent of the launcher interfaces.
    uint8 private constant NONE = 0;
    uint8 private constant BLUE = 1;
    uint8 private constant RED = 2;

    /// @notice The buy-in weight falls from 20,000 to 10,000 bps over the original game clock.
    /// @dev Use the original deadline as end, so overtime stays at 10,000 bps.
    function timeWeightBps(uint256 start, uint256 end, uint256 timestamp) internal pure returns (uint16) {
        if (timestamp >= end) return BPS;
        if (timestamp <= start) return START_WEIGHT_BPS;

        return BPS + uint16(FixedPointMathLib.fullMulDiv(end - timestamp, START_WEIGHT_BPS - BPS, end - start));
    }

    /// @notice Weight a contribution in BNB wei by a basis-point multiplier, rounding down.
    function pull(uint256 amount, uint256 weightBps) internal pure returns (uint256) {
        return FixedPointMathLib.fullMulDiv(amount, weightBps, BPS);
    }

    /// @notice Blue's share of total pull in basis points, rounded down. Both sides empty gives 5,000 bps.
    /// @dev Use leader() to determine which team leads from the exact pulls.
    function ropeBps(uint256 pullBlue, uint256 pullRed) internal pure returns (uint16) {
        uint256 totalPull = pullBlue + pullRed;
        if (totalPull == 0) return BPS / 2;
        return uint16(FixedPointMathLib.fullMulDiv(pullBlue, BPS, totalPull));
    }

    /// @notice Return the team with more pull, or NONE on a tie.
    function leader(uint256 pullBlue, uint256 pullRed) internal pure returns (uint8) {
        if (pullBlue == pullRed) return NONE;
        return pullBlue > pullRed ? BLUE : RED;
    }

    /// @notice Clamp the final Blue share, except that the only team with pull gets everything.
    /// @param maxBps Maximum share for either team, between 5,000 and 10,000 bps.
    function finalBlueShareBps(uint256 pullBlue, uint256 pullRed, uint256 maxBps) internal pure returns (uint16) {
        if (pullBlue == 0 && pullRed == 0) return BPS / 2;
        if (pullBlue == 0) return 0;
        if (pullRed == 0) return BPS;

        uint256 blueShare = ropeBps(pullBlue, pullRed);
        uint256 minBps = BPS - maxBps;
        if (blueShare < minBps) return uint16(minBps);
        if (blueShare > maxBps) return uint16(maxBps);
        return uint16(blueShare);
    }

    /// @notice Split a token or BNB amount in wei, rounding Blue down and assigning the remainder to Red.
    /// @param blueBps Blue's share, between 0 and 10,000 bps.
    function split(uint256 amount, uint256 blueBps) internal pure returns (uint256 blue, uint256 red) {
        blue = FixedPointMathLib.fullMulDiv(amount, blueBps, BPS);
        red = amount - blue;
    }

    /// @notice A player's pro-rata bonus in token wei. An empty team earns zero.
    function playerBonus(uint256 teamBonus, uint256 playerPull, uint256 teamPull) internal pure returns (uint256) {
        if (teamPull == 0) return 0;
        return FixedPointMathLib.fullMulDiv(teamBonus, playerPull, teamPull);
    }

    /// @notice A player's pro-rata base allocation in token wei. An empty raise earns zero.
    function baseShare(uint256 baseTotal, uint256 contribution, uint256 raised) internal pure returns (uint256) {
        if (raised == 0) return 0;
        return FixedPointMathLib.fullMulDiv(baseTotal, contribution, raised);
    }

    /// @notice Linear vesting in token wei, rounded down and bounded by the total allocation.
    function vested(uint256 total, uint256 start, uint256 duration, uint256 timestamp)
        internal
        pure
        returns (uint256)
    {
        if (timestamp <= start) return 0;
        uint256 elapsed = timestamp - start;
        if (elapsed >= duration) return total;
        return FixedPointMathLib.fullMulDiv(total, elapsed, duration);
    }
}
