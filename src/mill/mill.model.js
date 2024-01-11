const mongoose = require('mongoose');

const millSchema = new mongoose.Schema({
	id: {
		type: String,
		required: [true, "Mill ID is required."]
	}
}, { timestamps: true });

const millModel = mongoose.model('Mill', millSchema);

module.exports = millModel;