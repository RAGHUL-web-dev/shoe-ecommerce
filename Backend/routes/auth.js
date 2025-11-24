const express = require('express');
const { signup, login, logout } = require('../controllers/authController');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

router.post('/signup', validateUserRegistration, signup);
router.post('/login', validateUserLogin, login);
router.post('/logout', logout);

module.exports = router;