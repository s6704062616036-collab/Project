const express = require("express");
const router = express.Router();

const { register, login, resetPassword, getMe, logout } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
