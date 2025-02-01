const mongoose = require("mongoose");

const UserCaseSchema = new mongoose.Schema({
    userAccount: { type: String, required: true },
    userArgument: { type: String, required: true },
    userEvidence: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("UserCase", UserCaseSchema);