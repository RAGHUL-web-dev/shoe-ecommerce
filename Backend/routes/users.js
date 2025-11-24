const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses
} = require('../controllers/userController');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.patch('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

module.exports = router;