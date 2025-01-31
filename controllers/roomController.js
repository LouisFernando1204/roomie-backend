const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');

// @desc Get all rooms
// @route GET /rooms
// @access Public
const getAllRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find().lean();

    if (!rooms.length) {
        return res.status(400).json({ message: 'No rooms found' });
    }

    res.status(200).json(rooms);
});

// @desc Get room by ID
// @route GET /rooms/:id
// @access Public
const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: 'Room ID required' });

    const room = await Room.findById(id).lean();
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    res.status(200).json(room);
});

// @desc Create new room
// @route POST /rooms
// @access Public
const createRoom = asyncHandler(async (req, res) => {
    const { tokenId, accommodationId, roomType, facilities, price, bedSize, maxOccupancy, roomNumber, imageUrls } = req.body;

    if (!tokenId || !accommodationId || !roomType || !facilities || !price || !bedSize || !maxOccupancy || !roomNumber || !imageUrls) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const room = await Room.create({ tokenId, accommodationId, roomType, facilities, price, bedSize, maxOccupancy, roomNumber, imageUrls });
    if (room) {
        res.status(201).json({ message: 'New room created', room });
    } else {
        return res.status(400).json({ message: 'Error while creating room' });
    }
});

// @desc Update room
// @route PUT /rooms
// @access Public
const updateRoom = asyncHandler(async (req, res) => {
    const { id, roomType, facilities, price, bedSize, maxOccupancy, roomNumber, isBooked, imageUrls } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Room ID required' });
    }

    const room = await Room.findById(id).exec();
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    room.roomType = roomType || room.roomType;
    room.facilities = facilities || room.facilities;
    room.price = price || room.price;
    room.bedSize = bedSize || room.bedSize;
    room.maxOccupancy = maxOccupancy || room.maxOccupancy;
    room.roomNumber = roomNumber || room.roomNumber;
    room.isBooked = isBooked !== undefined ? isBooked : room.isBooked;
    room.imageUrls = imageUrls || room.imageUrls;

    const updatedRoom = await room.save();
    if (updatedRoom) {
        res.status(200).json({ message: 'Room updated', updatedRoom });
    } else {
        return res.status(400).json({ message: 'Error while updating room' });
    }
});

// @desc Delete room
// @route DELETE /rooms
// @access Public
const deleteRoom = asyncHandler(async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Room ID required' });
    }

    const room = await Room.findById(id).exec();
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }

    const deletedRoom = await room.deleteOne();
    if (deletedRoom) {
        res.status(200).json({ message: `Room '${room.roomType}' deleted` });
    } else {
        return res.status(400).json({ message: 'Error while deleting room' });
    }
});

module.exports = {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
};