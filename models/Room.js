const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    tokenId: { type: String, required: true },
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    roomType: { type: String, required: true },
    facilities: { type: [String], required: true },
    price: { type: Number, required: true },
    bedSize: { type: String, required: true },
    maxOccupancy: { type: Number, required: true, min: 1 },
    roomNumber: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    imageUrls: { type: [String], required: true },
});

module.exports = mongoose.model("Room", RoomSchema);