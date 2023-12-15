const fs = require('fs');
const crypto = require("node:crypto");
const path = require('path');
const { default: mongoose, isValidObjectId } = require('mongoose');

const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const sendEmail = require("../../utils/sendEmail");
const userModel = require("./user.model");
const transactionModel = require("../transaction/transaction.model");
const warrantyModel = require("../warranty/warranty.model");
const { s3Uploadv2 } = require('../../utils/s3');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SERVICE_SID } = process.env;
const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const findUser = async (mobile_no, next) => {
  const user = await userModel.findOne({ mobile_no });
  if (!user) {
    return next(new ErrorHandler("User with mobile number is not registered.", 404));
  }

  return user;
};

const sendOTP = async (phoneNo) => {
  return await client.verify.v2.services(SERVICE_SID).verifications.create({ to: phoneNo, channel: "sms" });
};

const verifyOTP = async (phoneNo, code) => {
  return await client.verify.v2.services(SERVICE_SID).verificationChecks.create({ to: phoneNo, code: code });
}

// Create a new document
exports.createUser = catchAsyncError(async (req, res, next) => {
  console.log("createUser", req.body);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = (await userModel.create([req.body], { session }))[0];
    if (!user) {
      return next(new ErrorHandler("Something Went Wrong. Please try again.", 500));
    }

    const phoneNo = `+${user.country_code}${user.mobile_no}`;
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

  const user = await findUser(mobile_no, next);
  const phoneNo = `+${user.country_code}${mobile_no}`;
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

  const user = await findUser(mobile_no, next);
  const phoneNo = `+${user.country_code}${mobile_no}`;
  console.log({ phoneNo, user })
  const messageRes = await verifyOTP(phoneNo, code);

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

  const user = await findUser(mobile_no, next);
  const phoneNo = `+${user.country_code}${mobile_no}`;
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

  console.log("update profile", { body: req.body });
  const user = await userModel.findByIdAndUpdate(userId, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });

  res.status(200).json({ message: "Profile Updated Successfully.", user });
});

// Get a single document by ID
exports.getUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.userId;
  if (!isValidObjectId(id || userId)) {
    return next(new ErrorHandler("Invalid User ID", 400));
  }

  if (req.query.task) {
    console.log({ "jere": "Fgdfgd" })
    var [user] = await userModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "warranties",
          localField: "_id",
          foreignField: "salePerson",
          pipeline: [
            {
              $lookup: {
                from: "plans",
                localField: "plan",
                foreignField: "_id",
                as: "plan"
              }
            },
            { $unwind: "$plan" },
            {
              $lookup: {
                from: "levels",
                localField: "plan.level",
                foreignField: "_id",
                as: "plan.level"
              }
            },
            { $unwind: "$plan.level" },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                user: 1,
                plan: "$plan.level.level",
                vehicleDetails: 1,
                status: 1,
              }
            }
          ],
          as: "warranties"
        }
      }
    ]);
  } else {
    const userDetails = await userModel.findById(id ? id : userId);
    console.log({ userDetails })
    const warranties = await warrantyModel.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userDetails._id) } },
      {
        $lookup: {
          from: "plans",
          localField: "plan",
          foreignField: "_id",
          as: "plan"
        }
      },
      { $unwind: "$plan" },
      {
        $lookup: {
          from: "levels",
          localField: "plan.level",
          foreignField: "_id",
          as: "plan.level"
        }
      },
      { $unwind: "$plan.level" },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "warranty",
          as: "transaction"
        }
      },
      {
        $project: {
          _id: 1,
          plan: "$plan.level.level",
          amount: { $sum: "$transaction.amount" },
          vehicleDetails: 1,
          status: 1,
        }
      }
    ]);
    var user = { ...userDetails._doc, warranties };
  }

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  res.status(200).json({ user });
});

// Update a document by ID


exports.updatePassword = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  if (!isValidObjectId(userId)) {
    console.log({ userId }, 2)
    return next(new ErrorHandler("Invalid User ID", 400));
  }

  const { curPassword, newPassword, confirmPassword } = req.body;
  if (!curPassword)
    return next(new ErrorHandler("Current Password is required.", 400));

  if (!newPassword || !confirmPassword)
    return next(new ErrorHandler("Password or Confirm Password is required.", 400));

  if (newPassword !== confirmPassword)
    return next(new ErrorHandler("Please confirm your password,", 400));

  const user = await userModel.findOne({ _id: userId }).select("+password");
  if (!user) return new ErrorHandler("User Not Found.", 404);

  const isPasswordMatched = await user.comparePassword(curPassword);
  if (!isPasswordMatched)
    return next(new ErrorHandler("Current Password is invalid.", 400));

  user.password = newPassword;
  await user.save();
  res.status(200).json({ message: "Password Updated Successfully." });
});

// update new document
exports.updateUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  await userUpdate(id, req.body, res, next)
});


// Get all documents
exports.getAllUser = catchAsyncError(async (req, res, next) => {
  console.log("get all users", req.query);
  let role = {};
  if (req.query.role) {
    role = { role: req.query.role };
  }

  const apiFeature = new APIFeatures(
    userModel.find(role).sort({ createdAt: -1 }),
    req.query
  ).search("firstname");

  let users = await apiFeature.query;
  console.log("users", users);
  let usersCount = users.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("usersCount", usersCount);
    users = await apiFeature.query.clone();
  }
  console.log("users", users);
  res.status(200).json({ users, usersCount });
});

// create sale person
exports.createSalePerson = catchAsyncError(async (req, res, next) => {
  console.log("create sale person", req.body);
  const salePerson = await userModel.create({ role: "sale-person", ...req.body });
  res.status(200).json({ salePerson });
})

exports.deleteSalePerson = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let user = await userModel.findById(id);

  if (!user)
    return next(new ErrorHandler("Sale Person not found", 404));

  await warrantyModel.updateMany({ salePerson: user._id }, { salePerson: null });
  await user.deleteOne();

  res.status(200).json({
    message: "Sale Person Deleted successfully.",
  });
});

// Delete a document by ID
exports.deleteUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let user = await userModel.findById(id);

  if (!user)
    return next(new ErrorHandler("User not found", 404));

  await transactionModel.deleteMany({ user: user._id });
  await warrantyModel.deleteMany({ user: user._id });
  await user.deleteOne();

  res.status(200).json({
    message: "User Deleted successfully.",
  });
});

// forget password
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  console.log("forgot password", req.body)
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler("Please provide the email.", 400));
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  // get resetPassword Token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  console.log(req);
  // const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  console.log({ h: req.get("origin") })
  const resetPasswordUrl = `${req.get("origin")}/password/reset/${resetToken}`;
  console.log({ resetPasswordUrl })
  try {
    const template = fs.readFileSync(path.join(__dirname, "passwordReset.html"), "utf-8");

    // /{{(\w+)}}/g - match {{Word}} globally
    const renderedTemplate = template.replace(/{{(\w+)}}/g, (match, key) => {
      console.log({ match, key })
      return { resetPasswordUrl, firstname: user.firstname, lastname: user.lastname }[key] || match;
    });

    await sendEmail({
      email: user.email,
      subject: `Password Reset`,
      message: renderedTemplate
    });

    res.status(200).json({
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});

// Reset password
exports.resetPassword = catchAsyncError(async (req, res, next) => {
  console.log("reset password", req.body);
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) {
    return next(new ErrorHandler("Please provide password and confirm password.", 400));
  }
  // creating hash token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  console.log({ resetPasswordToken })
  const user = await userModel.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler("Reset password token is invalid or has been expired.", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Please confirm your password", 400));
  }
  user.password = password;
  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;
  await user.save({ validateBeforeSave: false });

  const token = await user.getJWTToken();
  res.status(200).json({ user, token });
});