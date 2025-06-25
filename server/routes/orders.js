import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateOrder, validatePagination } from '../middleware/validation.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post('/', authenticate, validateCreateOrder, catchAsync(async (req, res) => {
  const { items, shippingAddress, paymentMethod, notes } = req.body;

  // Validate products and calculate prices
  const orderItems = [];
  let itemsPrice = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      throw new AppError(`Product with ID ${item.product} not found`, 404);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for product ${product.name}`, 400);
    }

    const orderItem = {
      product: product._id,
      name: product.name,
      image: product.images[0]?.url || '',
      price: product.price,
      quantity: item.quantity
    };

    orderItems.push(orderItem);
    itemsPrice += product.price * item.quantity;
  }

  // Create order
  const order = new Order({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    notes,
    itemsPrice
  });

  // Calculate totals
  order.calculateTotals();

  // Add initial status
  order.addStatusUpdate('pending', 'Order placed successfully');

  await order.save();

  // Update product stock
  for (const item of items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } }
    );
  }

  await order.populate('items.product', 'name images');

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order
  });
}));

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get user orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/', authenticate, validatePagination, catchAsync(async (req, res) => {
  const { page, limit, status } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { user: req.user._id };
  if (status) {
    query.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: orders,
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
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order retrieved successfully
 */
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if user owns the order or is admin
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to view this order', 403);
  }

  res.json({
    success: true,
    data: order
  });
}));

/**
 * @swagger
 * /orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order
 *     tags: [Orders]
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
 *         description: Order cancelled successfully
 */
router.put('/:id/cancel', authenticate, catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if user owns the order
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to cancel this order', 403);
  }

  // Check if order can be cancelled
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }

  // Update order status
  await order.addStatusUpdate('cancelled', 'Cancelled by user');

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: order
  });
}));

/**
 * @swagger
 * /orders/admin/all:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/admin/all', authenticate, authorize('admin'), validatePagination, catchAsync(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (status) {
    query.status = status;
  }
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: search, $options: 'i' } }
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: orders,
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
 * /orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled, returned]
 *               note:
 *                 type: string
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.put('/:id/status', authenticate, authorize('admin'), catchAsync(async (req, res) => {
  const { status, note, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Update status
  await order.addStatusUpdate(status, note);

  // Update tracking number if provided
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
    await order.save();
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
}));

export default router;