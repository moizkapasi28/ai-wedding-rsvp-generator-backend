import { type Request, type Response } from "express";
import { getRsvpService, submitRsvpService } from "../services/rsvp.service";
import { sendSuccess } from "../utils/response.util";
import { RsvpTokenDto, SubmitRsvpDto } from "../validations/rsvp.validation";

export const getRsvp = async (
  req: Request<RsvpTokenDto>,
  res: Response,
): Promise<Response> => {
  const rsvp = await getRsvpService(req.params.token);

  return sendSuccess(res, "Invitation fetched successfully", rsvp, 200);
};

export const submitRsvp = async (
  req: Request<SubmitRsvpDto["params"], {}, SubmitRsvpDto["body"]>,
  res: Response,
): Promise<Response> => {
  const { params, body } = req;

  const invite = await submitRsvpService(params.token, body);

  return sendSuccess(res, "Your RSVP has been saved", invite, 200);
};
