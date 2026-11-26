// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {LibString} from "solady/utils/LibString.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

import {DirectLaunchVaultBase} from "src/flap/DirectLaunchVaultBase.sol";
import {ApproveAction, FieldDescriptor, VaultMethodSchema, VaultUISchema} from "src/flap/IVaultSchemas.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {ITugVault} from "src/interfaces/ITugVault.sol";
import {CaptainView, StakerView, Team, TeamPair, VaultView} from "src/interfaces/TugTypes.sol";
import {TugMath} from "src/libraries/TugMath.sol";

/// @notice Distributes native trading tax to the captains and to stakers on the two teams.
contract TugVault is DirectLaunchVaultBase, Initializable, ReentrancyGuard, ITugVault {
    uint256 private constant REWARD_SCALE = 1e36;
    uint256 private constant PREVIEW_STAKE = 1_000 ether;
    string private constant SPLIT_DESCRIPTION =
        "The vault receives 80% of trading tax and deflation receives 20%. Captains and staker pools split their shares by the final rope. An empty staker pool's share goes to the other pool, and two empty pools carry rewards forward. The launcher holds the token reserve.";

    struct RevenueSync {
        uint256 balance;
        uint256 revenue;
        uint256 toCaptains;
        TeamPair toStakers;
        TeamPair captainAccrued;
        TeamPair accRewardPerShare;
        uint256 undistributed;
    }

    address private immutable _factory;
    address public taxToken;
    address public launcher;
    uint16 private _captainShareBps;
    uint16 private _finalBlueShareBps;
    uint256 private _baseline;
    uint256 private _undistributed;

    TeamPair private _totalStaked;
    TeamPair private _accRewardPerShare;
    TeamPair private _captainAccrued;
    TeamPair private _captainClaimed;
    mapping(address => uint256) public stakeOf;
    mapping(address => uint8) public stakerTeam;

    // Store the accumulator at the last settlement. Round each earned interval down.
    mapping(address => uint256) private _rewardDebt;
    mapping(address => uint256) private _owed;

    error OnlyFactory();
    error InvalidVaultSetup();

    constructor(address factory) {
        if (factory == address(0)) revert InvalidVaultSetup();
        _factory = factory;
        _disableInitializers();
    }

    /// @notice Bind this proxy to the predicted token and the launcher for this game.
    function initialize(address token, address launcher_) external initializer {
        if (msg.sender != _factory) revert OnlyFactory();
        if (token == address(0) || launcher_ == address(0)) revert InvalidVaultSetup();
        taxToken = token;
        launcher = launcher_;
        ITugLauncher game = ITugLauncher(launcher_);
        _captainShareBps = game.getRules().captainShareBps;
        _finalBlueShareBps = game.finalBlueShareBps();
    }

    receive() external payable {}

    function sync() external nonReentrant {
        _sync();
    }

    function stake(uint256 amount, uint8 team) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _validateTeam(team);
        uint8 lockedTeam = _effectiveTeam(msg.sender);
        if (lockedTeam != Team.NONE && lockedTeam != team) revert WrongTeam();

        _sync();
        _settle(msg.sender, team);
        stakerTeam[msg.sender] = team;

        address token = taxToken;
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        if (!SafeTransferLib.trySafeTransferFrom(token, msg.sender, address(this), amount)) revert TransferFailed();
        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        if (afterBalance <= beforeBalance) revert TransferFailed();
        uint256 received = afterBalance - beforeBalance;

        stakeOf[msg.sender] += received;
        if (team == Team.BLUE) _totalStaked.blue += received;
        else _totalStaked.red += received;
        emit Staked(msg.sender, team, received);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 staked = stakeOf[msg.sender];
        if (amount > staked) revert InsufficientStake();
        uint8 team = stakerTeam[msg.sender];

        _sync();
        _settle(msg.sender, team);
        stakeOf[msg.sender] = staked - amount;
        if (team == Team.BLUE) _totalStaked.blue -= amount;
        else _totalStaked.red -= amount;

        (bool sent, bytes memory result) = taxToken.call(abi.encodeCall(IERC20.transfer, (msg.sender, amount)));
        if (!sent || (result.length != 0 && (result.length != 32 || uint256(bytes32(result)) != 1))) {
            revert TransferFailed();
        }
        emit Unstaked(msg.sender, team, amount);
    }

    function claimRewards() external nonReentrant {
        _sync();
        uint8 team = stakerTeam[msg.sender];
        _settle(msg.sender, team);
        uint256 rewards = _owed[msg.sender];
        if (rewards == 0) revert NothingToClaim();
        _owed[msg.sender] = 0;
        _payBnb(msg.sender, rewards);
        emit RewardsClaimed(msg.sender, team, rewards);
    }

    function claimCaptain() external nonReentrant {
        uint8 team = _captainTeam(msg.sender);
        if (team == Team.NONE) revert NotCaptain();

        _sync();
        uint256 amount = _forTeam(_captainAccrued, team) - _forTeam(_captainClaimed, team);
        if (amount == 0) revert NothingToClaim();
        if (team == Team.BLUE) _captainClaimed.blue += amount;
        else _captainClaimed.red += amount;

        _payBnb(msg.sender, amount);
        emit CaptainClaimed(msg.sender, team, amount);
    }

    function getVault() external view returns (VaultView memory vaultView) {
        RevenueSync memory preview = _previewSync();
        (, uint256 stakerPortion) = TugMath.split(1 ether, _captainShareBps);
        (uint256 blue, uint256 red) = TugMath.split(stakerPortion, _finalBlueShareBps);
        TeamPair memory staked = _totalStaked;

        vaultView.teamStaked = staked;
        vaultView.rewardPer1000NewTokensPerBnb = TeamPair({
            blue: FixedPointMathLib.fullMulDiv(
                staked.red == 0 ? stakerPortion : blue, PREVIEW_STAKE, staked.blue + PREVIEW_STAKE
            ),
            red: FixedPointMathLib.fullMulDiv(
                staked.blue == 0 ? stakerPortion : red, PREVIEW_STAKE, staked.red + PREVIEW_STAKE
            )
        });
        vaultView.captainAccrued = preview.captainAccrued;
        vaultView.captainClaimed = _captainClaimed;
        vaultView.undistributed = preview.undistributed;
    }

    function getStaker(address staker) external view returns (StakerView memory stakerView) {
        stakerView.team = _effectiveTeam(staker);
        stakerView.staked = stakeOf[staker];
        stakerView.pendingRewards = pendingRewards(staker);
        IERC20 token = IERC20(taxToken);
        stakerView.tokenBalance = token.balanceOf(staker);
        stakerView.allowance = token.allowance(staker, address(this));
    }

    function getCaptain(address captain) public view returns (CaptainView memory captainView) {
        uint8 team = _captainTeam(captain);
        if (team == Team.NONE) return captainView;

        captainView.team = team;
        captainView.accrued = _forTeam(_previewSync().captainAccrued, team);
        captainView.claimed = _forTeam(_captainClaimed, team);
        captainView.claimable = captainView.accrued - captainView.claimed;
    }

    function teamStake(uint8 team) external view returns (uint256) {
        _validateTeam(team);
        return _forTeam(_totalStaked, team);
    }

    function pendingRewards(address staker) public view returns (uint256) {
        uint256 owed = _owed[staker];
        uint256 staked = stakeOf[staker];
        if (staked == 0) return owed;
        uint256 accumulator = _forTeam(_previewSync().accRewardPerShare, stakerTeam[staker]);
        return owed + FixedPointMathLib.fullMulDiv(staked, accumulator - _rewardDebt[staker], REWARD_SCALE);
    }

    function pendingCaptain(address captain) external view returns (uint256) {
        return getCaptain(captain).claimable;
    }

    function description() public view override returns (string memory) {
        return string.concat(
            "Tug of War staking. Buy and sell tax are 300 and 500 bps. From vault revenue, captains receive ",
            LibString.toString(_captainShareBps),
            " bps and stakers receive ",
            LibString.toString(TugMath.BPS - _captainShareBps),
            " bps. Blue's fixed rope share is ",
            LibString.toString(_finalBlueShareBps),
            " bps. ",
            SPLIT_DESCRIPTION
        );
    }

    function vaultUISchema() public pure override returns (VaultUISchema memory schema) {
        schema.vaultType = "TugVault";
        schema.description = SPLIT_DESCRIPTION;
        schema.methods = new VaultMethodSchema[](4);

        VaultMethodSchema memory stakeMethod;
        stakeMethod.name = "stake";
        stakeMethod.description = "Stake tokens on Blue or Red";
        stakeMethod.isWriteMethod = true;
        stakeMethod.inputs = new FieldDescriptor[](2);
        stakeMethod.inputs[0] = FieldDescriptor("amount", "uint256", "Tokens to stake", 18);
        stakeMethod.inputs[1] = FieldDescriptor("team", "uint8", "1 for Blue, 2 for Red", 0);
        stakeMethod.approvals = new ApproveAction[](1);
        stakeMethod.approvals[0] = ApproveAction("taxToken", "amount");
        schema.methods[0] = stakeMethod;

        VaultMethodSchema memory unstakeMethod;
        unstakeMethod.name = "unstake";
        unstakeMethod.description = "Withdraw staked tokens. Rewards stay claimable.";
        unstakeMethod.isWriteMethod = true;
        unstakeMethod.inputs = new FieldDescriptor[](1);
        unstakeMethod.inputs[0] = FieldDescriptor("amount", "uint256", "Tokens to withdraw", 18);
        schema.methods[1] = unstakeMethod;

        schema.methods[2].name = "claimRewards";
        schema.methods[2].description = "Claim BNB staking rewards";
        schema.methods[2].isWriteMethod = true;
        schema.methods[3].name = "claimCaptain";
        schema.methods[3].description = "Claim the captain's BNB revenue share";
        schema.methods[3].isWriteMethod = true;
    }

    /// @notice Version of this vault implementation for Guardian upgrades.
    function version() external pure returns (string memory) {
        return "v1.0.0";
    }

    function _previewSync() private view returns (RevenueSync memory next) {
        next.balance = address(this).balance;
        next.revenue = next.balance - _baseline;
        (uint256 captainPart, uint256 stakerPart) = TugMath.split(next.revenue, _captainShareBps);
        next.toCaptains = captainPart;

        (uint256 blueCaptain, uint256 redCaptain) = TugMath.split(captainPart, _finalBlueShareBps);
        next.captainAccrued = _captainAccrued;
        next.captainAccrued.blue += blueCaptain;
        next.captainAccrued.red += redCaptain;
        next.accRewardPerShare = _accRewardPerShare;

        uint256 available = stakerPart + _undistributed;
        TeamPair memory staked = _totalStaked;
        if (staked.blue == 0 && staked.red == 0) {
            next.undistributed = available;
            return next;
        }

        if (staked.blue == 0) next.toStakers.red = available;
        else if (staked.red == 0) next.toStakers.blue = available;
        else (next.toStakers.blue, next.toStakers.red) = TugMath.split(available, _finalBlueShareBps);

        if (staked.blue != 0) {
            next.accRewardPerShare.blue += FixedPointMathLib.fullMulDiv(next.toStakers.blue, REWARD_SCALE, staked.blue);
        }
        if (staked.red != 0) {
            next.accRewardPerShare.red += FixedPointMathLib.fullMulDiv(next.toStakers.red, REWARD_SCALE, staked.red);
        }
    }

    function _sync() private {
        RevenueSync memory next = _previewSync();
        _baseline = next.balance;
        _undistributed = next.undistributed;
        _captainAccrued = next.captainAccrued;
        _accRewardPerShare = next.accRewardPerShare;
        emit Synced(next.revenue, next.toCaptains, next.toStakers.blue, next.toStakers.red, next.undistributed);
    }

    function _settle(address staker, uint8 team) private {
        uint256 accumulator = _forTeam(_accRewardPerShare, team);
        uint256 earned = FixedPointMathLib.fullMulDiv(stakeOf[staker], accumulator - _rewardDebt[staker], REWARD_SCALE);
        _rewardDebt[staker] = accumulator;
        if (earned != 0) _owed[staker] += earned;
    }

    function _payBnb(address to, uint256 amount) private {
        _baseline -= amount;
        (bool success,) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function _effectiveTeam(address staker) private view returns (uint8 team) {
        team = stakerTeam[staker];
        if (team == Team.NONE) team = ITugLauncher(launcher).teamOf(staker);
    }

    function _captainTeam(address captain) private view returns (uint8) {
        ITugLauncher game = ITugLauncher(launcher);
        if (captain == game.captainBlue()) return Team.BLUE;
        if (captain == game.captainRed()) return Team.RED;
        return Team.NONE;
    }

    function _validateTeam(uint8 team) private pure {
        if (team != Team.BLUE && team != Team.RED) revert InvalidTeam();
    }

    function _forTeam(TeamPair memory pair, uint8 team) private pure returns (uint256) {
        return team == Team.BLUE ? pair.blue : pair.red;
    }
}
