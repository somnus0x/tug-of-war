// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

import {Distribution, DistributionTarget} from "src/flap/Distribution.sol";
import {IFlapTriggerService} from "src/flap/IFlapTriggerService.sol";
import {IPortal, IPortalTypes} from "src/flap/IPortal.sol";
import {IStrategy} from "src/flap/IStrategy.sol";
import {LaunchExtensionHelper} from "src/flap/LaunchExtensionHelper.sol";
import {LauncherBase} from "src/flap/LauncherBase.sol";
import {LauncherDescription, LauncherHelper} from "src/flap/LauncherHelper.sol";
import {IPortalFloor} from "src/interfaces/IPortalFloor.sol";
import {ITugLauncher} from "src/interfaces/ITugLauncher.sol";
import {
    CaptainAllocView,
    GameView,
    Phase,
    PlayerView,
    RulesView,
    Team,
    TeamFlags,
    TeamPair,
    TugConfig
} from "src/interfaces/TugTypes.sol";
import {TugMath} from "src/libraries/TugMath.sol";

uint256 constant TUG_TOTAL_SUPPLY = 1_000_000 ether;
uint16 constant TUG_POOL_BPS = 5_000;
uint256 constant TUG_POOL_TOKEN = TUG_TOTAL_SUPPLY * uint256(TUG_POOL_BPS) / TugMath.BPS;

contract TugLauncher is LauncherBase, Initializable, IStrategy, ReentrancyGuard, ITugLauncher {
    uint16 private constant BASE_BPS = 3_500;
    uint16 private constant BONUS_AND_CAPTAIN_BPS = 1_500;
    uint256 private constant RESERVE = TUG_TOTAL_SUPPLY - TUG_POOL_TOKEN;
    uint256 private constant BASE_TOTAL = TUG_TOTAL_SUPPLY * uint256(BASE_BPS) / TugMath.BPS;
    uint16 private constant BUY_TAX_BPS = 300;
    uint16 private constant SELL_TAX_BPS = 500;
    uint16 private constant VAULT_FEE_BPS = 8_000;
    uint16 private constant DEFLATION_FEE_BPS = 2_000;
    uint32 private constant TAX_DURATION = 30 days;
    uint32 private constant ANTI_FARMER_DURATION = 1 days;
    uint64 private constant OVERTIME_WINDOW = 60 seconds;
    uint64 private constant OVERTIME_EXTENSION = 30 seconds;
    uint8 private constant MAX_EXTENSIONS = 5;
    uint64 private constant LAUNCH_GRACE = 24 hours;
    uint8 private constant LAUNCH_KIND = uint8(IPortalTypes.LaunchKind.DIRECT_V2_POOL_TAX);

    address private _hub;
    address public creator;
    address public factory;
    address public triggerService;
    address public token;
    address public pool;
    address public vault;

    TugConfig private _config;
    TeamFlags private _captainDeposited;
    uint64 private _acceptDeadline;
    uint64 public gameStart;
    uint64 private _originalDeadline;
    uint64 public deadline;
    uint8 private _extensionsUsed;
    uint64 private _launchedAt;
    bool private _cancelled;
    bool public launched;
    bool public launching;
    bool private _distributionInitialized;
    uint16 public finalBlueShareBps;

    uint256 public raised;
    TeamPair private _raisedByTeam;
    TeamPair private _pullByTeam;
    TeamPair private _playersByTeam;
    mapping(address => uint8) public teamOf;
    mapping(address => uint256) public contribution;
    mapping(address => uint256) public pullOf;
    mapping(address => uint256) private _claimed;
    TeamPair private _captainAlloc;
    TeamPair private _captainClaimed;

    uint256 public autoLaunchRequestId;
    uint256 public triggerBudget;
    address private _triggerFunder;
    uint64 private _scheduledDeadline;

    error InvalidSaltLockPayment();
    error DescriptionTooLong();
    error InvalidDistribution();

    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize a newly deployed proxy and reserve the game's token salt.
    function initialize(address hub, address creator_, TugConfig calldata config, address triggerService_)
        external
        payable
        initializer
        nonReentrant
    {
        _hub = hub;
        creator = creator_;
        factory = msg.sender;
        triggerService = triggerService_;
        _config = config;
        _acceptDeadline = uint64(block.timestamp) + config.acceptWindow;

        if (bytes(LauncherHelper.toJson(_description())).length >= 4_096) revert DescriptionTooLong();
        uint256 fee = IPortal(hub).SALT_LOCK_FEE();
        if (msg.value != fee) revert InvalidSaltLockPayment();
        IPortal(hub).lockSalt{value: fee}(config.salt, LAUNCH_KIND);
    }

    function depositCaptain() external payable {
        uint8 team = _captainTeam(msg.sender);
        _revertWith(_checkCaptainDeposit(team, msg.value));

        if (team == Team.BLUE) _captainDeposited.blue = true;
        else _captainDeposited.red = true;
        _addContribution(msg.sender, team, msg.value, TugMath.pull(msg.value, TugMath.START_WEIGHT_BPS));
        emit CaptainDeposited(msg.sender, team, msg.value);

        if (_captainDeposited.blue && _captainDeposited.red) {
            gameStart = uint64(block.timestamp);
            deadline = gameStart + _config.duration;
            _originalDeadline = deadline;
            emit GameStarted(gameStart, deadline);
        }
    }

    function cancel() external nonReentrant {
        _revertWith(_checkCancel());
        _cancelled = true;

        address captain;
        if (_captainDeposited.blue) captain = _config.captainBlue;
        else if (_captainDeposited.red) captain = _config.captainRed;
        uint256 amount = contribution[captain];
        if (amount != 0) {
            contribution[captain] = 0;
            _sendBnb(captain, amount);
        }
        emit Cancelled(captain, amount);
    }

    function contribute(uint8 team) external payable {
        _revertWith(_checkContribute(msg.sender, team, msg.value));
        uint16 weight = _currentWeight();
        uint256 addedPull = TugMath.pull(msg.value, weight);
        TeamPair memory projected = _projectPull(team, addedPull);
        bool extend = _wouldExtend(projected);

        _addContribution(msg.sender, team, msg.value, addedPull);
        emit Contributed(msg.sender, team, msg.value, addedPull, weight, ropeBps());
        if (extend) {
            deadline += OVERTIME_EXTENSION;
            ++_extensionsUsed;
            emit Overtime(deadline, _extensionsUsed);
        }
    }

    function launch() external nonReentrant {
        _revertWith(_checkLaunch());
        _launch();
    }

    function initializeDistribution(address token_, uint256 amount, bytes calldata, bytes32) external onlyHub {
        if (!launching || _distributionInitialized || amount != RESERVE || token_ == address(0)) {
            revert InvalidDistribution();
        }
        _distributionInitialized = true;
        if (!SafeTransferLib.trySafeTransferFrom(token_, msg.sender, address(this), amount)) revert TransferFailed();
        emit FlapDistributionInitialized(token_, amount);
    }

    function refund() external nonReentrant {
        _revertWith(_checkRefund(msg.sender));
        uint256 amount = contribution[msg.sender];
        contribution[msg.sender] = 0;
        _sendBnb(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    function claim() external nonReentrant {
        PlayerView memory player = getPlayer(msg.sender);
        _revertWith(_checkClaim(player.claimable));
        _claimed[msg.sender] += player.claimable;
        _sendTokens(msg.sender, player.claimable);
        emit Claimed(msg.sender, player.baseEntitlement, player.bonusEntitlement);
    }

    function claimCaptain() external nonReentrant {
        CaptainAllocView memory captain = getCaptain(msg.sender);
        _revertWith(_checkCaptainClaim(captain));

        if (captain.team == Team.BLUE) _captainClaimed.blue = captain.vested;
        else _captainClaimed.red = captain.vested;
        _sendTokens(msg.sender, captain.claimable);
        emit CaptainVested(msg.sender, captain.claimable);
    }

    function scheduleAutoLaunch() external payable nonReentrant {
        _revertWith(_checkSchedule());
        IFlapTriggerService service = IFlapTriggerService(triggerService);
        uint256 fee = service.getFee();
        if (msg.value < fee * (1 + uint256(MAX_EXTENSIONS))) revert InsufficientTriggerFee();

        _triggerFunder = msg.sender;
        triggerBudget = msg.value - fee;
        _scheduledDeadline = deadline;
        autoLaunchRequestId = service.requestTrigger{value: fee}(deadline);
        emit AutoLaunchScheduled(autoLaunchRequestId, deadline);
    }

    function trigger(uint256 requestId) external nonReentrant {
        if (msg.sender != triggerService) revert OnlyTriggerService();
        if (requestId != autoLaunchRequestId || _triggerFunder == address(0)) return;

        uint8 currentPhase = phase();
        if (currentPhase == Phase.BUY_IN) {
            if (block.timestamp >= _scheduledDeadline && deadline > _scheduledDeadline) _reschedule(requestId);
            return;
        }
        if (currentPhase != Phase.AWAITING_LAUNCH || _checkLaunch() != bytes4(0)) return;
        _launch();
    }

    function withdrawTriggerBudget() external nonReentrant {
        if (msg.sender != _triggerFunder) revert NotTriggerFunder();
        uint8 currentPhase = phase();
        if (currentPhase != Phase.LAUNCHED && currentPhase != Phase.REFUNDING) revert TriggerBudgetLocked();
        uint256 amount = triggerBudget;
        if (amount == 0) revert NothingToClaim();

        triggerBudget = 0;
        _sendBnb(msg.sender, amount);
        emit TriggerBudgetWithdrawn(msg.sender, amount);
    }

    function getGame() external view returns (GameView memory game) {
        game.launcher = address(this);
        game.creator = creator;
        game.factory = factory;
        game.config = _config;
        game.phase = phase();
        game.captainDeposited = _captainDeposited;
        game.acceptDeadline = _acceptDeadline;
        game.gameStart = gameStart;
        game.originalDeadline = _originalDeadline;
        game.deadline = deadline;
        game.extensionsUsed = _extensionsUsed;
        game.currentWeightBps = _currentWeight();
        game.raised = raised;
        game.raisedByTeam = _raisedByTeam;
        game.pullByTeam = _pullByTeam;
        game.playersByTeam = _playersByTeam;
        game.ropeBps = ropeBps();
        game.autoLaunchRequestId = autoLaunchRequestId;
        game.triggerBudget = triggerBudget;
        game.triggerFunder = _triggerFunder;
        game.token = token;
        game.pool = pool;
        game.vault = vault;
        game.finalBlueShareBps = finalBlueShareBps;
    }

    function getPlayer(address player) public view returns (PlayerView memory info) {
        info.team = teamOf[player];
        info.contribution = contribution[player];
        info.pull = pullOf[player];
        info.claimed = _claimed[player];
        info.remainingCap = _config.walletCap - info.contribution;
        if (launched) {
            info.baseEntitlement = TugMath.baseShare(BASE_TOTAL, info.contribution, raised);
            uint256 bonusTotal = _tokenAmount(BONUS_AND_CAPTAIN_BPS - _config.captainAllocBps);
            (uint256 blueBonus, uint256 redBonus) = TugMath.split(bonusTotal, finalBlueShareBps);
            if (info.team == Team.BLUE) {
                info.bonusEntitlement = TugMath.playerBonus(blueBonus, info.pull, _pullByTeam.blue);
            }
            if (info.team == Team.RED) {
                info.bonusEntitlement = TugMath.playerBonus(redBonus, info.pull, _pullByTeam.red);
            }
            info.claimable = info.baseEntitlement + info.bonusEntitlement - info.claimed;
        } else if (_checkRefund(player) == bytes4(0)) {
            info.refundable = info.contribution;
        }
    }

    function getCaptain(address captain) public view returns (CaptainAllocView memory info) {
        info.team = _captainTeam(captain);
        if (info.team == Team.NONE) return info;

        info.deposited = captainIn(info.team);
        info.allocation = info.team == Team.BLUE ? _captainAlloc.blue : _captainAlloc.red;
        info.claimed = info.team == Team.BLUE ? _captainClaimed.blue : _captainClaimed.red;
        if (launched) {
            info.vestEnd = _launchedAt + _config.captainVestDuration;
            info.vested = TugMath.vested(info.allocation, _launchedAt, _config.captainVestDuration, block.timestamp);
            info.claimable = info.vested - info.claimed;
        }
    }

    function getRules() external view returns (RulesView memory rules) {
        rules.buyTaxBps = BUY_TAX_BPS;
        rules.sellTaxBps = SELL_TAX_BPS;
        rules.vaultFeeBps = VAULT_FEE_BPS;
        rules.deflationFeeBps = DEFLATION_FEE_BPS;
        rules.captainShareBps = _config.captainShareBps;
        rules.poolAllocBps = TUG_POOL_BPS;
        rules.baseAllocBps = BASE_BPS;
        rules.bonusAllocBps = BONUS_AND_CAPTAIN_BPS - _config.captainAllocBps;
        rules.captainAllocBps = _config.captainAllocBps;
        rules.maxBonusShareBps = _config.maxBonusShareBps;
        rules.captainVestDuration = _config.captainVestDuration;
        rules.taxDuration = TAX_DURATION;
        rules.antiFarmerDuration = ANTI_FARMER_DURATION;
        rules.startWeightBps = TugMath.START_WEIGHT_BPS;
        rules.overtimeWindow = OVERTIME_WINDOW;
        rules.overtimeExtension = OVERTIME_EXTENSION;
        rules.maxExtensions = MAX_EXTENSIONS;
        rules.launchGrace = LAUNCH_GRACE;
    }

    function canDepositCaptain(address captain, uint256 amount) external view returns (bool ok, bytes4 reason) {
        reason = _checkCaptainDeposit(_captainTeam(captain), amount);
        return (reason == bytes4(0), reason);
    }

    function canCancel() external view returns (bool ok, bytes4 reason) {
        reason = _checkCancel();
        return (reason == bytes4(0), reason);
    }

    function canScheduleAutoLaunch() external view returns (bool ok, bytes4 reason) {
        reason = _checkSchedule();
        return (reason == bytes4(0), reason);
    }

    function canContribute(address player, uint8 team, uint256 amount) external view returns (bool ok, bytes4 reason) {
        reason = _checkContribute(player, team, amount);
        return (reason == bytes4(0), reason);
    }

    function canLaunch() external view returns (bool ok, bytes4 reason) {
        reason = _checkLaunch();
        return (reason == bytes4(0), reason);
    }

    function canRefund(address player) external view returns (bool ok, bytes4 reason) {
        reason = _checkRefund(player);
        return (reason == bytes4(0), reason);
    }

    function canClaim(address player) external view returns (bool ok, bytes4 reason) {
        reason = _checkClaim(getPlayer(player).claimable);
        return (reason == bytes4(0), reason);
    }

    function canClaimCaptain(address captain) external view returns (bool ok, bytes4 reason) {
        reason = _checkCaptainClaim(getCaptain(captain));
        return (reason == bytes4(0), reason);
    }

    function previewContribute(uint8 team, uint256 amount)
        external
        view
        returns (uint256 pull, uint16 newRopeBps, bool wouldTriggerOvertime)
    {
        if (!_validTeam(team)) revert InvalidTeam();
        pull = TugMath.pull(amount, _currentWeight());
        TeamPair memory projected = _projectPull(team, pull);
        newRopeBps = TugMath.ropeBps(projected.blue, projected.red);
        wouldTriggerOvertime = phase() == Phase.BUY_IN && _wouldExtend(projected);
    }

    function autoLaunchQuote() external view returns (uint256) {
        return IFlapTriggerService(triggerService).getFee() * (1 + uint256(MAX_EXTENSIONS));
    }

    function phase() public view returns (uint8) {
        if (_cancelled) return Phase.CANCELLED;
        if (launched) return Phase.LAUNCHED;
        if (!_captainDeposited.blue || !_captainDeposited.red) return Phase.AWAITING_CAPTAINS;
        if (block.timestamp < deadline) return Phase.BUY_IN;
        if (raised < _config.minRaise || _graceExpired()) return Phase.REFUNDING;
        return Phase.AWAITING_LAUNCH;
    }

    function ropeBps() public view returns (uint16) {
        return TugMath.ropeBps(_pullByTeam.blue, _pullByTeam.red);
    }

    function captainBlue() external view returns (address) {
        return _config.captainBlue;
    }

    function captainRed() external view returns (address) {
        return _config.captainRed;
    }

    function captainIn(uint8 team) public view returns (bool) {
        if (!_validTeam(team)) revert InvalidTeam();
        return team == Team.BLUE ? _captainDeposited.blue : _captainDeposited.red;
    }

    function minRaise() external view returns (uint256) {
        return _config.minRaise;
    }

    function _checkCaptainDeposit(uint8 team, uint256 amount) private view returns (bytes4) {
        if (phase() == Phase.CANCELLED) return GameCancelled.selector;
        if (team == Team.NONE) return NotCaptain.selector;
        if (captainIn(team)) return CaptainAlreadyIn.selector;
        if (block.timestamp >= _acceptDeadline) return AcceptWindowClosed.selector;
        if (amount < _config.captainMinDeposit) return BelowCaptainMinimum.selector;
        if (amount > _config.walletCap) return WalletCapExceeded.selector;
        return bytes4(0);
    }

    function _checkCancel() private view returns (bytes4) {
        uint8 currentPhase = phase();
        if (currentPhase == Phase.CANCELLED) return GameCancelled.selector;
        if (currentPhase != Phase.AWAITING_CAPTAINS) return NotCancellable.selector;
        if (block.timestamp < _acceptDeadline) return AcceptWindowOpen.selector;
        return bytes4(0);
    }

    function _checkContribute(address player, uint8 team, uint256 amount) private view returns (bytes4) {
        uint8 currentPhase = phase();
        if (currentPhase == Phase.CANCELLED) return GameCancelled.selector;
        if (currentPhase == Phase.LAUNCHED) return AlreadyLaunched.selector;
        if (currentPhase == Phase.AWAITING_CAPTAINS) return CaptainsNotIn.selector;
        if (currentPhase != Phase.BUY_IN) return BuyInClosed.selector;
        if (!_validTeam(team)) return InvalidTeam.selector;
        if (teamOf[player] != Team.NONE && teamOf[player] != team) return TeamLocked.selector;
        if (amount == 0) return ZeroContribution.selector;
        if (amount > _config.walletCap - contribution[player]) return WalletCapExceeded.selector;
        return bytes4(0);
    }

    function _checkSchedule() private view returns (bytes4) {
        uint8 currentPhase = phase();
        if (currentPhase == Phase.CANCELLED) return GameCancelled.selector;
        if (currentPhase == Phase.LAUNCHED) return AlreadyLaunched.selector;
        if (currentPhase == Phase.AWAITING_CAPTAINS) return GameNotStarted.selector;
        if (block.timestamp > deadline) return BuyInClosed.selector;
        if (_triggerFunder != address(0)) return AutoLaunchAlreadyScheduled.selector;
        return bytes4(0);
    }

    function _checkLaunch() private view returns (bytes4) {
        uint8 currentPhase = phase();
        if (currentPhase == Phase.CANCELLED) return GameCancelled.selector;
        if (currentPhase == Phase.LAUNCHED) return AlreadyLaunched.selector;
        if (currentPhase == Phase.AWAITING_CAPTAINS) return GameNotStarted.selector;
        if (currentPhase == Phase.BUY_IN) return BuyInOpen.selector;
        if (_graceExpired()) return LaunchGraceExpired.selector;
        if (raised < _config.minRaise) return BelowMinRaise.selector;
        return _checkPortalFloor();
    }

    function _checkRefund(address player) private view returns (bytes4) {
        uint8 currentPhase = phase();
        if (currentPhase == Phase.CANCELLED) return GameCancelled.selector;
        if (currentPhase == Phase.LAUNCHED) return AlreadyLaunched.selector;
        if (currentPhase == Phase.AWAITING_CAPTAINS) return GameNotStarted.selector;
        if (currentPhase == Phase.BUY_IN) return BuyInOpen.selector;
        if (currentPhase != Phase.REFUNDING) return MinRaiseMet.selector;
        if (contribution[player] == 0) return NothingToRefund.selector;
        return bytes4(0);
    }

    function _checkClaim(uint256 claimable) private view returns (bytes4) {
        if (phase() != Phase.LAUNCHED) return NotLaunched.selector;
        return claimable == 0 ? NothingToClaim.selector : bytes4(0);
    }

    function _checkCaptainClaim(CaptainAllocView memory captain) private view returns (bytes4) {
        if (captain.team == Team.NONE) return NotCaptain.selector;
        return _checkClaim(captain.claimable);
    }

    function _checkPortalFloor() private view returns (bytes4) {
        IPortalFloor portalFloor = IPortalFloor(_hub);
        uint256 price;
        try portalFloor.launchQuoteConfig(LAUNCH_KIND, address(0)) returns (bool enabled, uint256 quotePriceUsd) {
            if (!enabled || quotePriceUsd == 0) return CreationFloorUnavailable.selector;
            price = quotePriceUsd;
        } catch {
            return CreationFloorUnavailable.selector;
        }

        IPortalFloor.GraduationFloorParams memory params = IPortalFloor.GraduationFloorParams(
            address(0), price, raised, TUG_POOL_TOKEN, TUG_TOTAL_SUPPLY, _config.vaultFactory
        );
        try portalFloor.graduationFloorV2ForLauncher(params, address(this)) returns (
            IPortalFloor.GraduationFloorResultV2 memory floor
        ) {
            return floor.meetsCreateFloor ? bytes4(0) : BelowCreationFloor.selector;
        } catch {
            return CreationFloorUnavailable.selector;
        }
    }

    function _launch() private {
        finalBlueShareBps = TugMath.finalBlueShareBps(_pullByTeam.blue, _pullByTeam.red, _config.maxBonusShareBps);
        (_captainAlloc.blue, _captainAlloc.red) =
            TugMath.split(_tokenAmount(_config.captainAllocBps), finalBlueShareBps);
        launching = true;
        Distribution memory distribution =
            Distribution(DistributionTarget.EXPLICIT, address(this), uint128(RESERVE), "");
        IPortalTypes.CreatorBuyParams memory creatorBuy;
        (token, pool) = IPortal(_hub).launchTaxTokenV2{value: raised}(_buildParams(), distribution, creatorBuy);
        if (!_distributionInitialized) revert InvalidDistribution();
        (vault,) = IPortal(_hub).getLaunchVault(token);
        launching = false;
        launched = true;
        _launchedAt = uint64(block.timestamp);
        emit Launched(token, pool, vault, raised, finalBlueShareBps);
    }

    function _reschedule(uint256 requestId) private {
        IFlapTriggerService service = IFlapTriggerService(triggerService);
        uint256 fee = service.getFee();
        if (fee > triggerBudget) {
            emit AutoLaunchStopped(requestId);
            return;
        }
        try service.requestTrigger{value: fee}(deadline) returns (uint256 nextRequestId) {
            autoLaunchRequestId = nextRequestId;
            _scheduledDeadline = deadline;
            triggerBudget -= fee;
            emit AutoLaunchScheduled(nextRequestId, deadline);
        } catch {
            emit AutoLaunchStopped(requestId);
        }
    }

    function _buildParams() private view returns (IPortalTypes.CreateTaxTokenParams memory params) {
        params.name = _config.name;
        params.symbol = _config.symbol;
        params.meta = _config.meta;
        params.totalSupply = TUG_TOTAL_SUPPLY;
        params.salt = _config.salt;
        params.poolQuote = raised;
        params.poolToken = TUG_POOL_TOKEN;
        params.buyTaxRate = BUY_TAX_BPS;
        params.sellTaxRate = SELL_TAX_BPS;
        params.taxDuration = TAX_DURATION;
        params.antiFarmerDuration = ANTI_FARMER_DURATION;
        params.feeConfigs = _feeConfigs();
        params.exemptAddrs = new address[](0);
        (params.extensionID, params.extensionData) = LaunchExtensionHelper.encodeCreator(creator);
    }

    function _feeConfigs() private view returns (IPortalTypes.FeeConfig[] memory fees) {
        fees = new IPortalTypes.FeeConfig[](2);
        fees[0] = IPortalTypes.FeeConfig(
            IPortalTypes.FeeSlotType.VAULT,
            VAULT_FEE_BPS,
            abi.encode(IPortalTypes.FeeConfigVault(_config.vaultFactory, abi.encode(address(this))))
        );
        fees[1] = IPortalTypes.FeeConfig(IPortalTypes.FeeSlotType.DEFLATION, DEFLATION_FEE_BPS, "");
    }

    function _description() internal view override returns (LauncherDescription memory description_) {
        description_.name = _config.name;
        description_.symbol = _config.symbol;
        description_.targetRaise = _config.minRaise;
        description_.poolTokenRatio = 0.5 ether;
        description_.titleEn = "Tug of War";
        description_.titleZh = unicode"拔河";
        description_.summaryEn =
            "Back a captain. Early contributions pull harder, and the final rope splits the rewards.";
        description_.summaryZh = unicode"支持一位队长。越早参与，拉力越大。最终拉力决定奖励分配。";
    }

    function _getHub() internal view override returns (address) {
        return _hub;
    }

    function _addContribution(address player, uint8 team, uint256 amount, uint256 addedPull) private {
        if (teamOf[player] == Team.NONE) {
            teamOf[player] = team;
            if (team == Team.BLUE) ++_playersByTeam.blue;
            else ++_playersByTeam.red;
        }
        contribution[player] += amount;
        pullOf[player] += addedPull;
        raised += amount;
        if (team == Team.BLUE) {
            _raisedByTeam.blue += amount;
            _pullByTeam.blue += addedPull;
        } else {
            _raisedByTeam.red += amount;
            _pullByTeam.red += addedPull;
        }
    }

    function _projectPull(uint8 team, uint256 addedPull) private view returns (TeamPair memory projected) {
        projected = _pullByTeam;
        if (team == Team.BLUE) projected.blue += addedPull;
        else projected.red += addedPull;
    }

    function _wouldExtend(TeamPair memory projected) private view returns (bool) {
        return deadline - block.timestamp <= OVERTIME_WINDOW && _extensionsUsed < MAX_EXTENSIONS
            && TugMath.leader(_pullByTeam.blue, _pullByTeam.red) != TugMath.leader(projected.blue, projected.red);
    }

    function _currentWeight() private view returns (uint16) {
        if (gameStart == 0) return TugMath.START_WEIGHT_BPS;
        return TugMath.timeWeightBps(gameStart, _originalDeadline, block.timestamp);
    }

    function _graceExpired() private view returns (bool) {
        return block.timestamp >= uint256(deadline) + LAUNCH_GRACE;
    }

    function _captainTeam(address captain) private view returns (uint8) {
        if (captain == _config.captainBlue) return Team.BLUE;
        if (captain == _config.captainRed) return Team.RED;
        return Team.NONE;
    }

    function _validTeam(uint8 team) private pure returns (bool) {
        return team == Team.BLUE || team == Team.RED;
    }

    function _tokenAmount(uint16 shareBps) private pure returns (uint256 amount) {
        (amount,) = TugMath.split(TUG_TOTAL_SUPPLY, shareBps);
    }

    function _sendBnb(address to, uint256 amount) private {
        (bool sent,) = to.call{value: amount}("");
        if (!sent) revert TransferFailed();
    }

    function _sendTokens(address to, uint256 amount) private {
        (bool sent, bytes memory result) = token.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!sent || (result.length != 0 && (result.length != 32 || uint256(bytes32(result)) != 1))) {
            revert TransferFailed();
        }
    }

    function _revertWith(bytes4 reason) private pure {
        if (reason == bytes4(0)) return;
        assembly ("memory-safe") {
            mstore(0, reason)
            revert(0, 4)
        }
    }
}
