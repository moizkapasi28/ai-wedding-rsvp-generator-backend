import { prisma } from "../lib/prisma";

// True when a record the user owns points at this S3 key. Covers files saved before uploads
// were namespaced per user, and images the backend generated (AI cards, RSVP illustrations).
export const isObjectKeyReferencedByUser = async (
  userId: string,
  objectKey: string,
) => {
  const ownedEvent = { wedding: { user_id: userId } };

  const [profiles, pageSettings, aiCards] = await Promise.all([
    prisma.user.count({ where: { id: userId, profile_picture: objectKey } }),
    prisma.guestEventInviteFormat.count({
      where: {
        event: ownedEvent,
        OR: [{ raw_image: objectKey }, { generated_image: objectKey }],
      },
    }),
    prisma.aIEventInviteCard.count({
      where: {
        event: ownedEvent,
        OR: [
          { reference_image: objectKey },
          { generated_image: objectKey },
          { couple_raw_image_key: objectKey },
          { generated_invite_image_url: objectKey },
          { invite_design_image_url: objectKey },
        ],
      },
    }),
  ]);

  return profiles + pageSettings + aiCards > 0;
};
