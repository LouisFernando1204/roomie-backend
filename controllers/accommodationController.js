const Accommodation = require('../models/Accommodation');
const asyncHandler = require('express-async-handler');

// @desc Get all accommodations
// @route GET /accommodations
// @access Public
const getAllAccommodations = asyncHandler(async (req, res) => {
    const accommodations = await Accommodation.find().lean();

    if (!accommodations.length) {
        return res.status(400).json({ message: 'No accommodations found' });
    }

    res.status(200).json(accommodations);
});

// @desc Get accommodation by ID
// @route GET /accommodations/:id
// @access Public
const getAccommodationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ 'message': 'Accommodation ID required' });

    const accommodation = await Accommodation.findById(id).lean();
    if (!accommodation) {
        return res.status(404).json({ message: 'Accommodation not found' });
    }

    res.status(200).json(accommodation);
});

// @desc Create new accommodation
// @route POST /accommodations
// @access Public
const createAccommodation = asyncHandler(async (req, res) => {
    const { accommodationHost, accommodationName, accommodationType, address, logoImageUrl, coverImageUrl } = req.body;

    if (!accommodationHost || !accommodationName || !accommodationType || !address || !logoImageUrl || !coverImageUrl) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const accommodation = await Accommodation.create({ accommodationHost, accommodationName, accommodationType, address, logoImageUrl, coverImageUrl });
    if (accommodation) {
        res.status(201).json({ message: 'New accommodation created', accommodation });
    } else {
        return res.status(400).json({ message: 'Error while creating accomodation' })
    }
});

// @desc Update accommodation
// @route PUT /accommodations
// @access Public
const updateAccommodation = asyncHandler(async (req, res) => {
    const { id, accommodationName, accommodationType, address, logoImageUrl, coverImageUrl } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Accommodation ID required' });
    }

    const accommodation = await Accommodation.findById(id).exec();
    if (!accommodation) {
        return res.status(404).json({ message: 'Accommodation not found' });
    }

    accommodation.accommodationName = accommodationName || accommodation.accommodationName;
    accommodation.accommodationType = accommodationType || accommodation.accommodationType;
    accommodation.address = address || accommodation.address;
    accommodation.logoImageUrl = logoImageUrl || accommodation.logoImageUrl;
    accommodation.coverImageUrl = coverImageUrl || accommodation.coverImageUrl;

    const updatedAccommodation = await accommodation.save();
    if (updatedAccommodation) {
        res.status(200).json({ message: 'Accommodation updated', updatedAccommodation });
    } else {
        return res.status(400).json({ message: 'Error while updating accomodation' })
    }
});

// @desc Delete accommodation
// @route DELETE /accommodations
// @access Public
const deleteAccommodation = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Accommodation ID required' });
    }

    const accommodation = await Accommodation.findById(id).exec();
    if (!accommodation) {
        return res.status(404).json({ message: 'Accommodation not found' });
    }

    const deletedAccomodation = await accommodation.deleteOne();
    if (deletedAccomodation) {
        res.status(200).json({ message: `Accommodation '${accommodation.accommodationName}' deleted` });
    } else {
        return res.status(400).json({ message: 'Error while deleting accomodation' })
    }
});

module.exports = {
    getAllAccommodations,
    getAccommodationById,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation
};