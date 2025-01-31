const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    userAccount: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model("Rating", RatingSchema);