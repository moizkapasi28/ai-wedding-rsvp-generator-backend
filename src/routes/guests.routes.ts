import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  addNewGuestSchema,
  downloadGuestTemplateSchema,
  editWeddingGuestSchema,
  getAllGuestsSchema,
  getJobStatusSchema,
  getWeddingGuestSchema,
  getDueRemindersSchema,
  getWhatsAppInvitesSchema,
  markInviteSentSchema,
  checkInGuestSchema,
  markReminderSentSchema,
  unmarkReminderSentSchema,
  uploadGuestTemplateSchema,
} from "../validations/guest.validations";
import { asyncHandler } from "../utils/asyncHandler.util";
import { upload } from "../middlewares/upload.middleware";
import {
  addNewGuest,
  deleteWeddingGuest,
  downloadGuestListTemplate,
  editWeddingGuest,
  exportGuests,
  getAllGuests,
  getWeddingGuest,
  importGuestListTemplate,
  getGuestImportStatus,
  getDueReminders,
  getWhatsAppInvites,
  markInviteSent,
  checkInGuest,
  markReminderSent,
  unmarkInviteSent,
  unmarkReminderSent,
} from "../controllers/guest.controller";

const guestsRouter = Router();

guestsRouter.get(
  "/",
  authenticate,
  validate(getAllGuestsSchema),
  asyncHandler(getAllGuests),
);

guestsRouter.get(
  "/export",
  authenticate,
  validate(getAllGuestsSchema),
  asyncHandler(exportGuests),
);

guestsRouter.get(
  "/:id",
  authenticate,
  validate(getWeddingGuestSchema),
  asyncHandler(getWeddingGuest),
);

guestsRouter.get(
  "/template/download/:id",
  authenticate,
  validate(downloadGuestTemplateSchema),
  asyncHandler(downloadGuestListTemplate),
);

guestsRouter.post(
  "/template/upload/:id",
  authenticate,
  upload.single("file"),
  validate(uploadGuestTemplateSchema),
  asyncHandler(importGuestListTemplate),
);

guestsRouter.post(
  "/",
  authenticate,
  validate(addNewGuestSchema),
  asyncHandler(addNewGuest),
);

guestsRouter.patch(
  "/:id",
  authenticate,
  validate(editWeddingGuestSchema),
  asyncHandler(editWeddingGuest),
);

guestsRouter.delete(
  "/:id",
  authenticate,
  validate(getWeddingGuestSchema),
  asyncHandler(deleteWeddingGuest),
);

guestsRouter.get(
  "/import-status/:jobId",
  authenticate,
  validate(getJobStatusSchema),
  asyncHandler(getGuestImportStatus),
);

guestsRouter.get(
  "/invites/whatsapp",
  authenticate,
  validate(getWhatsAppInvitesSchema),
  asyncHandler(getWhatsAppInvites),
);

// The host scans a guest's QR at the venue; idempotent, so a second scan is harmless
guestsRouter.post(
  "/invites/check-in",
  authenticate,
  validate(checkInGuestSchema),
  asyncHandler(checkInGuest),
);

guestsRouter.post(
  "/invites/:inviteId/mark-sent",
  authenticate,
  validate(markInviteSentSchema),
  asyncHandler(markInviteSent),
);

// Undo: opening the WhatsApp link marks an invite sent, and a mis-tap shouldn't be permanent
guestsRouter.delete(
  "/invites/:inviteId/mark-sent",
  authenticate,
  validate(markInviteSentSchema),
  asyncHandler(unmarkInviteSent),
);

guestsRouter.get(
  "/invites/reminders",
  authenticate,
  validate(getDueRemindersSchema),
  asyncHandler(getDueReminders),
);

guestsRouter.post(
  "/invites/:inviteId/mark-reminded",
  authenticate,
  validate(markReminderSentSchema),
  asyncHandler(markReminderSent),
);

guestsRouter.delete(
  "/invites/:inviteId/mark-reminded",
  authenticate,
  validate(unmarkReminderSentSchema),
  asyncHandler(unmarkReminderSent),
);

export default guestsRouter;

