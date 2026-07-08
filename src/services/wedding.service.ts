import { v4 as uuidv4 } from "uuid";
import {
  countUserWeddings,
  createWedding,
  deleteWeddingById,
  findWeddingById,
  findWeddingByIdAndUserId,
  getAllUserWeddings,
  updateWeddingById,
} from "../repositories/wedding.repository";
import {
  AddNewWeddingDto,
  EditWeddingDto,
} from "../validations/wedding.validation";
import { ApiError } from "../utils/apiError.util";
import { Wedding, Prisma } from "../../generated/prisma/client";

export const getAllUserWeddingsService = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    getAllUserWeddings(userId, skip, limit),
    countUserWeddings(userId),
  ]);

  return {
    weddings: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

export const addNewUserWeddingService = async (
  userId: string,
  data: AddNewWeddingDto,
) => {
  const baseSlug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${baseSlug}`;

  const newWedding = await createWedding({
    user_id: userId,
    title: data.title,
    bride_name: data.bride_name,
    groom_name: data.groom_name,
    date: new Date(data.date),
    venue: data.venue,
    city: data.city,
    message: data.message,
    slug,
  });

  if (!newWedding) throw new ApiError(400, "Failed to create wedding");

  return newWedding;
};

export const getUserWeddingService = async (
  userId: string,
  id: string,
): Promise<Wedding> => {
  const wedding = await findWeddingByIdAndUserId(id, userId);

  if (!wedding) throw new ApiError(404, "Wedding not found");

  return wedding;
};

export const editUserWeddingService = async (
  id: string,
  payload: EditWeddingDto["body"],
) => {
  const updateData: Prisma.WeddingUpdateInput = { ...payload };

  if (payload.title) {
    const baseSlug = payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    updateData.slug = `${baseSlug}`;
  }

  if (payload.date) {
    updateData.date = new Date(payload.date);
  }

  const wedding = await updateWeddingById(id, updateData);

  if (!wedding) throw new ApiError(404, "Failed to update wedding");

  return wedding;
};

export const deleteWeddingService = async (id: string) => {
  const wedding = await deleteWeddingById(id);

  if (!wedding) throw new ApiError(404, "Failed to delete wedding");
};

export const verfiyWeddingOwnershipService = async (
  userId: string,
  weddingId: string,
) => {
  const wedding = await findWeddingByIdAndUserId(weddingId, userId);

  if (!wedding) return false;

  return true;
};
