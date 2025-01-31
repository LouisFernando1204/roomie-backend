const mongoose = require("mongoose");

const AccommodationSchema = new mongoose.Schema({
  accommodationHost: { type: String, required: true },
  accommodationName: { type: String, required: true },
  accommodationType: { type: String, required: true },
  address: { type: String, required: true },
  logoImageUrl: { type: String, required: true },
  coverImageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Accommodation", AccommodationSchema);