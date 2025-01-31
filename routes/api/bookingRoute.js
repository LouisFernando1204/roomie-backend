const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');

router.route('/')
    .get(bookingController.getAllBookings)
    .post(bookingController.createBooking)

router.route('/:id')
    .get(bookingController.getBookingById)

module.exports = router;