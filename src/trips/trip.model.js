const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
	desc: {
		type: String,
		maxLength: [250, "Trip Description should have maximum 250 characters"],
		required: [true, "Trip description is required."]
	},
	truck: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Truck",
		required: [true, "Truck is required for a trip."],
	},
	source: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location",
		required: [true, "Source is required."],
	},
	dest: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location",
		required: [true, "Destination is required."],
	},
	start_milage: {
		type: Number,
		required: [true, "Start Milage is Required."],
	},
	end_milage: { type: Number },
	arrival_time: { type: Date },
	load_time: { type: String },
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: [true, "Driver is required."]
	},
	status: {
		type: String,
		default: "on-going",
		enum: ["on-going", "completed"]
	}
}, { timestamps: true });

const tripModel = mongoose.model('Trip', tripSchema);

module.exports = tripModel;