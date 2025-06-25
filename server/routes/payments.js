import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @swagger
 * /payments/create-razorpay-order:
 *   post:
 *     summary: Create Razorpay order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Internal order ID
 *     responses:
 *       200:
 *         description: Razorpay order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 razorpayOrderId:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 key:
 *                   type: string
 */
router.post('/create-razorpay-order', authenticate, catchAsync(async (req, res) => {
  const { orderId } = req.body;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if user owns the order
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.totalPrice * 100), // Amount in paise
    currency: 'INR',
    receipt: order.orderNumber,
    notes: {
      orderId: order._id.toString(),
      userId: req.user._id.toString()
    }
  });

  // Update order with Razorpay order ID
  order.paymentResult.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID
  });
}));

/**
 * @swagger
 * /payments/verify-payment:
 *   post:
 *     summary: Verify Razorpay payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - razorpayOrderId
 *               - razorpayPaymentId
 *               - razorpaySignature
 *             properties:
 *               orderId:
 *                 type: string
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.post('/verify-payment', authenticate, catchAsync(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if user owns the order
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  // Verify signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new AppError('Invalid payment signature', 400);
  }

  // Update order
  order.paymentResult = {
    id: razorpayPaymentId,
    status: 'completed',
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  };
  order.paymentStatus = 'completed';
  order.isPaid = true;
  order.paidAt = new Date();

  await order.addStatusUpdate('confirmed', 'Payment completed successfully');

  res.json({
    success: true,
    message: 'Payment verified successfully',
    data: order
  });
}));

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Razorpay webhook handler
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhook', catchAsync(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const { event, payload } = req.body;

  switch (event) {
    case 'payment.captured':
      // Handle successful payment
      const orderId = payload.payment.entity.notes.orderId;
      const order = await Order.findById(orderId);
      
      if (order) {
        order.paymentStatus = 'completed';
        order.isPaid = true;
        order.paidAt = new Date();
        await order.addStatusUpdate('confirmed', 'Payment captured via webhook');
      }
      break;

    case 'payment.failed':
      // Handle failed payment
      const failedOrderId = payload.payment.entity.notes.orderId;
      const failedOrder = await Order.findById(failedOrderId);
      
      if (failedOrder) {
        failedOrder.paymentStatus = 'failed';
        await failedOrder.addStatusUpdate('pending', 'Payment failed');
      }
      break;

    default:
      console.log('Unhandled webhook event:', event);
  }

  res.json({ success: true });
}));

/**
 * @swagger
 * /payments/refund:
 *   post:
 *     summary: Process refund (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.post('/refund', authenticate, catchAsync(async (req, res) => {
  const { orderId, amount, reason } = req.body;

  // Find order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Check if order is paid
  if (!order.isPaid) {
    throw new AppError('Order is not paid', 400);
  }

  // Process refund with Razorpay
  const refund = await razorpay.payments.refund(
    order.paymentResult.razorpayPaymentId,
    {
      amount: Math.round(amount * 100), // Amount in paise
      speed: 'normal',
      notes: {
        reason: reason || 'Refund requested'
      }
    }
  );

  // Update order
  order.paymentStatus = 'refunded';
  await order.addStatusUpdate('cancelled', `Refund processed: ${refund.id}`);

  res.json({
    success: true,
    message: 'Refund processed successfully',
    refundId: refund.id,
    data: order
  });
}));

export default router;