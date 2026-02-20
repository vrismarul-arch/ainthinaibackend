const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createTour,
  updateTour,
  deleteTour,getTourById,
  getTours
} = require("../controllers/tourController");

// CREATE
router.post(
  "/create",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 20 }
  ]),
  createTour
);

// UPDATE
router.put(
  "/:id",
  upload.fields([
    { name: "main_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 20 }
  ]),
  updateTour
);

// DELETE
router.delete("/:id", deleteTour);

// GET
router.get("/", getTours);
router.get("/:id", getTourById);

module.exports = router;
