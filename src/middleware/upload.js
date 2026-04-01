const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isCloudStorageEnabled } = require("../services/fileStorageService");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const storage = isCloudStorageEnabled() ? multer.memoryStorage() : diskStorage;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(`${file?.mimetype ?? ""}`.trim().toLowerCase())) {
      return cb(null, true);
    }

    const error = new Error("Only image uploads are allowed");
    error.status = 400;
    error.code = "UNSUPPORTED_FILE_TYPE";
    return cb(error);
  },
});

module.exports = upload;
