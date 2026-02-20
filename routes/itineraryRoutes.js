const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/itineraryController");

router.post("/save", upload.any(), controller.saveItinerary);
router.get("/:tourId", controller.getItinerary);

module.exports = router;
