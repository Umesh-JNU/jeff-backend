const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	driver: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "Driver is required."],
		select: false
	},
	title: {
		type: String,
		required: [true, "Notification title is required"]
	},
	text: {
		type: String,
		required: [true, "Notification title is required"]
	},
	seen: {
		type: Boolean,
		default: false,
	}
}, { timestamps: false });


module.exports = mongoose.model("Notification", notificationSchema);
