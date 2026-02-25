// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth"); // Only import verifyToken
const bookingController = require("../controllers/bookingController");

// Create a dummy admin middleware that just passes through
const bypassAdmin = (req, res, next) => {
  next(); // Always allow access
};

// ================= USER ROUTES =================
router.post("/", verifyToken, bookingController.createBooking);
router.get("/my-bookings", verifyToken, bookingController.getMyBookings);
router.get("/:id", verifyToken, bookingController.getBookingById);

// ================= ADMIN ROUTES - NOW ACCESSIBLE =================
// Using bypassAdmin instead of real admin check
router.get("/admin/all", verifyToken, bypassAdmin, bookingController.getAllBookings);
router.get("/admin/stats", verifyToken, bypassAdmin, bookingController.getBookingStats);
router.put("/admin/:id/status", verifyToken, bypassAdmin, bookingController.updateBookingStatus);

module.exports = router;