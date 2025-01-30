const mongoose = require("mongoose");

const AccommodationSchema = new mongoose.Schema({
  accommodationId: { type: String, required: true, unique: true },
  accommodationType: { type: String, required: true },
  address: { type: String, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  imageUrls: { type: [String], required: true },
});

module.exports = mongoose.model("Accommodation", AccommodationSchema);