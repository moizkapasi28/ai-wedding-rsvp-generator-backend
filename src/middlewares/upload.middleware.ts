import multer from "multer";
import { ApiError } from "../utils/apiError.util";

const storage = multer.memoryStorage();

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Only the guest import uses this, and it reads .xlsx only (read-excel-file)
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Clients don't agree on the mime type they send for .xlsx, so either signal is enough;
    // the service then checks it really is this wedding's template
    const isXlsx =
      file.mimetype === XLSX_MIME_TYPE ||
      file.originalname.toLowerCase().endsWith(".xlsx");

    if (isXlsx) return cb(null, true);

    cb(
      new ApiError(
        400,
        "Upload the .xlsx template you downloaded for this wedding.",
      ),
    );
  },
});
