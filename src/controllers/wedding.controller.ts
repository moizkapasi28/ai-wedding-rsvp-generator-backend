import { type Request, type Response } from "express";
import {
  addNewUserWeddingService,
  deleteWeddingService,
  editUserWeddingService,
  getAllUserWeddingsService,
  getUserWeddingService,
  getWeddingDashboardService,
} from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
import { onRsvp } from "../lib/rsvpEvents";
import {
  AddNewWeddingDto,
  EditWeddingDto,
  GetAllUserWeddingsDto,
  GetUserWeddingDto,
} from "../validations/wedding.validation";

export const getAllUserWeddings = async (
  req: Request<{}, {}, {}, GetAllUserWeddingsDto>,
  res: Response,
): Promise<Response> => {
  const { user, query } = req;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const includeStats = req.query.stats === "true";
  const search = req.query.search;
  const filter = req.query.filter;
  const sortBy = req.query.sortBy;
  const sortOrder = req.query.sortOrder;

  const weddingsData = await getAllUserWeddingsService(
    user.id,
    page,
    limit,
    includeStats,
    search,
    filter,
    sortBy,
    sortOrder,
  );

  return sendSuccess(res, "Weddings fetched successfully", weddingsData, 200);
};

export const addNewUserWedding = async (
  req: Request<{}, {}, AddNewWeddingDto>,
  res: Response,
): Promise<Response> => {
  const { user, body } = req;

  const newWedding = await addNewUserWeddingService(user.id, body);

  return sendSuccess(res, "Wedding created successfully", newWedding, 201);
};

export const getUserWedding = async (
  req: Request<GetUserWeddingDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  const wedding = await getUserWeddingService(user.id, params.id);

  return sendSuccess(res, "Wedding fetched successfully", wedding, 200);
};

export const editWedding = async (
  req: Request<EditWeddingDto["params"], {}, EditWeddingDto["body"]>,
  res: Response,
) => {
  const { user, params, body } = req;

  await getUserWeddingService(user.id, params.id);

  const updatedWedding = await editUserWeddingService(params.id, body);

  return sendSuccess(res, "Wedding updated successfully", updatedWedding, 200);
};

export const deleteWedding = async (
  req: Request<GetUserWeddingDto>,
  res: Response,
) => {
  const { user, params } = req;

  await getUserWeddingService(user.id, params.id);

  await deleteWeddingService(params.id);

  return sendSuccess(res, "Wedding deleted successfully", {}, 200);
};

export const getWeddingDashboard = async (
  req: Request<GetUserWeddingDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  await getUserWeddingService(user.id, params.id);

  const dashboard = await getWeddingDashboardService(params.id);

  return sendSuccess(
    res,
    "Wedding dashboard fetched successfully",
    dashboard,
    200,
  );
};

export const streamWeddingLive = async (
  req: Request<GetUserWeddingDto>,
  res: Response,
) => {
  const { user, params } = req;

  await getUserWeddingService(user.id, params.id);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Stops proxies from buffering events
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Cloudflare closes connections that stay idle for 100s
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  const unsubscribe = onRsvp(params.id, (rsvp) => {
    res.write(`event: rsvp\ndata: ${JSON.stringify(rsvp)}\n\n`);
  });

  // Unsubscribing on close guarantees nothing is written after the client leaves
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};
