const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const serializeUser = require("../utils/serializeUser");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const normalizeLoginIdentifier = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const buildUsername = ({ username, firstName, lastName, email }) => {
  const directUsername = normalizeLoginIdentifier(username);
  if (directUsername) return directUsername;

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.includes("@")) {
    return normalizedEmail.split("@")[0];
  }

  return "user";
};

const buildDisplayName = ({ name, username }) => {
  const directName = normalizeLoginIdentifier(name);
  if (directName) return directName;

  return normalizeLoginIdentifier(username);
};

const register = async (req, res) => {
  try {
    const { password, phone, address, avatarUrl } = req.body;
    const email = normalizeEmail(req.body.email);
    const username = buildUsername(req.body);
    const name = buildDisplayName({ ...req.body, username });
    const firstName = normalizeLoginIdentifier(req.body.firstName);
    const lastName = normalizeLoginIdentifier(req.body.lastName);

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email and password"
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username },
      ],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          normalizeEmail(existingUser.email) === email
            ? "Email already exists"
            : "Username already exists"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      name,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      address,
      avatarUrl,
    });

    const serializedUser = serializeUser(newUser);
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: "Register successful",
      token,
      user: serializedUser,
      data: serializedUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email or username already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during register",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = normalizeLoginIdentifier(
      req.body.identifier ?? req.body.email ?? req.body.username ?? req.body.phone
    );
    const normalizedEmail = normalizeEmail(identifier);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: identifier },
        { phone: identifier }
      ]
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    if (`${user.banStatus ?? "active"}`.trim().toLowerCase() === "banned") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BANNED",
        message: "This account has been suspended by an administrator",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid password"
      });
    }

    const token = generateToken(user);
    const serializedUser = serializeUser(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: serializedUser,
      data: serializedUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user: serializeUser(user),
      data: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
      error: error.message
    });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful"
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
