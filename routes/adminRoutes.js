const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, verifyAdmin, adminController.getDashboard);
router.get('/users', verifyToken, verifyAdmin, adminController.getUsers);
router.get('/profile', verifyToken, verifyAdmin, adminController.getAdminProfile);

module.exports = router;