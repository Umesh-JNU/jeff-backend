const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  tc: { type: String },
  pp: { type: String }
}, { timestamps: true });

const contentModel = mongoose.model('Content', contentSchema);

module.exports = contentModel;