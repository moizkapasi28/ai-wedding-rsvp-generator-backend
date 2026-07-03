import { type Request, type Response } from "express";
import {
  getAllUserWeddingsService,
  addNewUserWeddingService,
  getUserWeddingService,
  editUserWeddingService,
  deleteWeddingService,
} from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
import {
  GetAllUserWeddingsDto,
  AddNewWeddingDto,
  GetUserWeddingDto,
  EditWeddingDto,
} from "../validations/wedding.validation";
import { deleteWeddingById } from "../repositories/wedding.repository";

export const getAllUserWeddings = async (
  req: Request<{}, {}, {}, GetAllUserWeddingsDto>,
  res: Response,
): Promise<Response> => {
  const { user, query } = req;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  const weddingsData = await getAllUserWeddingsService(user.id, page, limit);

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
