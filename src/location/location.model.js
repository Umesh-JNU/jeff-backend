const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: [true, "Location Latitude is required."]
  },
  long: {
    type: Number,
    required: [true, "Location Longitude is required."]
  }, 
  name: {
    type: String,
    unique: true,
    required: [true, "Location Name is required."]
  }
}, { timestamps: true });

const locationModel = mongoose.model('Location', locationSchema);

module.exports = locationModel;