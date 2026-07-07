import { type Request, type Response } from "express";
import { AddNewGuestDto } from "../validations/guest.validations";
import { sendSuccess } from "../utils/response.util";
import { verifyWeddingEventOwnershipService } from "../services/event.service";
import { addNewGuestService } from "../services/guest.service";

export const addNewGuest = async (
  req: Request<{}, {}, AddNewGuestDto>,
  res: Response,
) => {
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
