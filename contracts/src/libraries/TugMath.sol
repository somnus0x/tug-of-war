// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Pull, allocation and vesting math shared by Tug launchers and vaults.
library TugMath {
    uint16 private constant BPS = 10_000;
    uint16 private constant START_WEIGHT_BPS = 20_000;

    // Match the public Team IDs while keeping the library independent of the launcher interfaces.
    uint8 private constant NONE = 0;
    uint8 private constant BLUE = 1;
    uint8 private constant RED = 2;

    /// @notice The exact quotient is larger than a uint256.
    error MulDivOverflow();

    /// @notice The buy-in weight falls from 20,000 to 10,000 bps over the original game clock.
    /// @dev Use the original deadline as end, so overtime stays at 10,000 bps.
    function timeWeightBps(uint256 start, uint256 end, uint256 timestamp) internal pure returns (uint16) {
        if (timestamp >= end) return BPS;
        if (timestamp <= start) return START_WEIGHT_BPS;

        return BPS + uint16(_mulDiv(end - timestamp, START_WEIGHT_BPS - BPS, end - start));
    }

    /// @notice Weight a contribution in BNB wei by a basis-point multiplier, rounding down.
    function pull(uint256 amount, uint256 weightBps) internal pure returns (uint256) {
        return _mulDiv(amount, weightBps, BPS);
    }

    /// @notice Blue's share of total pull in basis points, with an even rope when both sides are empty.
    function ropeBps(uint256 pullBlue, uint256 pullRed) internal pure returns (uint16) {
        uint256 totalPull;
        unchecked {
            totalPull = pullBlue + pullRed;
        }
        if (totalPull >= pullBlue) {
            if (totalPull == 0) return BPS / 2;
            return uint16(_mulDiv(pullBlue, BPS, totalPull));
        }

        // For a 257-bit total, halve the scale and the total. With an odd total, the actual
        // denominator is halfTotal + 0.5. The share is one bps too high if doubling the
        // remainder gives less than the share.
        uint256 halfTotal = pullBlue / 2 + pullRed / 2 + (pullBlue & pullRed & 1);
        uint256 share = _mulDiv(pullBlue, BPS / 2, halfTotal);
        if (((pullBlue ^ pullRed) & 1) != 0 && mulmod(pullBlue, BPS / 2, halfTotal) < (share + 1) / 2) {
            share--;
        }
        return uint16(share);
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
        blue = _mulDiv(amount, blueBps, BPS);
        red = amount - blue;
    }

    /// @notice A player's pro-rata bonus in token wei. An empty team earns zero.
    function playerBonus(uint256 teamBonus, uint256 playerPull, uint256 teamPull) internal pure returns (uint256) {
        if (teamPull == 0) return 0;
        return _mulDiv(teamBonus, playerPull, teamPull);
    }

    /// @notice A player's pro-rata base allocation in token wei. An empty raise earns zero.
    function baseShare(uint256 baseTotal, uint256 contribution, uint256 raised) internal pure returns (uint256) {
        if (raised == 0) return 0;
        return _mulDiv(baseTotal, contribution, raised);
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
        return _mulDiv(total, elapsed, duration);
    }

    /// @dev Full-precision floor(x * y / denominator), adapted from OpenZeppelin Math.mulDiv (MIT).
    ///      Original algorithm by Remco Bloemen, with further edits by Uniswap Labs, both under MIT.
    function _mulDiv(uint256 x, uint256 y, uint256 denominator) private pure returns (uint256) {
        unchecked {
            uint256 low;
            uint256 high;
            assembly ("memory-safe") {
                let productMod := mulmod(x, y, not(0))
                low := mul(x, y)
                high := sub(sub(productMod, low), lt(productMod, low))
            }
            if (high == 0) return low / denominator;
            if (denominator <= high) revert MulDivOverflow();

            // Subtract the remainder to make the 512-bit product exactly divisible.
            assembly ("memory-safe") {
                let remainder := mulmod(x, y, denominator)
                high := sub(high, gt(remainder, low))
                low := sub(low, remainder)
            }

            // Divide out the largest power of two, then shift the high bits into the low word.
            uint256 twos = denominator & (0 - denominator);
            assembly ("memory-safe") {
                denominator := div(denominator, twos)
                low := div(low, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }
            low |= high * twos;

            // The remaining denominator is odd. Each iteration doubles the precision of its inverse.
            uint256 inverse = (3 * denominator) ^ 2;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            return low * inverse;
        }
    }
}
