const mongoose = require("mongoose");

const AccommodationCaseSchema = new mongoose.Schema({
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    accommodationArgument: { type: String, required: true },
    accommodationEvidence: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("AccommodationCase", AccommodationCaseSchema);