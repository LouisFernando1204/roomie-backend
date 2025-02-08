const express = require('express');
const router = express.Router();
const AIController = require('../../controllers/AIController');

router.route('/')
    .post(AIController.askToGPT)

module.exports = router;