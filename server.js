require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const featureRoutes = require('./routes/featureroutes');
const tourRoutes = require("./routes/tourRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const categoryRoutes = require("./routes/categories");

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(morgan('dev'));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/tours', tourRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/categories", categoryRoutes);
app.get('/', (req, res) => {
  res.json({ message: "Backend Running" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Server error"
  });
});

(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ Database connected");
    conn.release();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
})();
