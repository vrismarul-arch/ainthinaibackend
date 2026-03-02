// controllers/bookingController.js
const db = require("../config/db");

const safe = (val) => (val === undefined ? null : val);

// ================= CREATE BOOKING =================
const createBooking = async (req, res) => {
  const connection = await db.getConnection(); // for transaction

  try {
    // ================= GET DATA =================
    const {
      tourId,
      tourTitle,
      travelers,
      paymentType,
      paidAmount,
      totalAmount,
      adultCount,
      childCount,
      check_in_date,   // frontend sends this
      check_out_date   // frontend sends this
    } = req.body;

    console.log("=".repeat(50));
    console.log("CREATE BOOKING DEBUG");
    console.log(req.body);

    // convert to backend variable names
    const checkIn = check_in_date;
    const checkOut = check_out_date;

    // ================= VALIDATION =================
    if (!tourId || !paymentType || !paidAmount) {
      return res.status(400).json({
        message: "tourId, paymentType and paidAmount are required"
      });
    }

    if (!travelers || typeof travelers !== "object") {
      return res.status(400).json({
        message: "Travelers data is required"
      });
    }

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        message: "Check-in and Check-out dates are required"
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const tourIdString = String(tourId).trim();

    // ================= START TRANSACTION =================
    await connection.beginTransaction();

    // ================= INSERT BOOKING =================
    const [result] = await connection.execute(
      `INSERT INTO bookings 
      (user_id, tour_id, tour_title, adult_count, child_count, 
       total_amount, payment_type, paid_amount, status,
       check_in, check_out)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tourIdString,
        tourTitle || null,
        adultCount || 0,
        childCount || 0,
        totalAmount || 0,
        paymentType,
        paidAmount,
        "pending",
        checkIn,
        checkOut
      ]
    );

    const bookingId = result.insertId;

    // ================= PREPARE TRAVELERS =================
    const allTravelers = [
      ...(travelers.adults || []).map(t => ({
        ...t,
        type: "adult"
      })),
      ...(travelers.children || []).map(t => ({
        ...t,
        type: "child"
      }))
    ];

    // ================= INSERT TRAVELERS =================
    for (let t of allTravelers) {
      await connection.execute(
        `INSERT INTO booking_travelers
        (booking_id, type, name, age, aadhaar)
        VALUES (?, ?, ?, ?, ?)`,
        [
          bookingId,
          t.type,
          t.name || null,
          t.age || null,
          t.aadhaar || null
        ]
      );
    }

    // ================= COMMIT =================
    await connection.commit();
    connection.release();

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId
    });

  } catch (err) {
    await connection.rollback();
    connection.release();

    console.error("CREATE BOOKING ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error while creating booking",
      error: err.message
    });
  }
};



// ================= GET MY BOOKINGS =================
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // ================= GET BOOKINGS =================
    const [bookings] = await db.execute(
      `SELECT 
        id,
        tour_id,
        tour_title,
        adult_count,
        child_count,
        total_amount,
        payment_type,
        paid_amount,
        status,
        check_in,
        check_out,
        booking_date,
        created_at
      FROM bookings
      WHERE user_id = ?
      ORDER BY created_at DESC`,
      [userId]
    );

    if (bookings.length === 0) {
      return res.json({
        success: true,
        bookings: []
      });
    }

    // ================= GET ALL TRAVELERS IN ONE QUERY =================
    const bookingIds = bookings.map(b => b.id);

    const [travs] = await db.execute(
      `SELECT booking_id, type, name, age, aadhaar
       FROM booking_travelers
       WHERE booking_id IN (${bookingIds.map(() => "?").join(",")})`,
      bookingIds
    );

    // ================= ATTACH TRAVELERS =================
    const processedBookings = bookings.map(booking => {
      const relatedTravs = travs.filter(
        t => t.booking_id === booking.id
      );

      return {
        ...booking,
        tour_id: booking.tour_id ? String(booking.tour_id).trim() : null,
        travelers: {
          adults: relatedTravs.filter(t => t.type === "adult"),
          children: relatedTravs.filter(t => t.type === "child")
        }
      };
    });

    return res.json({
      success: true,
      bookings: processedBookings
    });

  } catch (err) {
    console.error("GET MY BOOKINGS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
      error: err.message
    });
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
        b.check_in,          -- ✅ added
        b.check_out,         -- ✅ added
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
        check_in: booking.check_in,     // ✅ added
        check_out: booking.check_out,   // ✅ added
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
    const bookingId = parseInt(req.params.id);
    let { status } = req.body;

    // ================= VALIDATION =================
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    status = status.trim().toLowerCase();

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`
      });
    }

    // ================= OPTIONAL: ADMIN CHECK =================
    // If only admin should update booking status
    // Uncomment if needed

    /*
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }
    */

    // ================= UPDATE QUERY =================
    const [result] = await db.execute(
      `UPDATE bookings 
       SET status = ?, updated_at = NOW() 
       WHERE id = ?`,
      [status, bookingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: {
        bookingId,
        status
      }
    });

  } catch (error) {
    console.error("Update Booking Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ================= GET BOOKING BY ID =================
const getBookingById = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    // ================= VALIDATION =================
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    // ================= FETCH BOOKING =================
    const [rows] = await db.execute(
      `SELECT 
        b.id,
        b.user_id,
        b.tour_id,
        b.tour_title,
        b.adult_count,
        b.child_count,
        b.total_amount,
        b.payment_type,
        b.paid_amount,
        b.status,
        b.check_in,        -- ✅ ensured
        b.check_out,       -- ✅ ensured
        b.booking_date,
        b.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    const booking = rows[0];

    // ================= FETCH TRAVELERS =================
    const [travellers] = await db.execute(
      `SELECT type, name, age, aadhaar
       FROM booking_travelers
       WHERE booking_id = ?`,
      [bookingId]
    );

    // ================= FORMAT RESPONSE =================
    const formattedBooking = {
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
      check_in: booking.check_in,      // ✅ included
      check_out: booking.check_out,    // ✅ included
      booking_date: booking.booking_date,
      created_at: booking.created_at,
      travelers: {
        adults: travellers.filter(t => t.type === "adult"),
        children: travellers.filter(t => t.type === "child")
      }
    };

    return res.status(200).json({
      success: true,
      data: formattedBooking
    });

  } catch (error) {
    console.error("Get Booking By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// ================= GET BOOKING STATS =================
const getBookingStats = async (req, res) => {
  try {
    // ================= OPTIONAL ADMIN CHECK =================
    /*
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }
    */

    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status != 'cancelled' THEN paid_amount ELSE 0 END) AS total_revenue
      FROM bookings
    `);

    const stats = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        confirmed: Number(stats.confirmed) || 0,
        completed: Number(stats.completed) || 0,
        cancelled: Number(stats.cancelled) || 0,
        totalRevenue: Number(stats.total_revenue) || 0
      }
    });

  } catch (error) {
    console.error("Get Booking Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
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