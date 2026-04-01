const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id email role banStatus");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user no longer exists"
      });
    }

    if (`${user.banStatus ?? "active"}`.trim().toLowerCase() === "banned") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BANNED",
        message: "This account has been suspended by an administrator",
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role ?? "user",
      banStatus: user.banStatus ?? "active",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid token"
    });
  }
};

module.exports = protect;
