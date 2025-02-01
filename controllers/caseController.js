const Case = require('../models/Case');
const UserCase = require('../models/UserCase');
const AccommodationCase = require('../models/AccommodationCase');
const asyncHandler = require('express-async-handler');

// @desc Get all cases
// @route GET /cases
// @access Public
const getAllCases = asyncHandler(async (req, res) => {
    const cases = await Case.find()
        .populate("userCaseId")
        .populate("accommodationCaseId")
        .lean();

    if (!cases.length) {
        return res.status(400).json({ message: 'No cases found' });
    }

    res.status(200).json(cases);
});

// @desc Get case by ID
// @route GET /cases/:id
// @access Public
const getCaseById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: 'Case ID required' });

    const caseData = await Case.findById(id)
        .populate("userCaseId")
        .populate("accommodationCaseId")
        .lean();

    if (!caseData) {
        return res.status(404).json({ message: 'Case not found' });
    }

    res.status(200).json(caseData);
});

// @desc Get case by bookingId
// @route GET /cases/booking/:bookingId
// @access Public
const getCaseByBookingId = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    if (!bookingId) {
        return res.status(400).json({ message: 'Booking ID required' });
    }

    const caseData = await Case.findOne({ bookingId })
        .populate("userCaseId")
        .populate("accommodationCaseId")
        .lean();

    if (!caseData) {
        return res.status(404).json({ message: 'Case not found' });
    }

    res.status(200).json(caseData);
});

// @desc Create new UserCase and link to Case
// @route POST /user-cases
// @access Public
const createUserCase = asyncHandler(async (req, res) => {
    const { userAccount, userArgument, userEvidence, bookingId, caseName } = req.body;

    if (!userAccount || !userArgument || !userEvidence || !bookingId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const userCase = await UserCase.create({ userAccount, userArgument, userEvidence });

    if (!userCase) {
        return res.status(400).json({ message: 'Error while creating UserCase' });
    }

    let caseData = await Case.findOne({ bookingId });

    if (!caseData) {
        caseData = await Case.create({
            bookingId,
            userCaseId: [userCase._id],
            accommodationCaseId: [],
            name: caseName
        });
    } else {
        caseData.userCaseId.push(userCase._id);
        await caseData.save();
    }

    res.status(201).json({ message: 'UserCase created and linked to Case', userCase, caseData });
});

// @desc Create new AccommodationCase and link to Case
// @route POST /accommodation-cases
// @access Public
const createAccommodationCase = asyncHandler(async (req, res) => {
    const { accommodationId, accommodationArgument, accommodationEvidence, bookingId, caseName } = req.body;

    if (!accommodationId || !accommodationArgument || !accommodationEvidence || !bookingId) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const accommodationCase = await AccommodationCase.create({ accommodationId, accommodationArgument, accommodationEvidence });

    if (!accommodationCase) {
        return res.status(400).json({ message: 'Error while creating AccommodationCase' });
    }

    let caseData = await Case.findOne({ bookingId });

    if (!caseData) {
        caseData = await Case.create({
            bookingId,
            userCaseId: [],
            accommodationCaseId: [accommodationCase._id],
            name: caseName
        });
    } else {
        caseData.accommodationCaseId.push(accommodationCase._id);
        await caseData.save();
    }

    res.status(201).json({ message: 'AccommodationCase created and linked to Case', accommodationCase, caseData });
});

module.exports = {
    getAllCases,
    getCaseById,
    getCaseByBookingId,
    createUserCase,
    createAccommodationCase
};