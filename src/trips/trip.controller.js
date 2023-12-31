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

// Get Current Trip or Trip by _id of Driver
exports.getDriverTrip = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const { id } = req.params;

  let query = { driver: userId };
  if (id) {
    query = { ...query, _id: id }
  } else {
    query = { ...query, status: "on-going" }
  }

  const trip = await tripModel.findOne(query).populate([
    { path: "source", select: "name lat long" },
    { path: "dest", select: "name lat long" },
    { path: "truck", select: "truck_id plate_no name" }
  ]);
  if (!trip) {
    return next(new ErrorHandler("No On-going trip", 400));
  }

  const subTrip = await subTripModel.findOne({ trip: trip._id }).populate([
    { path: "source", select: "name lat long" },
    { path: "dest", select: "name lat long" },
  ]);

  res.status(200).json({ trip, subTrip, end_time: trip.end_time });
});

const lookUp = (key) => ([
  {
    $lookup: {
      foreignField: "_id",
      localField: key,
      from: "locations",
      as: key
    }
  },
  { $unwind: `$${key}` }
]);

// Trip History
exports.getTripHistory = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const aggregateQry = [
    {
      $match: { driver: new mongoose.Types.ObjectId(userId) }
    },
    ...lookUp("source"),
    {
      $lookup: {
        foreignField: "trip",
        localField: "_id",
        from: "subtrips",
        as: "sub_trip"
      }
    },
    { $unwind: "$sub_trip" },
    ...lookUp("sub_trip.dest")
  ];

  const trips = await tripModel.aggregate(aggregateQry);

  res.status(200).json({ trips });
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

  let subTrip = await subTripModel.findOne({ trip: id });
  if (subTrip) {
    return next(new ErrorHandler("Trip is already started.", 400));
  }
  subTrip = await subTripModel.create({ ...req.body, trip: id });

  res.status(201).json({ subTrip });
});

exports.updateSubTrip = catchAsyncError(async (req, res, next) => {
  const { id, subId } = req.params;

  let updatedData = {};
  switch (req.query.UPDATE_TRIP) {
    case "ARRIVAL_TIME":
      updatedData.arrival_time = Date.now();
      break;

    case "UNLOAD_TIME_START":
      updatedData.unload_time_start = Date.now();
      break;

    case "UNLOAD_TIME_END":
      updatedData.unload_time_end = Date.now();
      break;

    default:
      // case "END_MILAGE":
      updatedData.gross_wt = req.body.gross_wt;
      updatedData.tare_wt = req.body.tare_wt;
      updatedData.net_wt = req.body.net_wt;
      break;

    // default:
    // Object.entries(req.body).forEach(([k, v]) => {
    //   if (["arrival_time", "load_time_end", "load_time_start", "end_milage"].includes(k)) {
    //     updatedData[k] = v;
    //   }
    // });
    // break;
  }

  const trip = await tripModel.findById(id);
  const subTrip = await subTripModel.findOneAndUpdate({ _id: subId, trip: id }, updatedData, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });
  if (!trip || !subTrip) {
    return next(new ErrorHandler("Trip not found.", 404));
  }

  res.status(200).json({ subTrip });
});

// --------------------------------- ADMIN ----------------------------------------
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
      updatedData.end_time = Date.now();
      updatedData.status = 'completed';
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
  const trip = await tripModel.findOneAndUpdate({ _id: id, status: 'on-going' }, updatedData, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });
  if (!trip) {
    return next(new ErrorHandler("Trip not found.", 404));
  }

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

