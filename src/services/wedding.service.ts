import {
  countUserWeddings,
  createWedding,
  deleteWeddingById,
  findWeddingByIdAndUserId,
  getAllUserWeddings,
  getAllWeddingsWithEventCountAndTotalGuest,
  updateWeddingById,
} from "../repositories/wedding.repository";
import {
  AddNewWeddingDto,
  EditWeddingDto,
} from "../validations/wedding.validation";
import { ApiError } from "../utils/apiError.util";
import { Wedding, Prisma } from "../../generated/prisma/client";
import { calculateConfirmationOfGuest } from "./guest.service";

const getWeddingTag = (weddingDate: Date): string => {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWedding = new Date(
    weddingDate.getFullYear(),
    weddingDate.getMonth(),
    weddingDate.getDate(),
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round(
    (startOfWedding.getTime() - startOfToday.getTime()) / msPerDay,
  );

  if (diffDays < 0) {
    return "Completed";
  }

  if (diffDays <= 7) {
    return "This Week";
  }

  return `${diffDays} days later`;
};

export const getAllUserWeddingsService = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  includeStats: boolean = false,
  search?: string,
  filter?: string,
  sortBy: "date" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc",
) => {
  const skip = (page - 1) * limit;

  if (includeStats) {
    const [data, totalCount] = await Promise.all([
      getAllWeddingsWithEventCountAndTotalGuest(
        userId,
        skip,
        limit,
        search,
        filter,
        sortBy,
        sortOrder,
      ),
      countUserWeddings(userId, search, filter),
    ]);

    const weddings = await Promise.all(
      data.map(async ({ _count, id, ...wedding }) => ({
        id,
        ...wedding,
        tag: getWeddingTag(wedding.date),
        totalGuests: _count?.guests ?? 0,
        totalEvents: _count?.events ?? 0,
        confirmationRate: await calculateConfirmationOfGuest(id),
      })),
    );

    return {
      weddings,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } else {
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
  }
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
    address: data.address,
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
