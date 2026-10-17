// Self-check that every model's updated_at moves by itself on an update (@updatedAt in
// schema.prisma), against the local DB. Creates and deletes a throwaway user with one row
// of each model. Run from the backend root: npx tsx src/utils/updatedAt.check.ts
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { spendCredits } from "../services/credits.service";

const pause = () => new Promise((resolve) => setTimeout(resolve, 15));

const main = async () => {
  const place = { venue: "v", address: "a", city: "c", date: new Date() };
  const user = await prisma.user.create({
    data: {
      first_name: "Updated",
      last_name: "Check",
      email: `updated-at-check-${Date.now()}@example.test`,
      mobile_number: "0",
      password: "x",
      ai_credits: 10,
    },
  });

  try {
    const wedding = await prisma.wedding.create({
      data: { ...place, user_id: user.id, slug: `s-${Date.now()}`, title: "t", bride_name: "b", groom_name: "g" },
    });
    const event = await prisma.event.create({
      data: { ...place, wedding_id: wedding.id, title: "t", description: "d", time: "10:00", event_side: "BOTH" },
    });
    const format = await prisma.guestEventInviteFormat.create({ data: { event_id: event.id } });
    const card = await prisma.eventInviteCard.create({ data: { event_id: event.id } });
    const guest = await prisma.guest.create({
      data: { wedding_id: wedding.id, name: "n", mobile_number: "9876543210", side: "BRIDE", group: "FRIEND" },
    });
    const invite = await prisma.guestEventInvite.create({
      data: {
        guest_id: guest.id,
        event_id: event.id,
        invite_format_id: format.id,
        invite_token: "33333333-3333-4333-8333-" + String(Date.now()).slice(-12),
      },
    });
    const token = await prisma.token.create({
      data: { jti: "22222222-2222-4222-8222-222222222222", user_id: user.id, expires_at: new Date(Date.now() + 60_000) },
    });

    // Each update writes an unrelated field and never mentions updated_at
    const updates: [string, Date, () => Promise<{ updated_at: Date }>][] = [
      ["User", user.updated_at, () => prisma.user.update({ where: { id: user.id }, data: { first_name: "Changed" } })],
      ["Wedding", wedding.updated_at, () => prisma.wedding.update({ where: { id: wedding.id }, data: { title: "changed" } })],
      ["Event", event.updated_at, () => prisma.event.update({ where: { id: event.id }, data: { title: "changed" } })],
      ["GuestEventInviteFormat", format.updated_at, () => prisma.guestEventInviteFormat.update({ where: { id: format.id }, data: { song_request: true } })],
      ["EventInviteCard", card.updated_at, () => prisma.eventInviteCard.update({ where: { id: card.id }, data: { custom_message: "changed" } })],
      ["Guest", guest.updated_at, () => prisma.guest.update({ where: { id: guest.id }, data: { name: "changed" } })],
      ["GuestEventInvite", invite.updated_at, () => prisma.guestEventInvite.update({ where: { id: invite.id }, data: { invite_sent_at: new Date() } })],
      ["Token", token.updated_at, () => prisma.token.update({ where: { id: token.id }, data: { expires_at: new Date(Date.now() + 120_000) } })],
    ];

    for (const [model, before, update] of updates) {
      await pause();
      const after = await update();
      assert.ok(after.updated_at > before, `${model}.updated_at did not move on update`);
    }

    // updateMany moves it too, so spending credits also counts as a change to the user row
    const beforeSpend = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).updated_at;
    await pause();
    await spendCredits(user.id, "HEADER_IMAGE", user.id);
    const afterSpend = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).updated_at;
    assert.ok(afterSpend > beforeSpend, "User.updated_at did not move on updateMany");

    console.log("updated_at checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

main();
