const express = require('express');
const router = express.Router();
const caseController = require('../../controllers/caseController');

router.route('/')
    .get(caseController.getAllCases)
    .delete(caseController.deleteCase)

router.route('/:id')
    .get(caseController.getCaseById)

router.route('/booking/:bookingId')
    .get(caseController.getCaseByBookingId)

router.route('/user-cases')
    .post(caseController.createUserCase)

router.route('/accommodation-cases')
    .post(caseController.createAccommodationCase)

module.exports = router;