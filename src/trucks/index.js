const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createTruck, getAllTruck, getTruck, updateTruck, deleteTruck } = require("./truck.controller");

router.get("/", auth, getAllTruck);

module.exports = { truckRoute: router, createTruck, getAllTruck, getTruck, updateTruck, deleteTruck };
