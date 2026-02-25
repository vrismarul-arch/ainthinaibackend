// controllers/bookingController.js
const db = require("../config/db");

const safe = (val) => (val === undefined ? null : val);

// ================= CREATE BOOKING =================
const createBooking = async (req, res) => {
  try {
    const {
      tourId,
      tourTitle,
      travelers,
      paymentType,
      paidAmount,
      totalAmount,
      adultCount,
      childCount
    } = req.body;

    console.log("=".repeat(50));
    console.log("CREATE BOOKING DEBUG:");
    console.log("Received tourId:", tourId);

    if (!tourId || !paymentType || !paidAmount) {
      return res.status(400).json({ 
        message: "Missing required fields"
      });
    }

    const userId = req.user.id;
    const tourIdString = String(tourId).trim();

    const [result] = await db.execute(
      `INSERT INTO bookings 
      (user_id, tour_id, tour_title, adult_count, child_count, total_amount, payment_type, paid_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        tourIdString,
        safe(tourTitle), 
        adultCount || 0, 
        childCount || 0, 
        totalAmount || 0, 
        paymentType, 
        paidAmount, 
        'pending'
      ]
    );

    const bookingId = result.insertId;

    // Insert travelers
    const allTravelers = [
      ...(travelers.adults || []).map(t => ({ ...t, type: "adult" })),
      ...(travelers.children || []).map(t => ({ ...t, type: "child" }))
    ];

    for (let t of allTravelers) {
      await db.execute(
        `INSERT INTO booking_travelers
        (booking_id, type, name, age, aadhaar)
        VALUES (?, ?, ?, ?, ?)`,
        [bookingId, t.type, safe(t.name), safe(t.age), safe(t.aadhaar)]
      );
    }

    res.status(201).json({
      message: "Booking created successfully",
      bookingId
    });

  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ================= GET MY BOOKINGS =================
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [bookings] = await db.execute(
      `SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    for (let booking of bookings) {
      const [travs] = await db.execute(
        `SELECT type, name, age, aadhaar
         FROM booking_travelers
         WHERE booking_id = ?`,
        [booking.id]
      );

      booking.travelers = {
        adults: travs.filter(t => t.type === "adult"),
        children: travs.filter(t => t.type === "child")
      };

      booking.tour_id = String(booking.tour_id);
    }

    res.json(bookings);

  } catch (err) {
    console.error("Error in getMyBookings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ALL BOOKINGS (ADMIN) =================
const getAllBookings = async (req, res) => {
  try {
    const [bookings] = await db.execute(`
      SELECT 
        b.id,
        b.user_id,
        u.name AS user_name,
        u.email AS user_email,
        b.tour_id,
        b.tour_title,
        b.adult_count,
        b.child_count,
        b.total_amount,
        b.payment_type,
        b.paid_amount,
        b.status,
        b.booking_date,
        b.created_at
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);

    const processedBookings = [];
    
    for (let booking of bookings) {
      const [travs] = await db.execute(
        `SELECT type, name, age, aadhaar
         FROM booking_travelers
         WHERE booking_id = ?`,
        [booking.id]
      );

      const processedBooking = {
        id: booking.id,
        user_id: booking.user_id,
        user_name: booking.user_name,
        user_email: booking.user_email,
        tour_id: booking.tour_id ? String(booking.tour_id).trim() : null,
        tour_title: booking.tour_title,
        adult_count: booking.adult_count,
        child_count: booking.child_count,
        total_amount: booking.total_amount,
        payment_type: booking.payment_type,
        paid_amount: booking.paid_amount,
        status: booking.status,
        booking_date: booking.booking_date,
        created_at: booking.created_at,
        travelers: {
          adults: travs.filter(t => t.type === "adult"),
          children: travs.filter(t => t.type === "child")
        }
      };

      processedBookings.push(processedBooking);
    }

    res.json(processedBookings);

  } catch (err) {
    console.error("Error in getAllBookings:", err);
    res.status(500).json({ 
      message: "Server error",
      error: err.message 
    });
  }
};

// ================= UPDATE BOOKING STATUS =================
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [result] = await db.execute(
      `UPDATE bookings SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ 
      message: "Booking status updated successfully",
      status 
    });

  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET BOOKING BY ID =================
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const [bookings] = await db.execute(
      `SELECT 
        b.*,
        u.name AS user_name,
        u.email AS user_email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookings[0];

    const [travs] = await db.execute(
      `SELECT type, name, age, aadhaar
       FROM booking_travelers
       WHERE booking_id = ?`,
      [booking.id]
    );

    booking.travelers = {
      adults: travs.filter(t => t.type === "adult"),
      children: travs.filter(t => t.type === "child")
    };

    booking.tour_id = String(booking.tour_id);

    res.json(booking);

  } catch (err) {
    console.error("Error in getBookingById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET BOOKING STATS =================
const getBookingStats = async (req, res) => {
  try {
    const [totalResult] = await db.execute(`SELECT COUNT(*) as total FROM bookings`);
    const [pendingResult] = await db.execute(`SELECT COUNT(*) as pending FROM bookings WHERE status = 'pending'`);
    const [confirmedResult] = await db.execute(`SELECT COUNT(*) as confirmed FROM bookings WHERE status = 'confirmed'`);
    const [completedResult] = await db.execute(`SELECT COUNT(*) as completed FROM bookings WHERE status = 'completed'`);
    const [cancelledResult] = await db.execute(`SELECT COUNT(*) as cancelled FROM bookings WHERE status = 'cancelled'`);
    const [revenueResult] = await db.execute(`SELECT SUM(paid_amount) as total_revenue FROM bookings WHERE status != 'cancelled'`);

    res.json({
      total: totalResult[0].total,
      pending: pendingResult[0].pending,
      confirmed: confirmedResult[0].confirmed,
      completed: completedResult[0].completed,
      cancelled: cancelledResult[0].cancelled,
      totalRevenue: revenueResult[0].total_revenue || 0
    });

  } catch (err) {
    console.error("Error getting booking stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// EXPORT ALL FUNCTIONS
module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  getBookingById,
  getBookingStats
};