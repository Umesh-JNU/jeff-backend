const express = require("express");
const router = express.Router();
const { getTC, getPP, createContent, getContent, updateContent } = require("./content.controller");

router.get("/terms_and_conditions", getTC);
router.get("/privacy_policy", getPP);

module.exports = { contentRoute: router, getTC, getPP, createContent, getContent, updateContent };