const express = require('express');
const router = express.Router();
const roomController = require('../../controllers/roomController');

router.route('/')
    .get(roomController.getAllRooms)
    .post(roomController.createRoom)
    .delete(roomController.deleteRoom)

router.route('/:id')
    .get(roomController.getRoomById)

module.exports = router;