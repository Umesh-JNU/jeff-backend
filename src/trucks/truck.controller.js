const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const truckModel = require("./truck.model");
const { isValidObjectId, default: mongoose } = require("mongoose");
const { v4: uuid } = require("uuid");

// Create a new document
exports.createTruck = catchAsyncError(async (req, res, next) => {
  console.log("createTruck", req.body);

  const truck_id = `#${uuid().slice(0, 6)}`;
  console.log({ truck_id })
  const truck = await truckModel.create({ ...req.body, truck_id });
  res.status(201).json({ truck });
});

// Get a single document by ID
exports.getTruck = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid Truck ID", 400));
  }

  const truck = await truckModel.findById(id);
  if (!truck) {
    return next(new ErrorHandler("Truck not found.", 404));
  }

  res.status(200).json({ truck });
});

// Get all documents
exports.getAllTruck = catchAsyncError(async (req, res, next) => {
  console.log("getAllTruck", req.query);
  const qry = {};
  if (!req.user) {
    qry.is_avail = true;
  }

  const apiFeature = new APIFeatures(
    truckModel.find(qry).sort({ createdAt: -1 }),
    req.query
  ).search("truck_id");

  let trucks = await apiFeature.query;
  console.log("Trucks", trucks);
  let truckCount = trucks.length;
  if (req.query.resultPerPage && req.query.currentPage) {
    apiFeature.pagination();

    console.log("truckCount", truckCount);
    trucks = await apiFeature.query.clone();
  }
  console.log("trucks", trucks);
  res.status(200).json({ trucks, truckCount });
});

// Update truck
exports.updateTruck = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const truck = await truckModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    validateBeforeSave: true
  });

  res.status(200).json({ truck });
});

// Delete a document by ID
exports.deleteTruck = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let truck = await truckModel.findById(id);

  if (!truck)
    return next(new ErrorHandler("Truck not found", 404));

  await truck.deleteOne();

  res.status(200).json({
    message: "Truck Deleted successfully.",
  });
});   
