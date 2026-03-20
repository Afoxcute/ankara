import { prisma } from '../lib/prisma';

async function main() {
  const subscriptionId = process.env.TEST_SUBSCRIPTION_ID || '';
  const txPrefix = process.env.TEST_TX_PREFIX || 'missing-tx:';

  if (!subscriptionId) {
    throw new Error('TEST_SUBSCRIPTION_ID is required');
  }

  const payments = await prisma.payment.findMany({
    where: {
      subscriptionId,
      transactionHash: { startsWith: txPrefix },
    },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  if (payments.length === 0) {
    console.log('No matching test payments found');
    return;
  }

  await prisma.payment.deleteMany({
    where: {
      id: { in: payments.map((p) => p.id) },
    },
  });

  console.log(`Deleted ${payments.length} test payment(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

