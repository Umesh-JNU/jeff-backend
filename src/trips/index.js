const { createTrip, getAllTrip, getTrip, updateTrip, deleteTrip } = require("./trip.controller");
const tripRoute = require("./trip.route");

module.exports = { tripRoute, createTrip, getAllTrip, getTrip, updateTrip, deleteTrip };
