import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validatePagination } from '../middleware/validation.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/profile', authenticate, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: user
  });
}));

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', authenticate, catchAsync(async (req, res) => {
  const { name, avatar } = req.body;
  const user = req.user;

  // Update allowed fields
  if (name) user.name = name;
  if (avatar) user.avatar = avatar;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
}));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', authenticate, authorize('admin'), validatePagination, catchAsync(async (req, res) => {
  const { page, limit, search, role } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  if (role) {
    query.role = role;
  }

  // Execute query
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -twoFactorSecret -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: users,
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
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, authorize('admin'), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -twoFactorSecret -refreshTokens');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
}));

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID (Admin only)
 *     tags: [Users]
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               isEmailVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', authenticate, authorize('admin'), catchAsync(async (req, res) => {
  const { name, email, role, isEmailVerified } = req.body;
  
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (typeof isEmailVerified === 'boolean') user.isEmailVerified = isEmailVerified;

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
}));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user by ID (Admin only)
 *     tags: [Users]
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
 *         description: User deleted successfully
 */
router.delete('/:id', authenticate, authorize('admin'), catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new AppError('Cannot delete your own account', 400);
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

export default router;