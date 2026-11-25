// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IFlapTriggerService {

    // ── Enums ────────────────────────────────────────────────────────────────

    enum TriggerStatus {
        PENDING,   // 0 — Request created, waiting to be executed
        EXECUTED,  // 1 — Successfully executed by the backend
        FAILED     // 2 — Execution attempted but the callback reverted
    }

    // ── Structs ──────────────────────────────────────────────────────────────

    /// @notice Packed into two 32-byte storage slots.
    /// Slot 0: status (8 bits) | executeAfter (64 bits) | requester (160 bits) | 24 bits reserved
    /// Slot 1: feePaid (128 bits)
    struct TriggerRequest {
        address requester;    // 160 bits — address that requested the trigger
        uint64 executeAfter;  // 64 bits  — Unix timestamp lower bound for execution
        TriggerStatus status; // 8 bits   — current lifecycle status
        uint128 feePaid;      // 128 bits — native fee paid in wei (slot 1)
    }

    // ── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new trigger request is created.
    event FlapTriggerRequested(
        uint256 requestId,
        address indexed requester,
        uint64 executeAfter,
        uint256 gasFeesPaid
    );

    /// @notice Emitted when a trigger execution is attempted (success or failure).
    event FlapTriggerExecuted(uint256 requestId, bool success, bytes data);

    /// @notice Emitted when a trigger is skipped (invalid ID, wrong status, or not yet due).
    event FlapTriggerSkipped(uint256 requestId, string reason);

    /// @notice Emitted when the required gas fee is updated by admin.
    event FlapTriggerGasFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @notice Emitted when the maximum callback gas limit is updated by admin.
    event FlapTriggerMaxCallbackGasUpdated(uint256 oldLimit, uint256 newLimit);

    // ── Errors ───────────────────────────────────────────────────────────────

    /// @notice msg.value is below the required fee.
    error InsufficientGasFee(uint256 required, uint256 provided);

    /// @notice Request is not in PENDING status.
    error InvalidRequestStatus(uint256 requestId, TriggerStatus currentStatus);

    /// @notice block.timestamp is before executeAfter.
    error TooEarly(uint256 requestId, uint64 executeAfter, uint256 currentTime);

    /// @notice The provided requestId does not exist.
    error InvalidRequestId(uint256 requestId);

    /// @notice Caller does not have TRIGGER_ROLE.
    error OnlyTriggerRole();

    /// @notice Admin tried to set an invalid gas fee (e.g., zero).
    error InvalidGasFee();

    /// @notice Admin tried to set an invalid gas limit (e.g., zero or too high).
    error InvalidGasLimit();

    /// @notice Fee receiver address is invalid (e.g., zero address).
    error InvalidFeeReceiver();

    /// @notice A retried trigger callback reverted.
    error RetryFailed(uint256 requestId, bytes data);

    /// @notice msg.value overflows uint128 and cannot be stored as feePaid.
    error FeePaidOverflow(uint256 provided);

    // ── Write methods ────────────────────────────────────────────────────────

    /// @notice Request a trigger callback at or after a specified time.
    /// @param executeAfter Unix timestamp after which execution may happen. Pass 0 for immediate.
    /// @return requestId   Unique ID for this trigger request.
    /// Requirements: msg.value >= getFee(); if executeAfter > 0, must be >= block.timestamp.
    function requestTrigger(uint64 executeAfter) external payable returns (uint256 requestId);

    /// @notice Execute a single pending trigger (backend only, requires TRIGGER_ROLE).
    /// @param requestId  The ID of the request to execute.
    function trigger(uint256 requestId) external;

    /// @notice Execute multiple pending triggers in one transaction (backend only, requires TRIGGER_ROLE).
    /// @param requestIds  Array of request IDs to execute. Invalid or already-done IDs are skipped.
    function triggerMultiple(uint256[] calldata requestIds) external;

    /// @notice Retry a previously failed trigger request. Callable by anyone.
    ///         Forwards all available gas; reverts with RetryFailed on failure.
    /// @param requestId  The ID of the FAILED request to retry.
    function retryTrigger(uint256 requestId) external;

    // ── View methods ─────────────────────────────────────────────────────────

    /// @notice The native-currency fee (wei) required as msg.value for requestTrigger().
    function getFee() external view returns (uint256 gasFee);

    /// @notice Maximum gas forwarded to a requester's callback. Callbacks must fit within this.
    function getMaxCallbackGas() external view returns (uint256 maxGas);

    /// @notice Get details about a single trigger request. Reverts for unknown IDs.
    function getRequest(uint256 requestId) external view returns (TriggerRequest memory request);

    /// @notice Total number of trigger requests ever created (= next request ID).
    function getRequestCount() external view returns (uint256 count);

    /// @notice True if the request exists, is PENDING, and block.timestamp >= executeAfter.
    function isRequestReady(uint256 requestId) external view returns (bool ready);

    /// @notice Fetch multiple requests by ID in one call. Unknown IDs return zero-initialised structs.
    function getRequests(uint256[] calldata requestIds) external view returns (TriggerRequest[] memory requests);

    /// @notice Paginated list of all requests, newest first (descending by ID).
    /// @param offset  Requests to skip from the newest.
    /// @param limit   Maximum number to return.
    function getRequestsPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (TriggerRequest[] memory requests, uint256 total);

    /// @notice Paginated list of requests for a specific requester address, newest first.
    /// @param requester  Address whose requests to query.
    /// @param offset     Requests to skip from the newest.
    /// @param limit      Maximum number to return.
    function getRequestsByRequesterPaginated(address requester, uint256 offset, uint256 limit)
        external
        view
        returns (TriggerRequest[] memory requests, uint256 total);
}

/// @notice Interface that requester contracts must implement to receive trigger callbacks.
interface ITriggerReceiver {
    /// @notice Called by FlapTriggerService when a scheduled trigger executes.
    /// @dev MUST validate msg.sender == triggerService address.
    ///      SHOULD implement reentrancy guard.
    ///      MUST complete within getMaxCallbackGas().
    ///      MUST NOT assume execution at exactly executeAfter — delays are possible.
    /// @param requestId  ID of the trigger request being executed.
    function trigger(uint256 requestId) external;
}