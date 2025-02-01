const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    userCaseId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserCase", required: false }],
    accommodationCaseId: [{ type: mongoose.Schema.Types.ObjectId, ref: "AccommodationCase", required: false }],
    name: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Case", CaseSchema);