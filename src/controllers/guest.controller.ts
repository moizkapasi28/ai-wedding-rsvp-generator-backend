import { type Request, type Response } from "express";
import {
  AddNewGuestDto,
  GetAllGuestsDto,
  GetWeddingGuestDto,
} from "../validations/guest.validations";
import { sendSuccess } from "../utils/response.util";
import { verifyWeddingEventOwnershipService } from "../services/event.service";
import {
  addNewGuestService,
  deleteWeddingGuestService,
  getAllGuestsService,
  getWeddingGuestService,
} from "../services/guest.service";
import {
  getUserWeddingService,
  verfiyWeddingOwnershipService,
} from "../services/wedding.service";

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

  //Verify event ownership
  const event = await verifyWeddingEventOwnershipService(body.eventId, user.id);

  // sanitized guest payload
  const guestPayload = {
    wedding_id: event.wedding_id,
    name: body.name,
    mobile_number: body.mobile_number,
    email: body.email,
    side: body.side,
  };

  const guest = await addNewGuestService(guestPayload, event.id);

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

export const deleteWeddingGuest = async (
  req: Request<GetWeddingGuestDto>,
  res: Response,
) => {
  const { user, params } = req;

  const guest = await getWeddingGuestService(user.id, params.id);

  await deleteWeddingGuestService(guest.id);

  return sendSuccess(res, "Guest deleted successfully", {}, 200);
};
