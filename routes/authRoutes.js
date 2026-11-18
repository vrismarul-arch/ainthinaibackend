const express = require("express");
const router = express.Router();

const { googleLogin } = require("../controllers/userAuthController");
const auth = require("../controllers/authController");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/create-admin", auth.createAdmin);

// 🔹 GOOGLE LOGIN
router.post("/google", googleLogin);

// 🔹 LOGOUT (JWT stateless, so client token-a remove pannaa podhum)
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;