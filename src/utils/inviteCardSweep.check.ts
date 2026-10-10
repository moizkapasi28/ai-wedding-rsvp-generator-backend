// Self-check for retiring stale invite card generations against the local DB (creates and
// deletes a throwaway user). The sweep is global, so it also retires any genuinely stale
// card in the local data, which is what the worker would do anyway.
// Run from the backend root: npx tsx src/utils/inviteCardSweep.check.ts
import assert from "node:assert/strict";
import { GENERATION_STALE_AFTER_MS } from "../enums/inviteCard.enum";
import { prisma } from "../lib/prisma";
import {
  getInviteCardGenerationStatusService,
  retireStaleInviteCardGenerationsService,
  runInviteCardGenerationJob,
} from "../services/inviteCard.service";
import { PipelineDeps } from "../services/inviteCardGeneration.service";

const COST = 10;
const longAgo = () => new Date(Date.now() - GENERATION_STALE_AFTER_MS - 60_000);

// Any attempt to actually generate fails the check
const noGeneration = (): never => {
  throw new Error("the pipeline must not run");
};
const deps: PipelineDeps = {
  genai: { models: new Proxy({}, { get: noGeneration }) } as PipelineDeps["genai"],
  uploadImage: noGeneration,
  loadImage: noGeneration,
};

const main = async () => {
  const user = await prisma.user.create({
    data: {
      first_name: "Sweep",
      last_name: "Check",
      email: `sweep-check-${Date.now()}@example.test`,
      mobile_number: "0",
      password: "x",
      ai_credits: 0,
    },
  });
  const place = { venue: "v", address: "a", city: "c", date: new Date() };
  const wedding = await prisma.wedding.create({
    data: { ...place, user_id: user.id, slug: `sweep-${Date.now()}`, title: "t", bride_name: "b", groom_name: "g" },
  });

  // One event per card, each charged for a generation that is under way
  const card = async (heartbeat: Date, status: "QUEUED" | "PROCESSING" = "PROCESSING") => {
    const event = await prisma.event.create({
      data: { ...place, wedding_id: wedding.id, title: "t", description: "d", time: "10:00", event_side: "BOTH" },
    });
    return prisma.eventInviteCard.create({
      data: {
        event_id: event.id,
        generation_status: status,
        generation_started_at: heartbeat,
        generation_heartbeat_at: heartbeat,
        credits_charged: COST,
      },
    });
  };
  const reload = (id: string) => prisma.eventInviteCard.findUniqueOrThrow({ where: { id } });
  const credits = async () => (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).ai_credits;

  try {
    const stale = await card(longAgo());
    const staleQueued = await card(longAgo(), "QUEUED");
    const healthy = await card(new Date());

    // Nobody is polling: the sweep alone fails the two stale runs and refunds each once
    assert.ok((await retireStaleInviteCardGenerationsService()) >= 2);
    for (const id of [stale.id, staleQueued.id]) {
      const retired = await reload(id);
      assert.equal(retired.generation_status, "FAILED");
      assert.equal(retired.generation_error_code, "TIMEOUT");
      assert.equal(retired.credits_charged, 0);
    }
    assert.equal(await credits(), 2 * COST);

    // A run whose worker is still writing heartbeats is left alone
    assert.equal((await reload(healthy.id)).generation_status, "PROCESSING");

    // Sweeping again changes nothing
    await retireStaleInviteCardGenerationsService();
    assert.equal(await credits(), 2 * COST);

    // The sweep and the status endpoint racing over one stale run refund it once
    const raced = await card(longAgo());
    const [, status] = await Promise.all([
      retireStaleInviteCardGenerationsService(),
      getInviteCardGenerationStatusService(raced.id, user.id),
    ]);
    assert.equal(status.status, "FAILED");
    assert.equal(status.error_code, "TIMEOUT");
    assert.equal(await credits(), 3 * COST);

    // A run that completes just before it would be retired keeps its result and its charge
    const finished = await card(longAgo());
    await prisma.eventInviteCard.update({ where: { id: finished.id }, data: { generation_status: "COMPLETED" } });
    await retireStaleInviteCardGenerationsService();
    assert.equal((await reload(finished.id)).generation_status, "COMPLETED");
    assert.equal((await reload(finished.id)).credits_charged, COST);
    assert.equal(await credits(), 3 * COST);

    // A job that reaches the worker after its run was retired does not generate for free
    await assert.rejects(
      runInviteCardGenerationJob(
        { type: "generate-invite-card", inviteCardId: stale.id, eventId: stale.event_id, userId: user.id },
        { attempt: 1, maxAttempts: 3 },
        deps,
      ),
      { name: "UnrecoverableError" },
    );
    assert.equal((await reload(stale.id)).generation_status, "FAILED");
    assert.equal(await credits(), 3 * COST);

    console.log("invite card sweep checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

// The service pulls in the queue, whose Redis connection would keep the process alive
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
