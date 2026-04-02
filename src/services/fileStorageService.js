const fs = require("fs/promises");
const path = require("path");

let cloudinary = null;
try {
  cloudinary = require("cloudinary").v2;
} catch {
  cloudinary = null;
}

const CLOUDINARY_CLOUD_NAME = `${process.env.CLOUDINARY_CLOUD_NAME ?? ""}`.trim();
const CLOUDINARY_API_KEY = `${process.env.CLOUDINARY_API_KEY ?? ""}`.trim();
const CLOUDINARY_API_SECRET = `${process.env.CLOUDINARY_API_SECRET ?? ""}`.trim();

const isCloudStorageEnabled = () =>
  Boolean(
    cloudinary &&
      CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_API_KEY &&
      CLOUDINARY_API_SECRET
  );

if (cloudinary && isCloudStorageEnabled()) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const sanitizeFolder = (folder = "secondhand") =>
  `${folder ?? "secondhand"}`
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "") || "secondhand";

const inferResourceType = (file = null) => {
  const mimetype = `${file?.mimetype ?? ""}`.trim().toLowerCase();
  if (mimetype.startsWith("video/")) return "video";
  return "image";
};

const buildLocalUploadUrl = (file = null) => {
  if (!file) return "";
  if (file.filename) {
    return `/uploads/${file.filename}`;
  }

  const normalizedPath = `${file.path ?? ""}`.replace(/\\/g, "/");
  const uploadsIndex = normalizedPath.lastIndexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return normalizedPath.slice(uploadsIndex);
  }

  const basename = path.basename(normalizedPath);
  return basename ? `/uploads/${basename}` : "";
};

const uploadWithCloudinary = (file, { folder, resourceType }) =>
  new Promise((resolve, reject) => {
    const targetFolder = sanitizeFolder(folder);
    const uploadOptions = {
      folder: targetFolder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    if (file?.buffer) {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        return resolve(result?.secure_url ?? "");
      });

      stream.end(file.buffer);
      return;
    }

    if (file?.path) {
      cloudinary.uploader
        .upload(file.path, uploadOptions)
        .then((result) => resolve(result?.secure_url ?? ""))
        .catch(reject);
      return;
    }

    resolve("");
  });

const saveUploadedFile = async (file, options = {}) => {
  if (!file) return "";

  if (!isCloudStorageEnabled()) {
    return buildLocalUploadUrl(file);
  }

  return uploadWithCloudinary(file, {
    folder: options.folder ?? "secondhand",
    resourceType: options.resourceType ?? inferResourceType(file),
  });
};

const saveUploadedFiles = async (files, options = {}) => {
  const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!normalizedFiles.length) return [];

  return Promise.all(
    normalizedFiles.map((file) =>
      saveUploadedFile(file, {
        folder: options.folder,
        resourceType: options.resourceType,
      })
    )
  );
};

const getUploadsRoot = () => path.resolve(__dirname, "..", "..", "uploads");

const extractUploadsRelativePath = (value = "") => {
  const normalizedValue = `${value ?? ""}`.trim();
  if (!normalizedValue) return "";

  if (normalizedValue.startsWith("/uploads/")) {
    return normalizedValue.slice("/uploads/".length);
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    if (parsedUrl.pathname.startsWith("/uploads/")) {
      return parsedUrl.pathname.slice("/uploads/".length);
    }
  } catch {
    // Ignore non-URL values and fall through.
  }

  return "";
};

const extractCloudinaryAssetInfo = (value = "") => {
  const normalizedValue = `${value ?? ""}`.trim();
  if (!normalizedValue) return null;

  try {
    const parsedUrl = new URL(normalizedValue);
    if (!parsedUrl.hostname.includes("cloudinary.com")) {
      return null;
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 1) return null;

    const resourceType = segments[uploadIndex - 1] || "image";
    const publicIdSegments = segments.slice(uploadIndex + 1);
    if (publicIdSegments[0] && /^v\d+$/.test(publicIdSegments[0])) {
      publicIdSegments.shift();
    }
    if (!publicIdSegments.length) return null;

    const lastSegment = publicIdSegments.pop();
    const extension = path.extname(lastSegment);
    publicIdSegments.push(extension ? lastSegment.slice(0, -extension.length) : lastSegment);

    return {
      resourceType,
      publicId: publicIdSegments.join("/"),
    };
  } catch {
    return null;
  }
};

const deleteUploadedFile = async (value = "") => {
  const localRelativePath = extractUploadsRelativePath(value);
  if (localRelativePath) {
    const uploadsRoot = getUploadsRoot();
    const targetPath = path.resolve(uploadsRoot, localRelativePath);
    if (!targetPath.startsWith(uploadsRoot)) {
      return false;
    }

    try {
      await fs.unlink(targetPath);
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  if (!isCloudStorageEnabled()) {
    return false;
  }

  const assetInfo = extractCloudinaryAssetInfo(value);
  if (!assetInfo?.publicId) {
    return false;
  }

  const result = await cloudinary.uploader.destroy(assetInfo.publicId, {
    resource_type: assetInfo.resourceType,
    invalidate: true,
  });

  return result?.result === "ok";
};

module.exports = {
  deleteUploadedFile,
  isCloudStorageEnabled,
  saveUploadedFile,
  saveUploadedFiles,
};
