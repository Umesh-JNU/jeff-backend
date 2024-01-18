const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createLocation, getAllLocation, getLocation, updateLocation, deleteLocation } = require("./location.controller");

router.post("/", auth, createLocation);
router.get("/", auth, getAllLocation);
router.get("/:id", auth, getLocation);

module.exports = { locationRoute: router, updateLocation, deleteLocation };

