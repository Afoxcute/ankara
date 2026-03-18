import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function deploySubscriptionManagerFixture() {
  const [owner, alice, bob] = await ethers.getSigners();
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Test USDC", "USDC", 6);
  await token.waitForDeployment();
  const oneUnit = 10n ** 6n;
  await token.mint(alice.address, 100000n * oneUnit);
  await token.mint(bob.address, 100000n * oneUnit);

  const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
  const manager = await SubscriptionManager.deploy(await token.getAddress());
  await manager.waitForDeployment();
  return { manager, token, alice, bob, oneUnit };
}

describe("SubscriptionManager", function () {
  it("Should deploy and set payment token", async function () {
    const { manager, token } = await loadFixture(deploySubscriptionManagerFixture);
    expect(await manager.paymentToken()).to.equal(await token.getAddress());
  });

  it("Should create subscription", async function () {
    const { manager, token, alice, bob, oneUnit } = await loadFixture(deploySubscriptionManagerFixture);
    const amount = 10n * oneUnit;
    await token.connect(alice).approve(await manager.getAddress(), amount * 100n);

    const subId = await manager.connect(alice).subscribe.staticCall(bob.address, amount, 1);
    await manager.connect(alice).subscribe(bob.address, amount, 1);

    const sub = await manager.getSubscription(subId);
    expect(sub.subscriber).to.equal(alice.address);
    expect(sub.recipient).to.equal(bob.address);
    expect(sub.amountPerCycle).to.equal(amount);
    expect(sub.active).to.be.true;
  });

  it("Should pay when due", async function () {
    const { manager, token, alice, bob, oneUnit } = await loadFixture(deploySubscriptionManagerFixture);
    const amount = 10n * oneUnit;
    await token.connect(alice).approve(await manager.getAddress(), amount * 100n);
    await manager.connect(alice).subscribe(bob.address, amount, 1); // Monthly: first due in 30 days
    const subId = 0n;

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const bobBefore = await token.balanceOf(bob.address);
    await manager.connect(alice).pay(subId);
    expect(await token.balanceOf(bob.address)).to.equal(bobBefore + amount);
  });

  it("Should cancel subscription", async function () {
    const { manager, token, alice, bob, oneUnit } = await loadFixture(deploySubscriptionManagerFixture);
    const amount = 10n * oneUnit;
    await token.connect(alice).approve(await manager.getAddress(), amount);
    await manager.connect(alice).subscribe(bob.address, amount, 0);
    await manager.connect(alice).cancel(0);
    const sub = await manager.getSubscription(0);
    expect(sub.active).to.be.false;
  });
});
