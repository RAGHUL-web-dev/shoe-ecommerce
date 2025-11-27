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

// SIMPLE SOLUTION - String brands only
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
    minRating,
    featured
  } = req.query;

  console.log('Brand filter:', brand);

  // Build query step by step
  const queryConditions = [{ isActive: true }];

  // Brand filtering - simple string matching
  if (brand && brand !== 'undefined') {
    const brandNames = brand.split(',');
    const brandConditions = brandNames.map(brandName => ({
      brand: { $regex: brandName, $options: 'i' }
    }));
    
    queryConditions.push({ $or: brandConditions });
    console.log('Brand filter conditions:', brandConditions);
  }

  // Other filters
  if (category) {
    queryConditions.push({ category });
  }

  if (minPrice || maxPrice) {
    const priceCondition = {};
    if (minPrice) priceCondition.$gte = Number(minPrice);
    if (maxPrice) priceCondition.$lte = Number(maxPrice);
    queryConditions.push({ basePrice: priceCondition });
  }

  if (minRating) {
    queryConditions.push({ 'rating.average': { $gte: Number(minRating) } });
  }

  if (search) {
    queryConditions.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    });
  }

  if (featured) {
    queryConditions.push({ isFeatured: featured === 'true' });
  }

  // Combine all conditions
  const finalQuery = queryConditions.length > 1 
    ? { $and: queryConditions } 
    : queryConditions[0];

  console.log('Final query:', JSON.stringify(finalQuery, null, 2));

  // Execute query
  const products = await Product.find(finalQuery)
    .populate('category', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(finalQuery);

  // Process products to ensure brand is properly formatted
  const processedProducts = products.map(product => {
    const productData = product.toObject();
    
    // Ensure brand is always an object with name property
    if (typeof productData.brand === 'string') {
      productData.brand = { name: productData.brand };
    }
    
    return productData;
  });

  console.log(`Found ${processedProducts.length} products`);

  res.status(200).json({
    status: 'success',
    results: processedProducts.length,
    data: {
      products: processedProducts,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// Fix the getProduct function to handle string brands
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name description');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Convert product to plain object
  const productData = product.toObject();

  // Handle brand - if it's a string, create brand object; if ObjectId, populate it
  if (typeof productData.brand === 'string') {
    // Brand is stored as string (your current situation)
    productData.brand = { name: productData.brand };
  } else if (productData.brand && typeof productData.brand === 'object') {
    // Brand is ObjectId but not populated, try to populate it
    try {
      const brandDoc = await Brand.findById(productData.brand);
      productData.brand = brandDoc ? { name: brandDoc.name } : { name: 'Unknown Brand' };
    } catch (error) {
      // If population fails, set to unknown
      productData.brand = { name: 'Unknown Brand' };
    }
  } else {
    // Fallback
    productData.brand = { name: 'Unknown Brand' };
  }

  res.status(200).json({
    status: 'success',
    data: {
      product: productData
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

