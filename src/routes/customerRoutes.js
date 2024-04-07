
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/user.controller');


router.post('/register-user', customerController.registerUser);
router.get('/users-list', customerController.getAllCustomers);

module.exports = router;
