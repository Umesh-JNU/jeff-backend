const adminRoute = require("./admin");
const { userRoute } = require("./user");
const { enquiryRoute } = require("./enquiry");
const { truckRoute } = require("./trucks");
const locationRoute = require("./location");

module.exports = { adminRoute, userRoute, enquiryRoute, truckRoute, locationRoute }