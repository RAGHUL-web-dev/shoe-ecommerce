const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Inventory = require('../models/Inventory');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createProduct = catchAsync(async (req, res, next) => {
  const productData = req.body;
  
  if (req.files && req.files.length > 0) {
    productData.images = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      altText: productData.name,
      isPrimary: index === 0
    }));
  }

  const product = await Product.create(productData);

  // Create inventory entries for variants
  if (product.variants && product.variants.length > 0) {
    const inventoryPromises = product.variants.map(variant => 
      Inventory.create({
        product: product._id,
        variant: {
          size: variant.size,
          color: variant.color,
          sku: variant.sku
        },
        quantity: variant.stock || 0
      })
    );
    await Promise.all(inventoryPromises);
  }

  res.status(201).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    featured
  } = req.query;

  const query = { isActive: true };

  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (featured) query.isFeatured = true;
  if (minPrice || maxPrice) {
    query.basePrice = {};
    if (minPrice) query.basePrice.$gte = Number(minPrice);
    if (maxPrice) query.basePrice.$lte = Number(maxPrice);
  }
  if (search) {
    query.$text = { $search: search };
  }

  const products = await Product.find(query)
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name description')
    .populate('brand', 'name description');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await Category.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ isActive: true });
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

exports.createBrand = catchAsync(async (req, res, next) => {
  const brand = await Brand.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      brand
    }
  });
});

exports.getAllBrands = catchAsync(async (req, res, next) => {
  const brands = await Brand.find({ isActive: true });
  res.status(200).json({
    status: 'success',
    results: brands.length,
    data: {
      brands
    }
  });
});