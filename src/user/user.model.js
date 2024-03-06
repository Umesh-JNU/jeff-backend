const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const validateEmail = (email) => {
	var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
	return re.test(email);
};

const validatePassword = (password) => {
	var re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*(){}[\]<>]).*$/;
	// var re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*(\d|\W)).*$/;
	return re.test(password);
};

const logSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		require: [true, "User Id is required."]
	},
	start: {
		type: mongoose.Schema.Types.Date,
		required: [true, "Start Time is required."],
	},
	end: {
		type: mongoose.Schema.Types.Date,
		// required: [true, "End Time is required."],
	}
});

const logModel = mongoose.model('UserLog', logSchema);

// ----------------------------------------- EMAIL OTP ---------------------------------------
const otpSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "Driver ID is required."],
	},
	email: {
		type: String,
		required: [true, "Email is required."],
	},
	otp: {
		type: String,
		required: [true, "OTP is required."]
	}
}, { timestamps: true });

otpSchema.methods.is_valid = async function () {
	const otpValidityDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
	const currentTime = new Date().getTime();
	const otpCreationTime = new Date(this.createdAt).getTime();

	// Calculate the time difference between current time and OTP creation time
	const timeDifference = currentTime - otpCreationTime;

	// Check if the time difference is within the OTP validity duration
	return timeDifference <= otpValidityDuration;
};

const otpModel = mongoose.model("OTP", otpSchema);

// -------------------------------------------- USER -------------------------------------------
const userSchema = new mongoose.Schema({
	email: {
		type: String,
		// required: [true, "Email is required."],
		// unique: true,
		validate: [validateEmail, "Please fill a valid email address"]
	},
	password: {
		type: String,
		// required: [true, "Password is required."],
		minLength: [8, "Password must have at least 8 characters."],
		select: false,
	},
	firstname: {
		type: String,
		required: [true, "Firstname is required."]
	},
	lastname: {
		type: String,
		required: [true, "Lastname is required."]
	},
	mobile_no: {
		type: String,
		unique: true,
		minLength: [10, "Invalid Mobile Number"],
		maxLength: [10, "Invalid Mobile Number"],
		required: [true, "Mobile number is required."]
	},
	country_code: {
		type: String,
		required: [true, "Country Code is required."]
	},
	profile_url: { type: String },
	role: {
		type: String,
		default: "driver",
		enum: ["driver", "admin"],
	},
	isRegistered: {
		select: false,
		type: Boolean,
		default: false
	},
	hasTrip: {
		select: false,
		type: Boolean,
		default: false
	}
	// resetPasswordToken: String,
	// resetPasswordExpire: Date,
}, { timestamps: true });

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) next();

	this.password = await bcrypt.hash(this.password, 11);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getJWTToken = function () {
	return jwt.sign({ userId: this._id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_TOKEN_EXPIRE,
	});
};

// generating password reset token
userSchema.methods.getResetPasswordToken = function () {
	// generating token
	const resetToken = crypto.randomBytes(20).toString("hex");

	// hashing and adding resetPasswordToken to userSchema
	this.resetPasswordToken = crypto
		.createHash("sha256")
		.update(resetToken)
		.digest("hex");

	this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

	return resetToken;
};

const userModel = mongoose.model('User', userSchema);

module.exports = { userModel, logModel, otpModel };