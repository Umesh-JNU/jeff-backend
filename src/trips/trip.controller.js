const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const { tripModel, subTripModel } = require("./trip.model");
const { isValidObjectId, default: mongoose } = require("mongoose");
const { v4: uuid } = require("uuid");
const truckModel = require("../trucks/truck.model");

// Create a new document
exports.createTrip = catchAsyncError(async (req, res, next) => {
  console.log("createTrip", req.body);
  const userId = req.userId;

  const trip = await tripModel.create({ ...req.body, user: userId });
  if (trip) {
    await truckModel.findByIdAndUpdate(req.body.truck, { is_avail: false }, {
      new: true,
      runValidators: true,
      validateBeforeSave: true
    });
  }
  res.status(201).json({ trip });
});

// Get a single document by ID
exports.getTrip = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid Trip ID", 400));
  }

  const trip = await tripModel.findById(id);
  if (!trip) {
    return next(new ErrorHandler("Trip not found.", 404));
  }

  res.status(200).json({ trip });
});

// Get Current Trip of Driver
exports.getDriverTrip = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const trip = await tripModel.findOne({ user: userId, status: "on-going" }).populate([
    { path: "source", select: "name lat long" },
    { path: "dest", select: "name lat long" },
    { path: "truck", select: "truck_id plate_no name" }
  ]);
  if (!trip) {
    return next(new ErrorHandler("No On-going trip", 400));
  }

  res.status(200).json({ trip });
});

// Get all documents
exports.getAllTrip = catchAsyncError(async (req, res, next) => {
  console.log("getAllTrip", req.query);

  const apiFeature = new APIFeatures(
    tripModel.find().sort({ createdAt: -1 }).populate([
      { path: "truck", select: "truck_id plate_no name" },
      { path: "source", select: "name lat long" },
      { path: "dest", select: "name lat long" },
      { path: "user", select: "firstname lastname mobile_no" },
    ]),
    req.query
  ).search("trip_id");

  let trips = await apiFeature.query;
  console.log("Trips", trips);
  let tripCount = trips.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("tripCount", tripCount);
    trips = await apiFeature.query.clone();
  }
  console.log("trips", trips);
  res.status(200).json({ trips, tripCount });
});

// Update trip
exports.updateTrip = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const trip = await tripModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });

  res.status(200).json({ trip });
});

// Delete a document by ID
exports.deleteTrip = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let trip = await tripModel.findById(id);

  if (!trip)
    return next(new ErrorHandler("Trip not found", 404));

  await trip.deleteOne();

  res.status(200).json({
    message: "Trip Deleted successfully.",
  });
});   
