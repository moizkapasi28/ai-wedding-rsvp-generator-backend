// Give a user AI credits, with a note for the ledger. Uses the .env database.
// Run from the backend root: npx tsx scripts/grant-credits.ts <email> <amount> "<note>"
import { prisma } from "../src/lib/prisma";
import { grantCredits } from "../src/services/credits.service";

const [email, amountText, ...noteWords] = process.argv.slice(2);
const amount = Number(amountText);
const note = noteWords.join(" ").trim();

const main = async () => {
  if (!email || !note)
    throw new Error('Usage: npx tsx scripts/grant-credits.ts <email> <amount> "<note>"');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const balance = await grantCredits(user.id, amount, note);
  console.log(`Granted ${amount} credits to ${email}; balance is now ${balance}.`);
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
