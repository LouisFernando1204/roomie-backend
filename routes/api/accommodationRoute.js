const express = require('express');
const router = express.Router();
const accommodationController = require('../../controllers/accommodationController');

router.route('/')
    .get(accommodationController.getAllAccommodations)
    .post(accommodationController.createAccommodation)
    .put(accommodationController.updateAccommodation)
    .delete(accommodationController.deleteAccommodation)

router.route('/:id')
    .get(accommodationController.getAccommodationById)

module.exports = router;