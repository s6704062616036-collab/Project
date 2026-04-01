const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isCloudStorageEnabled } = require("../services/fileStorageService");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
const ALLOWED_CHAT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const MAX_CHAT_FILE_SIZE_BYTES = 100 * 1024 * 1024;

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

const chatUpload = multer({
  storage,
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_CHAT_MIME_TYPES.has(`${file?.mimetype ?? ""}`.trim().toLowerCase())) {
      return cb(null, true);
    }

    const error = new Error("Only image or video uploads are allowed in chat");
    error.status = 400;
    error.code = "UNSUPPORTED_CHAT_FILE_TYPE";
    return cb(error);
  },
});

module.exports = chatUpload;
