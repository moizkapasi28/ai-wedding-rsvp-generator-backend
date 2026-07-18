import { type Request, type Response } from "express";
import {
  addNewUserWeddingService,
  deleteWeddingService,
  editUserWeddingService,
  getAllUserWeddingsService,
  getUserWeddingService,
} from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
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
