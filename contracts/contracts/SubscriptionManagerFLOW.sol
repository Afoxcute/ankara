// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SubscriptionManagerFLOW
 * @notice On-chain subscriptions with native PAS (Polkadot Hub). No ERC20; pay() is payable.
 * @dev Contract name kept for deployments/artifacts; token is PAS, not Flow blockchain.
 */
contract SubscriptionManagerFLOW is ReentrancyGuard {
    enum Frequency {
        Weekly,
        Monthly,
        Yearly
    }



// sub done on exit, pay done on entry
    struct Subscription {
        uint256 id;
        address subscriber;
        address recipient;
        uint256 amountPerCycle;  // in wei (18 decimals, native PAS)
        Frequency frequency;
        uint256 nextDueAt;
        bool active;
        uint256 createdAt;
    }

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
    error InsufficientValue();
    error TransferFailed();

    function subscribe(
        address recipient,
        uint256 amountPerCycle,
        Frequency frequency
    ) external returns (uint256 subscriptionId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amountPerCycle == 0) revert InvalidAmount();

        subscriptionId = nextSubscriptionId++;
        // First payment due immediately; after each pay() we set nextDueAt to next period
        uint256 nextDueAt = block.timestamp;

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
     * @notice Pay with native PAS. Send msg.value >= amountPerCycle; excess is forwarded to recipient.
     */
    function pay(uint256 subscriptionId) external payable nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (!sub.active) revert SubscriptionInactive();
        if (msg.sender != sub.subscriber) revert NotSubscriber();
        if (block.timestamp < sub.nextDueAt) revert PaymentNotDue();

        uint256 amount = sub.amountPerCycle;
        if (msg.value < amount) revert InsufficientValue();

        sub.nextDueAt = _nextDue(sub.nextDueAt, sub.frequency);

        (bool ok,) = sub.recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        if (msg.value > amount) {
            (bool refundOk,) = msg.sender.call{value: msg.value - amount}("");
            if (!refundOk) {
                (bool toRecipient,) = sub.recipient.call{value: msg.value - amount}("");
                if (!toRecipient) { /* leave in contract */ }
            }
        }

        emit PaymentMade(subscriptionId, sub.subscriber, sub.recipient, amount, sub.nextDueAt, block.timestamp);
    }

    function cancel(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (msg.sender != sub.subscriber) revert NotSubscriber();
        sub.active = false;
        emit SubscriptionCancelled(subscriptionId, sub.subscriber, sub.recipient);
    }

    function _nextDue(uint256 fromTimestamp, Frequency frequency) internal pure returns (uint256) {
        if (frequency == Frequency.Weekly) return fromTimestamp + 7 days;
        if (frequency == Frequency.Monthly) return fromTimestamp + 30 days;
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
