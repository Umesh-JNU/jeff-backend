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


const { deleteEnquiry, getEnquiry, getAllEnquiry, updateEnquiry } = require("../enquiry");



router.get("/users", auth, isAdmin, getAllUser);
router.route("/user/:id")
  .get(auth, isAdmin, getUser)
  .put(auth, isAdmin, updateUser)
  .delete(auth, isAdmin, deleteUser);


router.get("/enquiry", auth, isAdmin, getAllEnquiry);
router.route("/enquiry/:id")
  .get(auth, isAdmin, getEnquiry)
  .put(auth, isAdmin, updateEnquiry)
  .delete(auth, isAdmin, deleteEnquiry);

router.post("/image", auth, isAdmin, upload.single('image'), postSingleImage);

module.exports = router;
