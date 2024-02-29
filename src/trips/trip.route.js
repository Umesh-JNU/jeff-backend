const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createTrip, getDriverTrip, getTripHistory, updateTrip, createSubTrip, updateSubTrip, shiftChange } = require("./trip.controller");
const { upload } = require("../../utils/s3");

router.route("/")
  .post(auth, createTrip)
  .get(auth, getTripHistory);

router.put("/shift-change", auth, shiftChange);
router.get("/current", auth, getDriverTrip);

router.route("/:id")
  .put(auth, upload.array("docs"), updateTrip) // update - anything
  .get(auth, getDriverTrip);
  
module.exports = router;