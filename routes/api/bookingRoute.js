const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/bookingController');

router.route('/')
    .get(bookingController.getAllBookings)
    .post(bookingController.createBooking)
    .delete(bookingController.deleteBooking)

router.route('/:id')
    .get(bookingController.getBookingById)

module.exports = router;