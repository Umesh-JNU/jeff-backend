const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const { tripModel, subTripModel } = require("./trip.model");
const { isValidObjectId, default: mongoose } = require("mongoose");
const { v4: uuid } = require("uuid");
const truckModel = require("../trucks/truck.model");
const { s3UploadMulti } = require("../../utils/s3");

// Create a new document
exports.createTrip = catchAsyncError(async (req, res, next) => {
  console.log("createTrip", req.body);
  const userId = req.userId;
  const { truck } = req.body;
  if (!truck) {
    return next(new ErrorHandler("Please select a truck", 400));
  }

  const isAvailTruck = await truckModel.findOne({ _id: truck, is_avail: true });
  if (!isAvailTruck) {
    return next(new ErrorHandler("The truck is already in use.", 400));
  }

  let trip = await tripModel.findOne({ driver: userId, status: 'on-going' });
  if (trip) {
    return next(new ErrorHandler("Your current trip is not completed. Can't start another one.", 400));
  }

  trip = await tripModel.create({ ...req.body, driver: userId });
  if (trip) {
    isAvailTruck.is_avail = false;
    await isAvailTruck.save();
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
  const trip = await tripModel.findOne({ driver: userId, status: "on-going" }).populate([
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
      { path: "driver", select: "firstname lastname mobile_no" },
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
  let updatedData = {};
  switch (req.query.UPDATE_TRIP) {
    case "ARRIVAL_TIME":
      updatedData.arrival_time = Date.now();
      break;

    case "LOAD_TIME_START":
      updatedData.load_time_start = Date.now();
      break;

    case "LOAD_TIME_END":
      updatedData.load_time_end = Date.now();
      break;

    default:
      // case "END_MILAGE":
      updatedData.end_milage = req.body.end_milage;
      break;

    // default:
    // Object.entries(req.body).forEach(([k, v]) => {
    //   if (["arrival_time", "load_time_end", "load_time_start", "end_milage"].includes(k)) {
    //     updatedData[k] = v;
    //   }
    // });
    // break;
  }

  console.log(updatedData, Object.entries(req.body));
  const trip = await tripModel.findByIdAndUpdate(id, updatedData, {
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

// -------------------------- SECOND TRIP -----------------------
exports.createSubTrip = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let trip = await tripModel.findById(id);

  if (!trip)
    return next(new ErrorHandler("Trip not found", 404));

  const files = req.files;
  if (files) {
    const results = await s3UploadMulti(files, 'jeff');
    let location = results.map((result) => result.Location);
    req.body.docs = location;
  }

  const subTrip = await subTripModel.create({ ...req.body, trip: id });

  res.status(201).json({ subTrip });
});