const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    tokenId: { type: String, required: true },
    userAccount: { type: String, required: true },
    checkIn: { type: Number, required: true },
    checkOut: { type: Number, required: true },
    durationInDays: { type: Number, required: true },
    bookingTimestamp: { type: Number, default: () => Math.floor(Date.now() / 1000) }
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);