// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SubscriptionManager
 * @notice On-chain subscription system: users subscribe to a recipient with a fixed amount and frequency.
 *         Payments are made in ERC20 (e.g. USDC). Frontend/backend can sync via events.
 */
contract SubscriptionManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Frequency {
        Weekly,
        Monthly,
        Yearly
    }

    struct Subscription {
        uint256 id;
        address subscriber;
        address recipient;
        uint256 amountPerCycle;  // in token base units (e.g. 6 decimals for USDC)
        Frequency frequency;
        uint256 nextDueAt;       // unix timestamp
        bool active;
        uint256 createdAt;
    }

    IERC20 public immutable paymentToken;

    uint256 public nextSubscriptionId;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) private _subscriptionsBySubscriber;

    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed recipient,
        uint256 amountPerCycle,
        Frequency frequency,
        uint256 nextDueAt
    );
    event PaymentMade(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed recipient,
        uint256 amount,
        uint256 nextDueAt,
        uint256 timestamp
    );
    event SubscriptionCancelled(uint256 indexed subscriptionId, address indexed subscriber, address indexed recipient);

    error InvalidRecipient();
    error InvalidAmount();
    error SubscriptionNotFound();
    error SubscriptionInactive();
    error NotSubscriber();
    error PaymentNotDue();
    error TransferFailed();

    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Invalid token");
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Create a new subscription.
     * @param recipient Address that receives payments
     * @param amountPerCycle Amount in token base units per cycle (e.g. 1e6 = 1 USDC for 6 decimals)
     * @param frequency 0 = Weekly, 1 = Monthly, 2 = Yearly
     */
    function subscribe(
        address recipient,
        uint256 amountPerCycle,
        Frequency frequency
    ) external returns (uint256 subscriptionId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amountPerCycle == 0) revert InvalidAmount();

        subscriptionId = nextSubscriptionId++;
        uint256 nextDueAt = _nextDue(block.timestamp, frequency); // First payment due after one period

        subscriptions[subscriptionId] = Subscription({
            id: subscriptionId,
            subscriber: msg.sender,
            recipient: recipient,
            amountPerCycle: amountPerCycle,
            frequency: frequency,
            nextDueAt: nextDueAt,
            active: true,
            createdAt: block.timestamp
        });

        _subscriptionsBySubscriber[msg.sender].push(subscriptionId);

        emit SubscriptionCreated(subscriptionId, msg.sender, recipient, amountPerCycle, frequency, nextDueAt);
        return subscriptionId;
    }

    /**
     * @notice Pay the current cycle for a subscription. Caller must be the subscriber.
     *         Requires prior approval: paymentToken.approve(SubscriptionManager, amount).
     */
    function pay(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (!sub.active) revert SubscriptionInactive();
        if (msg.sender != sub.subscriber) revert NotSubscriber();
        if (block.timestamp < sub.nextDueAt) revert PaymentNotDue();

        uint256 amount = sub.amountPerCycle;
        paymentToken.safeTransferFrom(msg.sender, sub.recipient, amount);

        sub.nextDueAt = _nextDue(sub.nextDueAt, sub.frequency);

        emit PaymentMade(
            subscriptionId,
            sub.subscriber,
            sub.recipient,
            amount,
            sub.nextDueAt,
            block.timestamp
        );
    }

    /**
     * @notice Pay on behalf of a subscriber (e.g. relayer). Subscriber must have approved this contract.
     */
    function payFor(uint256 subscriptionId, address subscriber) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (!sub.active) revert SubscriptionInactive();
        if (sub.subscriber != subscriber) revert NotSubscriber();
        if (block.timestamp < sub.nextDueAt) revert PaymentNotDue();

        uint256 amount = sub.amountPerCycle;
        paymentToken.safeTransferFrom(subscriber, sub.recipient, amount);

        sub.nextDueAt = _nextDue(sub.nextDueAt, sub.frequency);

        emit PaymentMade(
            subscriptionId,
            sub.subscriber,
            sub.recipient,
            amount,
            sub.nextDueAt,
            block.timestamp
        );
    }

    /**
     * @notice Deactivate a subscription. Only subscriber can cancel.
     */
    function cancel(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (msg.sender != sub.subscriber) revert NotSubscriber();

        sub.active = false;
        emit SubscriptionCancelled(subscriptionId, sub.subscriber, sub.recipient);
    }

    function _nextDue(uint256 fromTimestamp, Frequency frequency) internal pure returns (uint256) {
        if (frequency == Frequency.Weekly) {
            return fromTimestamp + 7 days;
        }
        if (frequency == Frequency.Monthly) {
            return fromTimestamp + 30 days; // simplified: 30 days per month
        }
        // Yearly
        return fromTimestamp + 365 days;
    }

    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }

    function getSubscriptionsBySubscriber(address subscriber) external view returns (uint256[] memory) {
        return _subscriptionsBySubscriber[subscriber];
    }

    function isPaymentDue(uint256 subscriptionId) external view returns (bool) {
        Subscription storage sub = subscriptions[subscriptionId];
        return sub.active && sub.subscriber != address(0) && block.timestamp >= sub.nextDueAt;
    }
}
