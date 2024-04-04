const ErrorHandler = require("../../utils/errorHandler")
const catchAsyncError = require("../../utils/catchAsyncError")
const apiFeatures = require("../../utils/apiFeatures");
const notificationModel = require("./notification.model");

exports.getAllNotification = catchAsyncError(async (req, res, next) => {
  const userId = req.userId;

  const notifications = await notificationModel.find({ driver: userId }).sort("createdAt");

  const unread = await notificationModel.count({ driver: userId, seen: false });
  res.status(200).json({ notifications, unread });
})

exports.getNotification = catchAsyncError(async (req, res, next) => {
  console.log("get notification", req.params);
  const { id } = req.params;
  const notification = await notificationModel.findOne({ _id: id, driver: req.userId });

  if (!notification) return next(new ErrorHandler("Notification not found", 404));

  res.status(200).json({ notification });
})

exports.updateNotification = catchAsyncError(async (req, res, next) => {
  console.log("update notification", req.body);
  const { id } = req.params;
  const userId = req.userId;

  const notification = await notificationModel.findOne({ _id: id, driver: userId });

  if (!notification) return next(new ErrorHandler("Notification not found", 404));

  notification.seen = true;
  await notification.save();

  res.status(200).json({ message: "Notification updated successfully." });
})

exports.marKAllRead = catchAsyncError(async (req, res, next) => {
  console.log("marKAllRead");
  const userId = req.userId;

  await notificationModel.updateMany({ driver: userId }, { seen: true });

  res.status(200).json({ success: true, message: "All notification marked as read" });
})

exports.deleteNotification = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const isDeleted = await notificationModel.destroy({ where: { id } });
  if (isDeleted === 0) return next(new ErrorHandler("Notification not found.", 404));

  res.status(200).json({ message: "Notification Deleted Successfully.", isDeleted });
})