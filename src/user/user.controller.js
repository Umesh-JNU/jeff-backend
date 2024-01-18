const { default: mongoose, isValidObjectId } = require('mongoose');

const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const { userModel, logModel } = require("./user.model");
const { s3Uploadv2 } = require('../../utils/s3');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SERVICE_SID } = process.env;
const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const findUser = async (options, next) => {
  console.log("FIND_USER", { options })
  const user = await userModel.findOne(options);
  console.log({ user })
  if (!user) {
    return next(new ErrorHandler("User with mobile number is not registered.", 404));
  }

  return user;
};

const sendOTP = async (phoneNo) => {
  return await client.verify.v2.services(SERVICE_SID).verifications.create({ to: phoneNo, channel: "sms" });
};

const verifyOTP = async (phoneNo, code) => {
  const { status, valid } = await client.verify.v2.services(SERVICE_SID).verificationChecks.create({ to: phoneNo, code: code });
  if (status === 'pending' && !valid) throw new ErrorHandler("Invalid OTP", 401);
  return valid;
}

// Create a new document
exports.createUser = catchAsyncError(async (req, res, next) => {
  console.log("createUser", req.body);

  // await userModel.create(req.body);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let user = await userModel.findOne({ mobile_no: req.body.mobile_no }).select("+isRegistered");
    console.log({ user })
    if (!user) {
      user = (await userModel.create([req.body], { session }))[0];
    } else {
      if (user.isRegistered)
        return next(new ErrorHandler("User is already registered with this mobile number.", 400));
      else {
        await userModel.findOneAndUpdate({ mobile_no: req.body.mobile_no }, req.body, {
          new: true,
          runValidators: true,
          validateBeforeSave: true
        });
      }
    }

    const phoneNo = `${user.country_code}${user.mobile_no}`;
    const messageRes = await sendOTP(phoneNo);

    await session.commitTransaction();
    res.status(201).json({ message: "OTP sent successfully" });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    await session.endSession();
  }
});

// Login
exports.login = catchAsyncError(async (req, res, next) => {
  console.log("login", req.body);
  const { mobile_no } = req.body;

  if (!mobile_no)
    return next(new ErrorHandler("Please enter your mobile number", 400));

  const user = await findUser({ mobile_no, isRegistered: true }, next);
  const phoneNo = `${user.country_code}${mobile_no}`;
  console.log({ phoneNo, user })
  const messageRes = await sendOTP(phoneNo);

  res.status(200).json({ message: "OTP sent successfully" });
});

// verify OTP
exports.verifyOtp = catchAsyncError(async (req, res, next) => {
  console.log("verifyOTP", req.body);
  const { code, mobile_no } = req.body;
  if (!code) {
    return next(new ErrorHandler("Please send OTP", 400));
  }

  if (!mobile_no) {
    return next(new ErrorHandler("Mobile Number is required.", 400));
  }

  const user = await findUser({ mobile_no }, next);
  const phoneNo = `${user.country_code}${mobile_no}`;
  console.log({ phoneNo, user })
  const messageRes = await verifyOTP(phoneNo, code);
  console.log({ messageRes });
  user.isRegistered = true;
  await user.save();

  const token = await user.getJWTToken();
  res.status(200).json({
    user, token,
    message: "OTP verified successfully",
  })
});

// resend OTP
exports.resendOTP = catchAsyncError(async (req, res, next) => {
  const { mobile_no } = req.body;
  if (!mobile_no) {
    return next(new ErrorHandler("Mobile number is required.", 400));
  }

  const user = await findUser({ mobile_no, isRegistered: true }, next);
  const phoneNo = `${user.country_code}${mobile_no}`;
  console.log({ phoneNo, user })
  const messageRes = await sendOTP(phoneNo);

  res.status(200).json({ message: "OTP sent successfully" });
});

// Get Profile
exports.getProfile = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const user = await userModel.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  res.status(200).json({ user });
});

// Update Profile
exports.updateProfile = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const file = req.file;
  if (file) {
    const results = await s3Uploadv2(file, 'jeff');
    const location = results.Location && results.Location;
    req.body.profile_url = location;
  }

  delete req.body.password;
  delete req.body.mobile_no;
  delete req.body.isRegistered;

  console.log("update profile", { body: req.body });
  const user = await userModel.findByIdAndUpdate(userId, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });

  res.status(200).json({ message: "Profile Updated Successfully.", user });
});

// --------------------------------- ADMIN ---------------------------------
// Get all documents
exports.getAllUser = catchAsyncError(async (req, res, next) => {
  console.log("getAllUser", req.query);

  // Deleting Unregistered users.
  const expired = new Date(Date.now() - 10 * 60 * 1000);
  await userModel.deleteMany({ createdAt: { $lt: expired }, isRegistered: false });

  const apiFeature = new APIFeatures(
    userModel.find({ role: 'driver' }).sort({ createdAt: -1 }),
    req.query
  ).search("firstname");

  let users = await apiFeature.query;
  console.log("users", users);
  let userCount = users.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("userCount", userCount);
    users = await apiFeature.query.clone();
  }
  console.log("users", users);
  res.status(200).json({ users, userCount });
});

// Get a single document by ID
exports.getUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid User ID", 400));
  }

  const user = await userModel.findById(id);
  if (!user)
    return next(new ErrorHandler("User Not Found", 404));

  res.status(200).json({ user });
});

// update user
exports.updateUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true,
  });
  if (!user) {
    return next(new ErrorHandler("Driver Not Found", 404));
  }

  res.status(200).json({ user });
});

// Delete a document by ID
exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.userId;

  const user = await userModel.findById(id || userId);
  if (!user)
    return next(new ErrorHandler("Driver not found", 404));


  await user.deleteOne();

  res.status(200).json({
    message: "Driver Deleted successfully.",
  });
});

// --------------------------------- USER LOG ---------------------------------
// exports.checkIn = catchAsyncError(async (req, res, next) => {
//   const userId = req.userId;

//   const currentTime = Date.now();
//   const todayDate = new Date().setHours(0, 0, 0, 0);
//   let todayLog = await logModel.findOne({
//     user: userId,
//     start: { $lte: currentTime, $gt: todayDate }
//   });

//   if (!todayLog) {
//     todayLog = await logModel.create({ user: userId, start: Date.now() });
//   }
//   res.status(200).json({ todayLog });
// });

// exports.checkOut = catchAsyncError(async (req, res, next) => {
//   const userId = req.userId;
//   const { logId } = req.body;

//   let todayLog = await logModel.findOne({
//     user: userId,
//     _id: logId
//   });

//   if (!todayLog) {
//     return next(new ErrorHandler("You haven't checked in.", 400));
//   }

//   const nextDate = new Date(todayLog.start).setUTCHours(24, 0, 0, 0);
//   console.log({ nextDate, v: nextDate < Date.now() })
//   if (Date.now() < nextDate) {
//     todayLog.end = Date.now();
//     await todayLog.save();
//   }
//   res.status(200).json({ todayLog });
// });

exports.checkIn = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  await logModel.create({ user: userId, start: Date.now() });
  res.status(200).json({ success: true });
});

exports.checkOut = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const log = await logModel.findOne({ user: userId, end: null }).sort({ createdAt: -1 });

  console.log({ log });
  if (!log) {
    return next(new ErrorHandler("You haven't checked in.", 400));
  }

  log.end = Date.now();
  await log.save();

  res.status(200).json({ success: true });
});
