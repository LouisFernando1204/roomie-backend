const Rating = require('../models/Rating');
const asyncHandler = require('express-async-handler');

// @desc Get all ratings
// @route GET /ratings
// @access Public
const getAllRatings = asyncHandler(async (req, res) => {
    const ratings = await Rating.find().lean();

    if (!ratings.length) {
        return res.status(400).json({ message: 'No ratings found' });
    }

    res.status(200).json(ratings);
});

// @desc Get rating by ID
// @route GET /ratings/:id
// @access Public
const getRatingById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: 'Rating ID required' });

    const rating = await Rating.findById(id).lean();
    if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
    }

    res.status(200).json(rating);
});

// @desc Get average rating by accommodation ID
// @route GET /ratings/accommodation/:accommodationId
// @access Public
const getAverageRatingByAccommodationId = asyncHandler(async (req, res) => {
    const { accommodationId } = req.params;

    if (!accommodationId) {
        return res.status(400).json({ message: 'Accommodation ID required' });
    }

    const ratings = await Rating.find({ accommodationId }).lean();

    if (!ratings.length) {
        return res.status(400).json({ message: 'No ratings found for this accommodation' });
    }

    const totalRating = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = totalRating / ratings.length;

    const roundedAverageRating = Math.min(Math.max(Math.round(averageRating), 1), 5);

    res.status(200).json({ averageRating: roundedAverageRating });
});

// @desc Create new rating
// @route POST /ratings
// @access Public
const createRating = asyncHandler(async (req, res) => {
    const { accommodationId, userAccount, rating } = req.body;

    if (!accommodationId || !userAccount || rating === undefined) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (rating < 0 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 0 and 5' });
    }

    const newRating = await Rating.create({ accommodationId, userAccount, rating });
    if (newRating) {
        res.status(201).json({ message: 'New rating created', rating: newRating });
    } else {
        return res.status(400).json({ message: 'Error while creating rating' });
    }
});

// @desc Delete rating
// @route DELETE /ratings
// @access Public
const deleteRating = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Rating ID required' });
    }

    const rating = await Rating.findById(id).exec();
    if (!rating) {
        return res.status(404).json({ message: 'Rating not found' });
    }

    const deletedRating = await rating.deleteOne();
    if (deletedRating) {
        res.status(200).json({ message: `Rating deleted` });
    } else {
        return res.status(400).json({ message: 'Error while deleting rating' })
    }
});

module.exports = {
    getAllRatings,
    getRatingById,
    getAverageRatingByAccommodationId,
    createRating,
    deleteRating
};