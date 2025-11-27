const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  getAllCategories,
  createBrand,
  getAllBrands,
} = require('../controllers/productController');
const { validateProduct } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getAllCategories);
router.get('/brands', getAllBrands);
router.get('/:id', getProduct);

// Protected routes (Admin only)
router.use(protect, restrictTo('admin'));

router.post('/', upload.array('images', 5), validateProduct, createProduct);
router.patch('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/categories', createCategory);
router.post('/brands', createBrand);

module.exports = router;