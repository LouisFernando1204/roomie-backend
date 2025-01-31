const Booking = require('../models/Booking');
const asyncHandler = require('express-async-handler');

// @desc Get all bookings
// @route GET /bookings
// @access Public
const getAllBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find().lean();

    if (!bookings.length) {
        return res.status(400).json({ message: 'No bookings found' });
    }

    res.status(200).json(bookings);
});

// @desc Get booking by ID
// @route GET /bookings/:id
// @access Public
const getBookingById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: 'Booking ID required' });

    const booking = await Booking.findById(id).lean();
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json(booking);
});

// @desc Create new booking
// @route POST /bookings
// @access Public
const createBooking = asyncHandler(async (req, res) => {
    const { accommodationId, roomId, tokenId, userAccount, checkIn, checkOut, durationInDays } = req.body;

    if (!accommodationId || !roomId || !tokenId || !userAccount || !checkIn || !checkOut || !durationInDays) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const booking = await Booking.create({ accommodationId, roomId, tokenId, userAccount, checkIn, checkOut, durationInDays });
    if (booking) {
        res.status(201).json({ message: 'New booking created', booking });
    } else {
        return res.status(400).json({ message: 'Error while creating booking' });
    }
});

module.exports = {
    getAllBookings,
    getBookingById,
    createBooking
};