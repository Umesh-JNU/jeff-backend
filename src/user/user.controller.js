const { default: mongoose, isValidObjectId, mongo } = require('mongoose');

const fs = require('fs');
const path = require('path');
const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const { userModel, logModel, otpModel } = require("./user.model");
const { s3Uploadv2 } = require('../../utils/s3');
const sendEmail = require('../../utils/sendEmail');
const { optGenerator } = require('../../utils/randGenerator');

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

// Get Email OTP / or resend
exports.verifyEmail = catchAsyncError(async (req, res, next) => {
  console.log("verifyEmail", req.body);
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler("Please enter your email.", 400));
  }

  const user = await userModel.findById(req.userId);
  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  const otp = optGenerator(6);
  const otpInstance = await otpModel.findOne({ user: req.userId });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!otpInstance) {
      await otpModel.create([{ otp, email, user: user._id }], { session });
    } else {
      otpInstance.otp = otp;
      otpInstance.email = email;
      await otpInstance.save({ session });
    }

    const template = fs.readFileSync(path.join(__dirname + `/verifyEmail.html`), "utf-8")
    // /{{(\w+)}}/g - match {{Word}} globally
    const renderedTemplate = template.replace(/{{(\w+)}}/g, (match, key) => {
      console.log({ match, key })
      return otp || match;
    });

    await sendEmail({
      subject: `Email Verification`,
      email,
      message: renderedTemplate
    });

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    await session.endSession();
  }
});

// vefiry email OTP
exports.verifyEmailOTP = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const { otp } = req.body;

  if (!otp) {
    return next(new ErrorHandler("Please provide otp.", 400));
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  const otpInstance = await otpModel.findOne({ otp, user: user._id });
  const isValidOTP = await otpInstance.is_valid();
  if (!otpInstance || !isValidOTP) {
    if (otpInstance) {
      await otpInstance.deleteOne();
    }
    return next(new ErrorHandler("OTP is invalid or has been expired.", 400));
  }

  user.email = otpInstance.email;
  await user.save();
  await otpInstance.deleteOne();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully"
  })
})


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

// get log by date
exports.getAllLogs = catchAsyncError(async (req, res, next) => {
  console.log("getAllLogs", req.params);

  let { date } = req.params;
  if (!date) {
    date = new Date().setHours(0, 0, 0, 0);
  } else {
    date = new Date(date);
  }

  const nextDate = new Date(date).setDate(date.getDate() + 1);
  console.log({ date, nextDate: new Date(nextDate) });
  const logs = await logModel.find({
    start: { $gte: date, $lt: nextDate }
  }).populate([{ path: "user", select: "firstname lastname" }]);

  res.status(200).json({ logs });
});

exports.getAllDriverLogs = catchAsyncError(async (req, res, next) => {
  console.log("getAllDriverLogs", req.params, req.query)
  const { id } = req.params;
  const { from, to } = req.query;

  const user = await userModel.findById(id);
  if (!user) {
    return next(new ErrorHandler("User Not Found", 404));
  }

  const dt = new Date(to);
  const nextDate = new Date(dt).setDate(dt.getDate() + 1);

  const userLogs = await logModel.find({
    user: id,
    start: { $gte: new Date(from), $lte: nextDate }
  });

  res.status(200).json({ userLogs, user });
});

// ---------------------------- CHECK IN / CHECK OUT ----------------------------
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
