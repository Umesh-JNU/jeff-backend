const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createTrip, getAllTrip, getTrip, updateTrip, deleteTrip, getDriverTrip } = require("./trip.controller");

router.post("/", auth, createTrip);
router.get("/current", auth, getDriverTrip);
router.get("/", auth, getAllTrip);

module.exports = router;