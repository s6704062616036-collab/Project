const User = require("../models/User");
const serializeUser = require("../utils/serializeUser");
const publicUserProfileService = require("../services/publicUserProfileService");
const { saveUploadedFile } = require("../services/fileStorageService");
const { composeStructuredAddress } = require("../utils/addressFormatter");

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const normalizeSavedAddresses = (rawAddresses, fallbackUser = null) => {
  let parsedAddresses = rawAddresses;

  if (typeof rawAddresses === "string") {
    const trimmed = rawAddresses.trim();
    if (!trimmed) return [];
    try {
      parsedAddresses = JSON.parse(trimmed);
    } catch {
      const error = new Error("Invalid addresses payload");
      error.status = 400;
      throw error;
    }
  }

  if (parsedAddresses == null) return [];
  if (!Array.isArray(parsedAddresses)) {
    const error = new Error("Addresses must be an array");
    error.status = 400;
    throw error;
  }

  if (parsedAddresses.length > 5) {
    const error = new Error("You can save at most 5 addresses");
    error.status = 400;
    throw error;
  }

  const normalizedAddresses = parsedAddresses
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;

      const houseNo = `${entry.houseNo ?? ""}`.trim();
      const village = `${entry.village ?? ""}`.trim();
      const subdistrict = `${entry.subdistrict ?? ""}`.trim();
      const district = `${entry.district ?? ""}`.trim();
      const province = `${entry.province ?? ""}`.trim();
      const postalCode = `${entry.postalCode ?? ""}`.trim();
      const note = `${entry.note ?? ""}`.trim();
      const address =
        composeStructuredAddress({
          houseNo,
          village,
          subdistrict,
          district,
          province,
          postalCode,
          note,
        }) || `${entry.address ?? ""}`.trim();
      if (!address) return null;

      const recipientName = `${entry.recipientName ?? entry.name ?? fallbackUser?.name ?? ""}`.trim();
      const phone = `${entry.phone ?? fallbackUser?.phone ?? ""}`.trim();
      const label = `${entry.label ?? ""}`.trim() || `ที่อยู่ ${index + 1}`;
      const id =
        `${entry.id ?? ""}`.trim() ||
        `address_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 8)}`;

      return {
        id,
        label: label.slice(0, 60),
        recipientName: recipientName.slice(0, 120),
        phone: phone.slice(0, 40),
        houseNo: houseNo.slice(0, 120),
        village: village.slice(0, 120),
        subdistrict: subdistrict.slice(0, 120),
        district: district.slice(0, 120),
        province: province.slice(0, 120),
        postalCode: postalCode.slice(0, 20),
        note: note.slice(0, 300),
        address: address.slice(0, 500),
        isDefault: Boolean(entry.isDefault),
      };
    })
    .filter(Boolean);

  if (!normalizedAddresses.length) return [];

  const defaultIndex = normalizedAddresses.findIndex((entry) => entry.isDefault);
  normalizedAddresses.forEach((entry, index) => {
    entry.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
  });

  return normalizedAddresses;
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const serializedUser = serializeUser(user);

    return res.status(200).json({
      success: true,
      user: serializedUser,
      data: serializedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: error.message
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (typeof req.body.name === "string") {
      user.name = req.body.name.trim();
    }

    if (typeof req.body.firstName === "string") {
      user.firstName = req.body.firstName.trim();
    }

    if (typeof req.body.lastName === "string") {
      user.lastName = req.body.lastName.trim();
    }

    const nextUsername =
      typeof req.body.username === "string" ? req.body.username.trim() : user.username;
    const nextEmail =
      typeof req.body.email === "string" ? normalizeEmail(req.body.email) : user.email;

    const conflictingUser = await User.findOne({
      _id: { $ne: user._id },
      $or: [
        { username: nextUsername },
        { email: nextEmail },
      ],
    }).select("_id username email");

    if (conflictingUser) {
      const isEmailConflict =
        normalizeEmail(conflictingUser.email) === nextEmail;

      return res.status(400).json({
        success: false,
        message: isEmailConflict ? "Email already exists" : "Username already exists",
      });
    }

    if (typeof req.body.username === "string") {
      user.username = nextUsername;
    }

    if (typeof req.body.email === "string") {
      user.email = nextEmail;
    }

    if (typeof req.body.phone === "string") {
      user.phone = req.body.phone.trim();
    }

    if (typeof req.body.address === "string") {
      user.address = req.body.address.trim();
    }

    if (req.body.addresses !== undefined) {
      const normalizedAddresses = normalizeSavedAddresses(req.body.addresses, user);
      user.addresses = normalizedAddresses;

      const primaryAddress =
        normalizedAddresses.find((entry) => entry?.isDefault && `${entry?.address ?? ""}`.trim()) ||
        normalizedAddresses.find((entry) => `${entry?.address ?? ""}`.trim());

      user.address = primaryAddress?.address ?? (typeof req.body.address === "string" ? req.body.address.trim() : "");
    }

    if (typeof req.body.avatarUrl === "string") {
      user.avatarUrl = req.body.avatarUrl.trim();
    }

    if (req.file) {
      user.avatarUrl = await saveUploadedFile(req.file, {
        folder: "secondhand/users/avatar",
      });
    }

    await user.save();

    const serializedUser = serializeUser(user);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: serializedUser,
      data: serializedUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Server error while updating profile" : error.message,
      error: error.message
    });
  }
};

const deleteMyProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting account",
      error: error.message
    });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await publicUserProfileService.getPublicUserProfile({
      userId: req.params.userId,
      baseUrl,
    });

    return res.status(200).json({
      success: true,
      ...result,
      data: result.profile,
    });
  } catch (error) {
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Server error while fetching public profile" : error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  getPublicProfile
};
