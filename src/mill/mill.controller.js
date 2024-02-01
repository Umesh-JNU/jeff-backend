const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const millModel = require("./mill.model");
const { isValidObjectId, default: mongoose } = require("mongoose");
const { v4: uuid } = require("uuid");
const locationModel = require("../location/location.model");

// Create a new document
exports.createMill = catchAsyncError(async (req, res, next) => {
  console.log("createMill", req.body);
  const { mill_name, name, lat, long } = req.body;
  const newLoaction = await locationModel.create({ name, lat, long });
  const mill = await millModel.create({ mill_name, address: newLoaction._id });
  res.status(201).json({ mill });
});

// Get a single document by ID
exports.getMill = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid mill ID", 400));
  }

  const mill = await millModel
    .findById(id)
    .populate("address", "lat long name");
  console.log(mill);
  if (!mill) {
    return next(new ErrorHandler("Mill not found.", 404));
  }

  res.status(200).json({ mill });
});

// Get all documents
exports.getAllMill = catchAsyncError(async (req, res, next) => {
  console.log("getAllMill", req.query);

  const apiFeature = new APIFeatures(
    millModel
      .find()
      .sort({ createdAt: -1 })
      .populate("address", "lat long name"),
    req.query
  ).search("id");

  let mills = await apiFeature.query;
  console.log("mills", mills);
  let millCount = mills.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("millCount", millCount);
    mills = await apiFeature.query.clone();
  }
  console.log("mills", mills);
  res.status(200).json({ mills, millCount });
});

// Update mill
exports.updateMill = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { mill_name, address } = req.body;
  const mill = await millModel
    .findById(id)
    .populate("address", "lat long name");
  if (!mill) return next(new ErrorHandler("Mill not found", 404));

  const location = await locationModel.findOne({ name: address.name });
  if (location) {
    mill.address = location;
  } else {
    mill_name && (mill.mill_name = mill_name);
    mill.address = address;
  }

  await mill.save();

  res.status(200).json({ mill });
});

// Delete a document by ID
exports.deleteMill = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let mill = await millModel.findById(id);

  if (!mill) return next(new ErrorHandler("Mill not found", 404));

  await mill.deleteOne();

  res.status(200).json({
    message: "Mill Deleted successfully.",
  });
});
