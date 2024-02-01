const mongoose = require("mongoose");

const millSchema = new mongoose.Schema(
  {
    mill_name: {
      type: String,
      required: [true, "Mill name is required"],
    },
    address: {
      type: mongoose.Types.ObjectId,
      required: [true, "Address is required"],
      ref: "Location",
    },
  },
  { timestamps: true }
);

const millModel = mongoose.model("Mill", millSchema);

module.exports = millModel;
