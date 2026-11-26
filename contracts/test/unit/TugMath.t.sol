// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {TugMath} from "src/libraries/TugMath.sol";

contract TugMathTest is Test {
    function test_TimeWeightBoundaries() public pure {
        uint256 start = 100;
        uint256 end = 160;

        assertEq(TugMath.timeWeightBps(start, end, start - 1), 20_000);
        assertEq(TugMath.timeWeightBps(start, end, start), 20_000);
        assertEq(TugMath.timeWeightBps(start, end, 130), 15_000);
        assertEq(TugMath.timeWeightBps(start, end, end), 10_000);
        assertEq(TugMath.timeWeightBps(start, end, end + 30), 10_000);
    }

    function test_TimeWeightRoundsDown() public pure {
        assertEq(TugMath.timeWeightBps(100, 103, 101), 16_666);
        assertEq(TugMath.timeWeightBps(100, 103, 102), 13_333);
    }

    function test_PullUsesBasisPointsAndRoundsDown() public pure {
        assertEq(TugMath.pull(1 ether, 20_000), 2 ether);
        assertEq(TugMath.pull(3, 15_000), 4);
        assertEq(TugMath.pull(type(uint256).max, 10_000), type(uint256).max);
    }

    function test_RopeAndLeaderForTies() public pure {
        assertEq(TugMath.ropeBps(0, 0), 5_000);
        assertEq(TugMath.ropeBps(7, 7), 5_000);
        assertEq(TugMath.ropeBps(1, 2), 3_333);
        assertEq(TugMath.leader(0, 0), 0);
        assertEq(TugMath.leader(7, 7), 0);
    }

    function test_RopeWithWideTotalRoundsDown() public pure {
        uint256 maxPull = type(uint256).max;

        assertEq(TugMath.ropeBps(maxPull, maxPull), 5_000);
        assertEq(TugMath.ropeBps(maxPull - 1, maxPull), 4_999);
        assertEq(TugMath.ropeBps(maxPull, maxPull - 1), 5_000);
    }

    function test_OnlyTeamWithPullTakesTheFullShare() public pure {
        assertEq(TugMath.leader(4, 0), 1);
        assertEq(TugMath.leader(0, 4), 2);
        assertEq(TugMath.ropeBps(4, 0), 10_000);
        assertEq(TugMath.ropeBps(0, 4), 0);
        assertEq(TugMath.finalBlueShareBps(4, 0, 7_000), 10_000);
        assertEq(TugMath.finalBlueShareBps(0, 4, 7_000), 0);
    }

    function test_FinalShareClampsBothDirections() public pure {
        assertEq(TugMath.finalBlueShareBps(99, 1, 7_000), 7_000);
        assertEq(TugMath.finalBlueShareBps(1, 99, 7_000), 3_000);
        assertEq(TugMath.finalBlueShareBps(6, 4, 7_000), 6_000);
        assertEq(TugMath.finalBlueShareBps(0, 0, 7_000), 5_000);
        assertEq(TugMath.finalBlueShareBps(7, 7, 7_000), 5_000);
        assertEq(TugMath.finalBlueShareBps(99, 1, 5_000), 5_000);
        assertEq(TugMath.finalBlueShareBps(99, 1, 10_000), 9_900);
    }

    function test_CaptainAllocationsAtDefaultBounds() public pure {
        uint256 captainPool = 20_000 ether; // 2 percent of the 1,000,000-token supply.

        (uint256 blue, uint256 red) = TugMath.split(captainPool, TugMath.finalBlueShareBps(99, 1, 7_000));
        assertEq(blue, 14_000 ether);
        assertEq(red, 6_000 ether);

        (blue, red) = TugMath.split(captainPool, TugMath.finalBlueShareBps(1, 99, 7_000));
        assertEq(blue, 6_000 ether);
        assertEq(red, 14_000 ether);
    }

    function test_SplitAssignsRoundingRemainderToRed() public pure {
        (uint256 blue, uint256 red) = TugMath.split(3, 5_000);
        assertEq(blue, 1);
        assertEq(red, 2);
    }

    function test_ProRataSharesRoundDown() public pure {
        assertEq(TugMath.baseShare(101, 1, 3), 33);
        assertEq(TugMath.playerBonus(100, 2, 3), 66);
        assertEq(TugMath.baseShare(101, 0, 0), 0);
        assertEq(TugMath.playerBonus(100, 0, 0), 0);
    }

    function test_VestingBoundariesAndRounding() public pure {
        uint256 start = 100;
        uint256 duration = 30 days;

        assertEq(TugMath.vested(101, start, duration, start - 1), 0);
        assertEq(TugMath.vested(101, start, duration, start), 0);
        assertEq(TugMath.vested(101, start, duration, start + duration / 2), 50);
        assertEq(TugMath.vested(101, start, duration, start + duration), 101);
        assertEq(TugMath.vested(101, start, duration, start + duration + 1), 101);
    }

    function testFuzz_SplitConservesTheTotal(uint256 amount, uint16 share) public pure {
        uint256 blueBps = bound(share, 0, 10_000);
        (uint256 blue, uint256 red) = TugMath.split(amount, blueBps);
        uint256 expectedBlue = (amount / 10_000) * blueBps + ((amount % 10_000) * blueBps) / 10_000;

        assertEq(blue + red, amount);
        assertEq(blue, expectedBlue);
    }

    function testFuzz_BaseSharesNeverOverAllocate(uint256 baseTotal, uint128 first, uint128 second, uint128 third)
        public
        pure
    {
        uint256 firstContribution = uint256(first) + 1;
        uint256 raised = firstContribution + second + third;
        uint256 distributed = TugMath.baseShare(baseTotal, firstContribution, raised)
            + TugMath.baseShare(baseTotal, second, raised) + TugMath.baseShare(baseTotal, third, raised);

        assertLe(distributed, baseTotal);
        assertLe(baseTotal - distributed, 2);
    }

    function testFuzz_BonusSharesNeverOverAllocate(uint256 teamBonus, uint128 first, uint128 second, uint128 third)
        public
        pure
    {
        uint256 firstPull = uint256(first) + 1;
        uint256 teamPull = firstPull + second + third;
        uint256 distributed = TugMath.playerBonus(teamBonus, firstPull, teamPull)
            + TugMath.playerBonus(teamBonus, second, teamPull) + TugMath.playerBonus(teamBonus, third, teamPull);

        assertLe(distributed, teamBonus);
        assertLe(teamBonus - distributed, 2);
    }
}
