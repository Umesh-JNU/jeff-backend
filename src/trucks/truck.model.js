const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
	truck_id: {
		type: String,
		required: [true, "Truck ID is required."]
	},
	plate_no: {
		type: String,
		required: [true, "Truck Plate No. is required."],
	},
  name: {
		type: String,
		required: [true, "Truck Name is required."],
	},
  is_avail: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

const truckModel = mongoose.model('Truck', truckSchema);

module.exports = truckModel;