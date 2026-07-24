import { type Request, type Response } from "express";
import {
  addNewGuestService,
  deleteWeddingGuestService,
  editWeddingGuestService,
  getAllGuestsService,
  getWeddingGuestService,
  downloadGuestListTemplateService,
  exportGuestsService,
  importGuestListTemplateService,
} from "../services/guest.service";
import { guestImportQueue } from "../queues/guest.queue";
import { getUserWeddingService } from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
import {
  AddNewGuestDto,
  EditWeddingGuestDto,
  GetAllGuestsDto,
  GetWeddingGuestDto,
  DownloadGuestTemplateDto,
  UploadGuestTemplateDto,
} from "../validations/guest.validations";

export const getAllGuests = async (
  req: Request<{}, {}, {}, GetAllGuestsDto>,
  res: Response,
): Promise<Response> => {
  const { user, query } = req;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  // Verify the wedding belongs to the user
  await getUserWeddingService(user.id, query.weddingId);

  //Get all wedding guests
  const guests = await getAllGuestsService(
    query.weddingId,
    query.eventId,
    page,
    limit,
  );

  return sendSuccess(res, "Guests fetched successfully", guests, 200);
};

export const addNewGuest = async (
  req: Request<{}, {}, AddNewGuestDto>,
  res: Response,
): Promise<Response> => {
  const { user, body } = req;

  const guest = await addNewGuestService(user.id, body);

  return sendSuccess(res, "Guest added successfully", guest, 201);
};

export const getWeddingGuest = async (
  req: Request<GetWeddingGuestDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  const guest = await getWeddingGuestService(user.id, params.id);

  return sendSuccess(res, "Guest fetched successfully", guest, 200);
};

export const editWeddingGuest = async (
  req: Request<EditWeddingGuestDto["params"], {}, EditWeddingGuestDto["body"]>,
  res: Response,
) => {
  const { user, params, body } = req;

  const guest = await editWeddingGuestService(params.id, user.id, body);

  return sendSuccess(res, "Guest updated successfully", guest, 200);
};

export const deleteWeddingGuest = async (
  req: Request<GetWeddingGuestDto>,
  res: Response,
) => {
  const { user, params } = req;

  const guest = await getWeddingGuestService(user.id, params.id);

  await deleteWeddingGuestService(guest.id);

  return sendSuccess(res, "Guest deleted successfully", {}, 200);
};

export const downloadGuestListTemplate = async (
  req: Request<DownloadGuestTemplateDto["params"]>,
  res: Response,
) => {
  const { params } = req;
  const workbook = await downloadGuestListTemplateService(params.id);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Guest_List_Template.xlsx"
  );
  await workbook.xlsx.write(res);
  res.end();
};

export const exportGuests = async (
  req: Request<DownloadGuestTemplateDto["params"]>,
  res: Response,
) => {
  const { params } = req;
  const buffer = await exportGuestsService(params.id);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=Guest_List.xlsx"
  );
  res.send(buffer);
};

export const importGuestListTemplate = async (
  req: Request<UploadGuestTemplateDto["params"]>,
  res: Response,
) => {
  const { user, params, file } = req;
  
  if (!file) {
    return sendSuccess(res, "File is required", null, 400); // Or throw ApiError
  }

  const result = await importGuestListTemplateService(
    user.id,
    params.id,
    file.buffer,
  );

  return sendSuccess(res, "File uploaded and being processed", result, 202);
};

export const getGuestImportStatus = async (
  req: Request<{ jobId: string }>,
  res: Response,
) => {
  const { jobId } = req.params;
  const job = await guestImportQueue.getJob(jobId);
  
  if (!job) {
    return sendSuccess(res, "Job not found", null, 404);
  }

  const state = await job.getState();
  const result = {
    id: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason,
  };

  return sendSuccess(res, "Job status fetched successfully", result, 200);
};
