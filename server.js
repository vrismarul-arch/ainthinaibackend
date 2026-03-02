require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const db = require("./config/db");

// 🔹 Route Imports
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const featureRoutes = require("./routes/featureroutes");
const tourRoutes = require("./routes/tourRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const categoryRoutes = require("./routes/categories");
const bookingRoutes = require("./routes/bookingRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();

/* ==========================
   🔹 MIDDLEWARE
========================== */

// CORS (adjust origin in production)
app.use(
  cors({
    origin: "*", // ⚠ change in production
    credentials: true,
  })
);

// Logger
app.use(morgan("dev"));

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ==========================
   🔹 ROUTES
========================== */

// Auth Routes (Google Login → /auth/google)
app.use("/auth", authRoutes);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Other API Routes
app.use("/api/features", featureRoutes);
app.use("/api/tours", tourRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Running Successfully 🚀",
  });
});

/* ==========================
   🔹 404 HANDLER
========================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ==========================
   🔹 GLOBAL ERROR HANDLER
========================== */

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ==========================
   🔹 START SERVER
========================== */

const startServer = async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ Database connected successfully");
    conn.release();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

startServer();