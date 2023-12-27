const adminRoute = require("./admin");
const { userRoute } = require("./user");
const { enquiryRoute } = require("./enquiry");
const { truckRoute } = require("./trucks");
const { tripRoute } = require("./trips");
const locationRoute = require("./location");

module.exports = { adminRoute, userRoute, enquiryRoute, truckRoute, tripRoute, locationRoute }