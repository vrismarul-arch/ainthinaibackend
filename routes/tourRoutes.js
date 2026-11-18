
const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createTour,
  getTours,
  getTourById,
  updateTour,
  deleteTour,
  reorderTours,
  toggleNewAttraction,
} = require("../controllers/tourController");

// =====================================
// CREATE ATTRACTION
// POST /api/tours/create
// =====================================

router.post(
  "/create",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 20 },
  ]),
  createTour
);

// =====================================
// GET ALL ATTRACTIONS
// GET /api/tours
// =====================================

router.get("/", getTours);

// =====================================
// REORDER ATTRACTIONS
// PUT /api/tours/reorder
// =====================================

router.put("/reorder", reorderTours);

// =====================================
// TOGGLE NEW ATTRACTION
// PATCH /api/tours/:id/new-status
// =====================================

router.patch("/:id/new-status", toggleNewAttraction);

// =====================================
// GET SINGLE ATTRACTION
// GET /api/tours/:id
// =====================================

router.get("/:id", getTourById);

// =====================================
// UPDATE ATTRACTION
// PUT /api/tours/:id
// =====================================

router.put(
  "/:id",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 20 },
  ]),
  updateTour
);

// =====================================
// DELETE ATTRACTION
// DELETE /api/tours/:id
// =====================================

router.delete("/:id", deleteTour);

module.exports = router;
