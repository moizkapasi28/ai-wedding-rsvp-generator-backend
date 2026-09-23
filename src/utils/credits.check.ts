// Self-check for AI credit charging against the local DB (creates and deletes a throwaway user).
// Run from the backend root: npx tsx src/utils/credits.check.ts
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  refundInviteCardCredits,
  spendCredits,
} from "../services/credits.service";

const main = async () => {
  const user = await prisma.user.create({
    data: {
      first_name: "Credits",
      last_name: "Check",
      email: `credits-check-${Date.now()}@example.test`,
      mobile_number: "0",
      password: "x",
      ai_credits: 10,
    },
  });

  try {
    // 5 concurrent spends of 5 against a balance of 10: exactly 2 succeed
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => spendCredits(user.id, 5)),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
    const failure = results.find((r) => r.status === "rejected");
    assert.equal((failure as PromiseRejectedResult).reason.statusCode, 402);
    const balance = async () =>
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
        .ai_credits;
    assert.equal(await balance(), 0);

    // A card failed by both the worker and the stale sweep refunds once
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
    assert.equal(await balance(), 10);

    console.log("credits checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

main();
