const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware"); // unga middleware file path
const {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/userController");

router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.delete("/profile", verifyToken, deleteAccount);

module.exports = router;