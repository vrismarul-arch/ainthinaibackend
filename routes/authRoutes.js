const express = require('express');
const router = express.Router();
const { googleLogin } = require("../controllers/userAuthController");

const auth = require('../controllers/authController');

router.post('/register', auth.register);
router.post('/login', auth.login);

// ✅ ADD THIS
router.post('/create-admin', auth.createAdmin);

// 🔹 GOOGLE LOGIN
router.post("/google", googleLogin);
module.exports = router;
