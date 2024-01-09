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
	dispatch: {
		type: String,
		// required: [true, "Dispatch info is required."]
	},
	start_milage: {
		type: Number,
		required: [true, "Start Milage is Required."],
	},
	end_milage: { type: Number },
	arrival_time: { type: Date },
	load_time_start: { type: Date },
	load_time_end: { type: Date },
	end_time: { type: Date },
	driver: {
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

const subTripSchema = new mongoose.Schema({
	docs: [{ type: String }],
	mill_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Mill",
		required: [true, "Mill is required for a trip."],
	},
	prod_detail: {
		type: String,
		required: [true, "Product detail is required."]
	},
	slip_id: {
		type: String,
		required: [true, "Slip ID is required."]
	},
	block_name: {
		type: String,
		required: [true, "Block Name is required."]
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
	arrival_time: { type: Date },
	gross_wt: { type: Number },
	tare_wt: { type: Number },
	net_wt: { type: Number },
	unload_time_start: { type: Date },
	unload_time_end: { type: Date },
	trip: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Trip",
		required: [true, "Trip Reference is required."]
	},
}, { timestamps: true });

const tripModel = mongoose.model('Trip', tripSchema);
const subTripModel = mongoose.model('SubTrip', subTripSchema);

module.exports = { tripModel, subTripModel };