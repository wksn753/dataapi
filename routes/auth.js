const express = require('express');
require('dotenv').config()
const router = express.Router();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming you have a User model defined

// Middleware to verify JWT token
/**
 * @openapi
 * components:
 * securitySchemes:
 * bearerAuth:
 * type: http
 * scheme: bearer
 * bearerFormat: JWT
 * schemas:
 * UserRegister:
 * type: object
 * required:
 * - username
 * - password
 * properties:
 * username:
 * type: string
 * description: Unique username for the user.
 * example: newuser
 * password:
 * type: string
 * format: password
 * description: User's password (min 6 characters).
 * example: mysecretpassword
 * type:
 * type: string
 * enum: [user, admin]
 * default: user
 * description: Type of user (e.g., 'user', 'admin').
 * example: user
 * UserLogin:
 * type: object
 * required:
 * - username
 * - password
 * properties:
 * username:
 * type: string
 * description: Username for login.
 * example: existinguser
 * password:
 * type: string
 * format: password
 * description: Password for login.
 * example: correctpassword
 * UserResponse:
 * type: object
 * properties:
 * id:
 * type: string
 * description: The user's unique ID.
 * example: 60d5ec49c6f2a30015a1a1a1
 * username:
 * type: string
 * description: The user's username.
 * example: existinguser
 * type:
 * type: string
 * description: The user's type.
 * example: user
 * createdAt:
 * type: string
 * format: date-time
 * description: The date and time the user was created.
 * example: 2024-06-06T10:00:00.000Z
 * LoginSuccess:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Login successful
 * token:
 * type: string
 * description: JWT token for authentication.
 * example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * user:
 * $ref: '#/components/schemas/UserResponse'
 * MessageResponse:
 * type: object
 * properties:
 * message:
 * type: string
 * description: A descriptive message.
 * example: User created successfully
 * userId:
 * type: string
 * description: The ID of the created user (for register).
 * example: 60d5ec49c6f2a30015a1a1a1
 * ErrorResponse:
 * type: object
 * properties:
 * message:
 * type: string
 * description: Error message.
 * example: Server error
 * error:
 * type: string
 * description: Detailed error information (in development).
 * example: 'Path `username` is required.'
 */
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
 * @openapi
 * /auth/register:
 * post:
 * summary: Register a new user
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserRegister'
 * responses:
 * 201:
 * description: User created successfully
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/MessageResponse'
 * 400:
 * description: Bad request (e.g., username already exists, validation error)
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
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

// Login user
/**
 * @openapi
 * /auth/login:
 * post:
 * summary: Log in a user
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserLogin'
 * responses:
 * 200:
 * description: Login successful, returns a JWT token and user data.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/LoginSuccess'
 * 400:
 * description: Invalid username or password
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
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
/**
 * @openapi
 * /auth/profile:
 * post: # Using POST as per your code, though GET is more common for profile retrieval
 * summary: Get current user profile
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: User profile data
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserResponse'
 * 401:
 * description: Access denied. No token provided.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 403:
 * description: Invalid token
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: User not found
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
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
 * @openapi
 * /auth/update:
 * post: # Using POST as per your code, though PUT/PATCH are more common for updates
 * summary: Update user information
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * description: New username for the user.
 * example: updateduser
 * password:
 * type: string
 * format: password
 * description: New password for the user.
 * example: newstrongpassword
 * type:
 * type: string
 * enum: [user, admin]
 * description: New type for the user (only if admin is allowed to change).
 * example: user
 * minProperties: 1 # At least one field is required for update
 * responses:
 * 200:
 * description: User updated successfully
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: User updated successfully
 * user:
 * $ref: '#/components/schemas/UserResponse'
 * 400:
 * description: Bad request (e.g., validation error, username already exists)
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Access denied. No token provided.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 403:
 * description: Invalid token
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: User not found
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { username, password, type } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (type) updateData.type = type; // Be careful with allowing general users to change their own type
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
/**
 * @openapi
 * /auth/all:
 * post: # Using POST as per your code, though GET is more common for fetching lists
 * summary: Get all users (Admin only)
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: A list of all users
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/UserResponse'
 * 401:
 * description: Access denied. No token provided.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 403:
 * description: Access denied. Admin privileges required. / Invalid token
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
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
 * @openapi
 * /auth/delete:
 * post: # Using POST as per your code, though DELETE is more common for deletion
 * summary: Delete a user by ID (Admin only)
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - userId
 * properties:
 * userId:
 * type: string
 * description: The ID of the user to delete.
 * example: 60d5ec49c6f2a30015a1a1a1
 * responses:
 * 200:
 * description: User deleted successfully
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: User deleted successfully
 * 401:
 * description: Access denied. No token provided.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 403:
 * description: Access denied. Admin privileges required. / Invalid token
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: User not found
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Server error
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
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
