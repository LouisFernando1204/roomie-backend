const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    accountAddress: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userAccount: { type: String, required: true },
    tokenId: { type: String, required: true },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    durationInDays: { type: Number, required: true },
    bookingTimestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Booking", BookingSchema);