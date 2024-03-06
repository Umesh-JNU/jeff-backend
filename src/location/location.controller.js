const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const locationModel = require("./location.model");
const { isValidObjectId } = require("mongoose");
const { tripModel, subTripModel } = require("../trips/trip.model");

// Create a new document
exports.createLocation = catchAsyncError(async (req, res, next) => {
  console.log("createLocation", req.body);

  const location = await locationModel.create(req.body);
  res.status(201).json({ location });
});

// Get a single document by ID
exports.getLocation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid Location ID", 400));
  }

  const location = await locationModel.findById(id);
  if (!location) {
    return next(new ErrorHandler("Location not found.", 404));
  }

  res.status(200).json({ location });
});

// Get all documents
exports.getAllLocation = catchAsyncError(async (req, res, next) => {
  console.log("getAllLocation", req.query);

  const apiFeature = new APIFeatures(
    locationModel.find().sort({ createdAt: -1 }),
    req.query
  ).search("name");

  let locations = await apiFeature.query;
  console.log("locations 1", locations);
  let locationCount = locations.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("locationCount", locationCount);
    locations = await apiFeature.query.clone();
  }
  console.log("locations 2", locations);
  res.status(200).json({ locations, locationCount });
});

// Update Location
exports.updateLocation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const location = await locationModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });

  res.status(200).json({ location });
});

// Delete a document by ID
exports.deleteLocation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (id === "65ae4c081c0736fbf1828ccf") {
    return next(new ErrorHandler("This location can't be deleted", 400));
  }
  let location = await locationModel.findById(id);

  if (!location)
    return next(new ErrorHandler("Location not found", 404));

  const query = {
    $or: [{ source: id }, { dest: id }]
  };
  const isAnyTrip = await tripModel.findOne(query);
  const isAnySubTrip = await subTripModel.findOne(query);
  if (isAnyTrip || isAnySubTrip) {
    return next(new ErrorHandler("This location can't be deleted due to some trip's location.", 400));
  }

  await location.deleteOne();

  res.status(200).json({
    message: "Location Deleted successfully.",
  });
});
