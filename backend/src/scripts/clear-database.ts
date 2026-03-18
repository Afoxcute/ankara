/**
 * Clear all subscription-related data (payments, subscriptions, services).
 * Keeps the database and schema; only deletes rows.
 *
 * Run from backend: npx ts-node src/scripts/clear-database.ts
 * Or: yarn clear-db
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const deletedPayments = await prisma.payment.deleteMany({});
  const deletedSubscriptions = await prisma.subscription.deleteMany({});
  const deletedServices = await prisma.service.deleteMany({});

  console.log('Database cleared:');
  console.log('  Payments deleted:', deletedPayments.count);
  console.log('  Subscriptions deleted:', deletedSubscriptions.count);
  console.log('  Services deleted:', deletedServices.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
