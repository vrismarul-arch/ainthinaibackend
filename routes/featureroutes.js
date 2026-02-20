const express = require("express");
const router = express.Router();

const {
  createFeature,
  getFeaturesByType,
  updateFeature,
  deleteFeature
} = require("../controllers/featurescontroller");

router.post("/create", createFeature);
router.get("/:type", getFeaturesByType);
router.put("/:id", updateFeature);
router.delete("/:id", deleteFeature);

module.exports = router;
