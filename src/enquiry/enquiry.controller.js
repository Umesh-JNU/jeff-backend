const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const enquiryModel = require("./enquiry.model");
const { s3Uploadv2 } = require("../../utils/s3");


// Create a new document
exports.createEnquiry = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;
  const file = req.file;
  if (file) {
    const results = await s3Uploadv2(file, 'jeff/enquiry');
    const location = results.Location && results.Location;
    req.body.image = location;
  }

  const enquiry = await enquiryModel.create({ ...req.body, user: userId });
  res.status(201).json({ enquiry });
});

// Get all documents
exports.getAllEnquiry = catchAsyncError(async (req, res, next) => {
  console.log("all enquiry", req.query);

  console.log("getAllTrip", req.query);

  const { keyword, currentPage, resultPerPage } = req.query;
  let match = [];
  if (keyword) {
    const regexQry = {
      $regex: keyword,
      $options: "i",
    };

    match = [{
      $match: {
        $or: [
          { message: regexQry },
          { ["user.firstname"]: regexQry },
          { ["user.lastname"]: regexQry },
        ]
      }
    }];
  }

  const limit = parseInt(resultPerPage);
  const c = parseInt(currentPage);
  const skip = limit * (c - 1);

  let [{ results, count: [count] }] = await enquiryModel.aggregate([
    {
      $lookup: {
        foreignField: "_id",
        localField: "user",
        from: "users",
        as: "user"
      }
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ...match,
    { $sort: { "createdAt": -1 } },
    {
      $facet: {
        results: [{ $skip: skip }, { $limit: limit }],
        count: [{ $count: "messageCount" }]
      }
    }
  ]);

  if (!count) count = { messageCount: 0 };
  res.status(200).json({ messages: results, ...count });
});

// Get a single document by ID
exports.getEnquiry = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const message = await enquiryModel.findById(id).populate("user", ["firstname", "lastname", "mobile_no"]);
  if (!message) {
    return next(new ErrorHandler("Message not found.", 404));
  }

  res.status(200).json({ message });
});

// Update a document by ID
exports.updateEnquiry = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const message = await enquiryModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  if (!message) return next(new ErrorHandler('Message not found', 404));

  res.status(200).json({ message });
});

// Delete a document by ID
exports.deleteEnquiry = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  let enquiry = await enquiryModel.findById(id);

  if (!enquiry)
    return next(new ErrorHandler("Message not found", 404));

  await enquiry.deleteOne();

  res.status(200).json({
    message: "Message Deleted successfully.",
  });
});
