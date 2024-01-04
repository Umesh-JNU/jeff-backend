const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createUser, login, updateProfile, verifyOtp, resendOTP, getProfile, deleteUser, checkIn, checkOut } = require("./user.controller");
const { upload } = require("../../utils/s3");

router.post("/register", createUser);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOTP);
router.get("/profile", auth, getProfile);
router.put("/update-profile", auth, upload.single("profile_img"), updateProfile);
router.delete("/delete-account", auth, deleteUser);

router.put("/check-in", auth, checkIn);
router.put("/check-out", auth, checkOut);

module.exports = router;
