import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  addNewGuestSchema,
  downloadGuestTemplateSchema,
  editWeddingGuestSchema,
  getAllGuestsSchema,
  getWeddingGuestSchema,
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
  asyncHandler(getGuestImportStatus),
);

export default guestsRouter;

