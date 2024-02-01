const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
	driver: {
		type: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "Driver is required."]
		}],
		required: true,
		select: false
	},
	status: {
		type: String,
		default: "on-going",
		enum: ["on-going", "completed"]
	},

	source_loc: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location",
		required: [true, "Source location is required."],
	},
	load_loc: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location",
		required: [true, "Load location is required."],
	},
	unload_loc: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location"
	},
	end_loc: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location"
	},

	truck: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Truck",
		required: [true, "Truck is required for a trip."],
	},
	start_milage: {
		type: Number,
		required: [true, "Start Milage is Required."],
	},
	end_milage: { type: Number },
	dispatch: {
		type: String,
		// required: [true, "Dispatch info is required."]
	},

	load_loc_arr_time: { type: Date },
	load_time_start: { type: Date },
	load_time_end: { type: Date },

	unload_loc_arr_time: { type: Date },
	unload_time_start: { type: Date },
	unload_time_end: { type: Date },

	prod_detail: { type: String },
	gross_wt: { type: Number },
	tare_wt: { type: Number },
	net_wt: { type: Number },

	docs: [{ type: String }],
	slip_id: { type: String },
	block_no: { type: String },

	end_time: { type: Date },
}, { timestamps: true });


const tripModel = mongoose.model('Trip', tripSchema);

module.exports = { tripModel };