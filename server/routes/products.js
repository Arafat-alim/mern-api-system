import express from 'express';
import Product from '../models/Product.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validateCreateProduct, validateUpdateProduct, validatePagination } from '../middleware/validation.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price, -price, rating, -rating, createdAt, -createdAt]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get('/', optionalAuth, validatePagination, catchAsync(async (req, res) => {
  const { page, limit, search, category, minPrice, maxPrice, sort } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { isActive: true };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  if (category) {
    query.category = category;
  }
  
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sort options
  let sortOptions = { createdAt: -1 }; // Default sort
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOptions = { [sortField]: sortOrder };
  }

  // Execute query
  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('seller', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: products,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  });
}));

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/', authenticate, validateCreateProduct, catchAsync(async (req, res) => {
  const productData = {
    ...req.body,
    seller: req.user._id
  };

  const product = await Product.create(productData);
  await product.populate('seller', 'name');

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product
  });
}));

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id', optionalAuth, catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('seller', 'name avatar')
    .populate('reviews.user', 'name avatar');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Increment view count
  await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  res.json({
    success: true,
    data: product
  });
}));

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put('/:id', authenticate, validateUpdateProduct, catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if user owns the product or is admin
  if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to update this product', 403);
  }

  // Update product
  Object.assign(product, req.body);
  await product.save();
  await product.populate('seller', 'name');

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product
  });
}));

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete('/:id', authenticate, catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if user owns the product or is admin
  if (product.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this product', 403);
  }

  await Product.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

/**
 * @swagger
 * /products/{id}/reviews:
 *   post:
 *     summary: Add a review to a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Review added successfully
 */
router.post('/:id/reviews', authenticate, catchAsync(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Add or update review
  await product.addReview(req.user._id, rating, comment);
  await product.populate('reviews.user', 'name avatar');

  res.json({
    success: true,
    message: 'Review added successfully',
    data: product
  });
}));

/**
 * @swagger
 * /products/categories:
 *   get:
 *     summary: Get product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', catchAsync(async (req, res) => {
  const categories = await Product.distinct('category');
  
  res.json({
    success: true,
    data: categories
  });
}));

export default router;