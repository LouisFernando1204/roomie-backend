const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        required: true,
        unique: true
    },
    tokenName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    tokenURI: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Token", TokenSchema);