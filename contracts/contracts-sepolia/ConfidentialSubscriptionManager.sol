// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialSubscriptionManager
 * @notice Subscriptions with FHE-encrypted amount (Zama FHEVM on Sepolia).
 * Amount per cycle is stored as euint64; only the subscriber can user-decrypt it.
 */
contract ConfidentialSubscriptionManager is ZamaEthereumConfig, ReentrancyGuard {
    enum Frequency {
        Weekly,
        Monthly,
        Yearly
    }

    struct ConfidentialSubscription {
        uint256 id;
        address subscriber;
        address recipient;
        euint64 amountPerCycle; // encrypted; use getEncryptedAmountPerCycle + userDecrypt to view
        Frequency frequency;
        uint256 nextDueAt;
        bool active;
        uint256 createdAt;
    }

    uint256 public nextSubscriptionId;
    mapping(uint256 => ConfidentialSubscription) public subscriptions;
    mapping(address => uint256[]) private _subscriptionsBySubscriber;

    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed recipient,
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
    event SubscriptionCancelled(
        uint256 indexed subscriptionId,
        address indexed subscriber,
        address indexed recipient
    );

    error InvalidRecipient();
    error SubscriptionNotFound();
    error SubscriptionInactive();
    error NotSubscriber();
    error PaymentNotDue();
    error TransferFailed();

    constructor() {}

    /**
     * @notice Create a confidential subscription. amountPerCycle is encrypted (euint64).
     * @param recipient Payee address.
     * @param encryptedAmountPerCycle External encrypted amount (from relayer SDK createEncryptedInput + add64 + encrypt).
     * @param inputProof Single proof for the encrypted input.
     */
    function subscribe(
        address recipient,
        externalEuint64 encryptedAmountPerCycle,
        Frequency frequency,
        bytes calldata inputProof
    ) external returns (uint256 subscriptionId) {
        if (recipient == address(0)) revert InvalidRecipient();

        euint64 amount = FHE.fromExternal(encryptedAmountPerCycle, inputProof);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);

        subscriptionId = nextSubscriptionId++;
        uint256 nextDueAt = block.timestamp;

        subscriptions[subscriptionId] = ConfidentialSubscription({
            id: subscriptionId,
            subscriber: msg.sender,
            recipient: recipient,
            amountPerCycle: amount,
            frequency: frequency,
            nextDueAt: nextDueAt,
            active: true,
            createdAt: block.timestamp
        });

        _subscriptionsBySubscriber[msg.sender].push(subscriptionId);

        emit SubscriptionCreated(subscriptionId, msg.sender, recipient, frequency, nextDueAt);
        return subscriptionId;
    }

    /**
     * @notice Pay with native ETH. Sends msg.value to recipient. Amount is not checked on-chain (stays private).
     */
    function pay(uint256 subscriptionId) external payable nonReentrant {
        ConfidentialSubscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (!sub.active) revert SubscriptionInactive();
        if (msg.sender != sub.subscriber) revert NotSubscriber();
        if (block.timestamp < sub.nextDueAt) revert PaymentNotDue();

        uint256 amount = msg.value;
        sub.nextDueAt = _nextDue(sub.nextDueAt, sub.frequency);

        if (amount > 0) {
            (bool ok, ) = sub.recipient.call{ value: amount }("");
            if (!ok) revert TransferFailed();
        }

        emit PaymentMade(
            subscriptionId,
            sub.subscriber,
            sub.recipient,
            amount,
            sub.nextDueAt,
            block.timestamp
        );
    }

    function cancel(uint256 subscriptionId) external {
        ConfidentialSubscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        if (msg.sender != sub.subscriber) revert NotSubscriber();
        sub.active = false;
        emit SubscriptionCancelled(subscriptionId, sub.subscriber, sub.recipient);
    }

    /**
     * @notice Returns the encrypted amount handle for the subscription.
     * Use with relayer SDK userDecrypt(handle, contractAddress) so only the subscriber can see the value.
     */
    function getEncryptedAmountPerCycle(uint256 subscriptionId) external view returns (euint64) {
        ConfidentialSubscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        return sub.amountPerCycle;
    }

    /// @notice Public fields of a subscription (amount is encrypted; use getEncryptedAmountPerCycle + userDecrypt).
    struct SubscriptionPublic {
        uint256 id;
        address subscriber;
        address recipient;
        Frequency frequency;
        uint256 nextDueAt;
        bool active;
        uint256 createdAt;
    }

    function getSubscriptionPublic(uint256 subscriptionId)
        external
        view
        returns (SubscriptionPublic memory)
    {
        ConfidentialSubscription storage sub = subscriptions[subscriptionId];
        if (sub.subscriber == address(0)) revert SubscriptionNotFound();
        return
            SubscriptionPublic({
                id: sub.id,
                subscriber: sub.subscriber,
                recipient: sub.recipient,
                frequency: sub.frequency,
                nextDueAt: sub.nextDueAt,
                active: sub.active,
                createdAt: sub.createdAt
            });
    }

    function getSubscriptionsBySubscriber(address subscriber)
        external
        view
        returns (uint256[] memory)
    {
        return _subscriptionsBySubscriber[subscriber];
    }

    function isPaymentDue(uint256 subscriptionId) external view returns (bool) {
        ConfidentialSubscription storage sub = subscriptions[subscriptionId];
        return
            sub.active &&
            sub.subscriber != address(0) &&
            block.timestamp >= sub.nextDueAt;
    }

    function _nextDue(uint256 fromTimestamp, Frequency frequency)
        internal
        pure
        returns (uint256)
    {
        if (frequency == Frequency.Weekly) return fromTimestamp + 7 days;
        if (frequency == Frequency.Monthly) return fromTimestamp + 30 days;
        return fromTimestamp + 365 days;
    }
}
