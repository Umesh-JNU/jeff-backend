const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "User ID is required."]
	},
	title: {
		type: String,
		required: [true, "Notification Title is required."],
	},
	desc: {
		type: String,
		required: [true, "Notification Description is required."],
	}
}, { timestamps: true });

const notificationModel = mongoose.model('Notification', notificationSchema);

module.exports = notificationModel;