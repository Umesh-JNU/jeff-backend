const ErrorHandler = require("../../utils/errorHandler");
const catchAsyncError = require("../../utils/catchAsyncError");
const APIFeatures = require("../../utils/apiFeatures");
const contentModel = require("./content.model");

// Create a new document
exports.createContent = catchAsyncError(async (req, res, next) => {
  console.log("createContent", req.body);

  let content = await contentModel.find();
  if (content && content.length === 0) {
    content = await contentModel.create(req.body);
  } else {
    content = await contentModel.findByIdAndUpdate(content[0]._id, req.body, {
      new: true,
      runValidators: true,
      validateBeforeSave: true
    });
  }

  res.status(201).json({ content });
});

exports.getContent = catchAsyncError(async (req, res, next) => {
  console.log("getContent");
  const content = (await contentModel.find())[0];
  res.status(200).json({ content });
});

// Update content
exports.updateContent = catchAsyncError(async (req, res, next) => {
  console.log("updateContent", req.body, req.query);
  let content = (await contentModel.find())[0];
  if (!content) {
    return next(new ErrorHandler("Content Not Found", 404));
  }

  const { TYPE } = req.query;
  content[TYPE] = req.body[TYPE];
  await content.save();

  res.status(200).json({ success: true });
});

// -------------------- For DRIVER -------------------
exports.getTC = catchAsyncError(async (req, res, next) => {
  const content = (await contentModel.find())[0];
  if (!content) {
    return next(new ErrorHandler("Terms & Conditions not found.", 404));
  }

  res.status(200).send(content.tc);
});

exports.getPP = catchAsyncError(async (req, res, next) => {
  const content = (await contentModel.find())[0];
  if (!content) {
    return next(new ErrorHandler("Privacy Policy not found.", 404));
  }

  res.status(200).send(content.pp);
});



