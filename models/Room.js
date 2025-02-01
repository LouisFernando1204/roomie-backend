const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
    tokenId: { type: Number, required: true },
    accommodationId: { type: mongoose.Schema.Types.ObjectId, ref: "Accommodation", required: true },
    roomType: { type: String, required: true },
    roomDescription: { type: String, required: true },
    facilities: { type: [String], required: true },
    price: { type: Number, required: true },
    bedSize: { type: String, required: true },
    maxOccupancy: { type: Number, required: true, min: 1 },
    isBooked: { type: Boolean, default: false },
    imageUrls: {
        type: [String],
        required: true,
        validate: {
            validator: function (value) {
                return value.length >= 1 && value.length <= 3;
            },
            message: "Max images uploaded is 3"
        }
    }
}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);