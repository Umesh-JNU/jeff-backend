const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createTrip, getAllTrip, getTrip, updateTrip, deleteTrip, getDriverTrip, createSubTrip } = require("./trip.controller");
const { upload } = require("../../utils/s3");

router.post("/", auth, createTrip);
router.get("/current", auth, getDriverTrip);
router.get("/", auth, getAllTrip);

router.route("/:id").post(auth, upload.array("images"), createSubTrip);

module.exports = router;