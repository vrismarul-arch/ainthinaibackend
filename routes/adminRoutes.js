const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Dashboard
router.get('/dashboard', authMiddleware, adminController.getDashboard);

// Users list
router.get('/users', authMiddleware, adminController.getUsers);

// Admin profile
router.get('/profile', authMiddleware, adminController.getAdminProfile);

module.exports = router;
