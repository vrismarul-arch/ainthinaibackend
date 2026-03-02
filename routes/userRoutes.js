const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

// Admin
router.get("/", userController.getUsers);
router.post("/", userController.addUser);

// Logged-in user
router.get("/profile", verifyToken, userController.getProfile);
router.put("/profile", verifyToken, userController.updateProfile);

module.exports = router;