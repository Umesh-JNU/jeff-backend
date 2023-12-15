const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createEnquiry } = require("./enquiry.controller");
const { upload } = require("../../utils/s3");

router.post("/", auth, upload.single("image"), createEnquiry);

module.exports = router;
