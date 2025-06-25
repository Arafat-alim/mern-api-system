import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import { authenticate, generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../middleware/validation.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import passport from '../config/passport.js';

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', validateRegister, catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  // Remove password from response
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: user,
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               twoFactorCode:
 *                 type: string
 *                 description: Required if 2FA is enabled
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials or 2FA required
 */
router.post('/login', validateLogin, catchAsync(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password +twoFactorSecret');
  
  if (!user || !(await user.comparePassword(password))) {
    // Increment login attempts if user exists
    if (user) {
      await user.incLoginAttempts();
    }
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new AppError('Account is temporarily locked due to too many failed login attempts', 423);
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(200).json({
        success: true,
        message: '2FA code required',
        requiresTwoFactor: true
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
      window: 2
    });

    if (!verified) {
      // Check backup codes
      const backupCode = user.twoFactorBackupCodes.find(
        code => code.code === twoFactorCode && !code.used
      );

      if (backupCode) {
        backupCode.used = true;
        await user.save();
      } else {
        await user.incLoginAttempts();
        throw new AppError('Invalid 2FA code', 401);
      }
    }
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  // Remove sensitive data
  user.password = undefined;
  user.twoFactorSecret = undefined;

  res.json({
    success: true,
    message: 'Login successful',
    data: user,
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', verifyRefreshToken, catchAsync(async (req, res) => {
  const { user, refreshToken: oldRefreshToken } = req;

  // Generate new tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Remove old refresh token and add new one
  user.refreshTokens = user.refreshTokens.filter(tokenObj => tokenObj.token !== oldRefreshToken);
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    tokens: {
      accessToken,
      refreshToken
    }
  });
}));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const user = req.user;

  if (refreshToken) {
    // Remove specific refresh token
    user.refreshTokens = user.refreshTokens.filter(tokenObj => tokenObj.token !== refreshToken);
  } else {
    // Remove all refresh tokens (logout from all devices)
    user.refreshTokens = [];
  }

  await user.save();

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @swagger
 * /auth/setup-2fa:
 *   post:
 *     summary: Setup two-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 qrCodeUrl:
 *                   type: string
 *                 secret:
 *                   type: string
 *                 backupCodes:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/setup-2fa', authenticate, catchAsync(async (req, res) => {
  const user = req.user;

  if (user.twoFactorEnabled) {
    throw new AppError('2FA is already enabled', 400);
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `MERN API (${user.email})`,
    issuer: 'MERN API System'
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes
  const backupCodes = user.generateBackupCodes();

  // Save secret (but don't enable 2FA yet)
  user.twoFactorSecret = secret.base32;
  await user.save();

  res.json({
    success: true,
    message: '2FA setup initiated',
    qrCodeUrl,
    secret: secret.base32,
    backupCodes
  });
}));

/**
 * @swagger
 * /auth/verify-2fa:
 *   post:
 *     summary: Verify and enable 2FA
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 */
router.post('/verify-2fa', authenticate, catchAsync(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (!user.twoFactorSecret) {
    throw new AppError('2FA setup not initiated', 400);
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2
  });

  if (!verified) {
    throw new AppError('Invalid 2FA code', 400);
  }

  // Enable 2FA
  user.twoFactorEnabled = true;
  await user.save();

  res.json({
    success: true,
    message: '2FA enabled successfully'
  });
}));

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  catchAsync(async (req, res) => {
    const user = req.user;
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
    res.redirect(redirectUrl);
  })
);

export default router;