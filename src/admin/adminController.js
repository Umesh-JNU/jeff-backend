const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const APIFeatures = require("../../utils/apiFeatures");
const { userModel } = require("../user/user.model");
const { s3Uploadv2, s3UploadMulti } = require("../../utils/s3");
const { enquiryModel } = require("../enquiry");

exports.postSingleImage = catchAsyncError(async (req, res, next) => {
  const file = req.file;
  if (!file) return next(new ErrorHandler("Invalid File (Image/PDF).", 401));

  const results = await s3Uploadv2(file);
  const location = results.Location && results.Location;
  return res.status(201).json({ data: { location } });
});

exports.adminLogin = catchAsyncError(async (req, res, next) => {
  console.log("admin login", req.body);
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorHandler("Please enter your email and password", 400));

  const user = await userModel.findOne({ email }).select("+password +active");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched)
    return next(new ErrorHandler("Invalid email or password!", 401));

  if (user.role !== 'admin') {
    return next(new ErrorHandler("Only Admin can access the portal.", 401));
  }

  const token = await user.getJWTToken();
  res.status(200).json({ user, token });
});

exports.updateAdminProfile = catchAsyncError(async (req, res, next) => {
  console.log("UPDATE ADMIN PROFILE", req.body);
  const { firstname, lastname, mobile_no, profile_url, password, email } = req.body;

  const user = await userModel.findById(req.userId);
  user.email = email;
  user.firstname = firstname;
  user.lastname = lastname;
  user.mobile_no = mobile_no;
  user.profile_url = profile_url;
  if (password) user.password = password;
  await user.save();

  res.status(200).json({ user });
});

exports.postMultipleImages = catchAsyncError(async (req, res, next) => {
  const files = req.files;
  if (files) {
    const results = await s3UploadMulti(files);
    console.log(results);
    let location = [];
    results.filter((result) => {
      location.push(result.Location);
    });
    return res.status(201).json({ data: { location } });
  } else {
    return next(new ErrorHandler("Invalid Image", 401));
  }
});

