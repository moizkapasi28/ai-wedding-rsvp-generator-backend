// Self-check for AI credit charging and its ledger against the local DB (creates and deletes a
// throwaway user). Run from the backend root: npx tsx src/utils/credits.check.ts
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  grantCredits,
  refundCredits,
  refundInviteCardCredits,
  spendCredits,
} from "../services/credits.service";

const STARTING_BALANCE = 10;

const main = async () => {
  const user = await prisma.user.create({
    data: {
      first_name: "Credits",
      last_name: "Check",
      email: `credits-check-${Date.now()}@example.test`,
      mobile_number: "0",
      password: "x",
      ai_credits: STARTING_BALANCE,
    },
  });

  const balance = async () =>
    (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
      .ai_credits;
  const ledger = () =>
    prisma.creditTransaction.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "asc" },
    });
  // The ledger explains the whole balance: start + every row = what the user has
  const assertLedgerMatches = async () => {
    const rows = await ledger();
    const total = rows.reduce((sum, row) => sum + row.delta, 0);
    assert.equal(STARTING_BALANCE + total, await balance(), "ledger and balance disagree");
    return rows;
  };

  try {
    // 5 concurrent header images (5 each) against a balance of 10: exactly 2 succeed,
    // and a refused spend leaves no ledger row
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        spendCredits(user.id, "HEADER_IMAGE", "event-1"),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
    const failure = results.find((r) => r.status === "rejected");
    assert.equal((failure as PromiseRejectedResult).reason.statusCode, 402);
    assert.equal(await balance(), 0);
    let rows = await assertLedgerMatches();
    assert.deepEqual(
      rows.map((row) => [row.reason, row.delta, row.ref_id]),
      [
        ["HEADER_IMAGE", -5, "event-1"],
        ["HEADER_IMAGE", -5, "event-1"],
      ],
    );

    // A spend inside a transaction that rolls back takes its ledger row with it
    await grantCredits(user.id, 10, "check");
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await spendCredits(user.id, "INVITE_CARD", "card-x", tx);
        throw new Error("roll back");
      }),
    );
    assert.equal(await balance(), 10);
    rows = await assertLedgerMatches();
    assert.deepEqual(rows.at(-1)?.reason, "GRANT");
    assert.equal(rows.at(-1)?.note, "check");

    await refundCredits(user.id, 5, "event-1");
    assert.equal(await balance(), 15);

    // A card failed by both the worker and the stale sweep refunds once, with one REFUND row
    const place = { venue: "v", address: "a", city: "c", date: new Date() };
    const card = await prisma.eventInviteCard.create({
      data: {
        credits_charged: 10,
        event: {
          create: {
            ...place,
            title: "t",
            description: "d",
            time: "10:00",
            event_side: "BOTH",
            wedding: {
              create: {
                ...place,
                user_id: user.id,
                slug: "s",
                title: "t",
                bride_name: "b",
                groom_name: "g",
              },
            },
          },
        },
      },
    });
    await Promise.all([
      refundInviteCardCredits(card.id, user.id),
      refundInviteCardCredits(card.id, user.id),
    ]);
    assert.equal(await balance(), 25);
    rows = await assertLedgerMatches();
    assert.equal(rows.filter((row) => row.ref_id === card.id).length, 1);

    await assert.rejects(grantCredits(user.id, 0, "nothing"));

    console.log("credits checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

main();
