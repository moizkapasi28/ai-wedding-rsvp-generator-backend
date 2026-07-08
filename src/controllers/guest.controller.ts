import { type Request, type Response } from "express";
import {
  addNewGuestService,
  deleteWeddingGuestService,
  editWeddingGuestService,
  getAllGuestsService,
  getWeddingGuestService,
} from "../services/guest.service";
import { getUserWeddingService } from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
import {
  AddNewGuestDto,
  EditWeddingGuestDto,
  GetAllGuestsDto,
  GetWeddingGuestDto,
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
