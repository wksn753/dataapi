const express = require('express');
require('dotenv').config()
const router = express.Router();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

// Register new user
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: secretpassword
 *               type:
 *                 type: string
 *                 example: user
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Username already exists
 *       500:
 *         description: Server error
 */

router.post('/register', async (req, res) => {
  try {
    const { username, password, type = 'user' } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await argon2.hash(password);
    
    const user = new User({
      username,
      password: hashedPassword,
      type,
      createdAt: new Date()
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: 12345
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 _id:
 *                   type: string
 *                   example: 1
 *                 user:
 *                   type: object
 *                   example:
 *                     id: 1
 *                     username: John Doe
 *                     type: user
 *                 type:
 *                   type: string
 *                   example: racer
 *       400:
 *         description: Invalid Username or Password
 */

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { _id: user._id, username: user.username, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.status(200).json({ 
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        type: user.type
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user profile
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
/**
 * @swagger
 * /auth/update:
 *   post:
 *     summary: Update the authenticated user's information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: No token provided
 *       403:
 *         description: Invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { username, password, type } = req.body;
    const updateData = {};
    
    if (username) updateData.username = username;
    if (type) updateData.type = type;
    if (password) updateData.password = await argon2.hash(password);
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      updateData,
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin route to get all users
router.post('/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin route to delete user
/**
 * @swagger
 * /auth/delete:
 *   post:
 *     summary: Delete a user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 60b8c0d5b1d4d50015e1a123
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: No token provided
 *       403:
 *         description: Access denied or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

router.post('/delete', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const { userId } = req.body;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
