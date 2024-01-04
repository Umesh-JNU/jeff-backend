const express = require("express");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const { createMill, getAllMill, getMill, updateMill, deleteMill } = require("./mill.controller");

router.get("/", auth, getAllMill);

module.exports = { millRoute: router, createMill, getAllMill, getMill, updateMill, deleteMill };
