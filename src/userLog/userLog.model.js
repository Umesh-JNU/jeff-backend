const mongoose = require("mongoose");

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
		required: [true, "End Time is required."],
	}
});

const logModel = mongoose.model('UserLog', logSchema);

module.exports = logModel;
