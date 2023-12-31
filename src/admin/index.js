const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../../middlewares/auth");
const { upload } = require("../../utils/s3");

// ------------------------------------ ADMIN --------------------------------
const { adminLogin, updateAdminProfile, postSingleImage } = require("./adminController");

router.post("/login", adminLogin);
router.put("/update-profile", auth, isAdmin, updateAdminProfile);

// ------------------------------------ USER ---------------------------------
const { getAllUser, getUser, updateUser, deleteUser } = require("../user");

router.get("/user", auth, isAdmin, getAllUser);
router.route("/user/:id")
  .get(auth, isAdmin, getUser)
  .put(auth, isAdmin, updateUser)
  .delete(auth, isAdmin, deleteUser);

// ------------------------------------ MESSAGE ---------------------------------
const { getAllEnquiry, getEnquiry, deleteEnquiry } = require("../enquiry");

router.get("/enquiry", auth, isAdmin, getAllEnquiry);
router.route("/enquiry/:id")
  .get(auth, isAdmin, getEnquiry)
  .delete(auth, isAdmin, deleteEnquiry);

router.post("/image", auth, isAdmin, upload.single('image'), postSingleImage);

// ------------------------------------ TRUCK ---------------------------------
const { createTruck, getAllTruck, getTruck, updateTruck, deleteTruck } = require("../trucks");

router.post("/truck", auth, isAdmin, createTruck);
router.get("/truck", auth, isAdmin, getAllTruck);
router.route("/truck/:id")
  .get(auth, isAdmin, getTruck)
  .put(auth, isAdmin, updateTruck)
  .delete(auth, isAdmin, deleteTruck);

// ------------------------------------ Mill ---------------------------------
const { createMill, getAllMill, getMill, updateMill, deleteMill } = require("../mill");

router.post("/mill", auth, isAdmin, createMill);
router.get("/mill", auth, isAdmin, getAllMill);
router.route("/mill/:id")
  .get(auth, isAdmin, getMill)
  .put(auth, isAdmin, updateMill)
  .delete(auth, isAdmin, deleteMill);

// ------------------------------------ CONTENT ---------------------------------
const { createContent, getContent, updateContent } = require("../content");

router.route("/content")
  .post(auth, isAdmin, createContent)
  .get(auth, isAdmin, getContent)
  .put(auth, isAdmin, updateContent);

module.exports = router;
