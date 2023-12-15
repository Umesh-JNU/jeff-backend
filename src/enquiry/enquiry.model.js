const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "User ID is required."]
	},
	message: {
		type: String,
		required: [true, "Message is required."],
	},
	image: {
		type: String
	}
}, { timestamps: true });

const enquiryModel = mongoose.model('Enquiry', enquirySchema);

module.exports = enquiryModel;