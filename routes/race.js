const express = require('express');
require('dotenv').config();
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Race = require('../models/Race');
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

// Create a new race (admin only)
/**
 * @swagger
 * /raceManagement/create:
 *   post:
 *     summary: Create a new race (admin only)
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
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               startingPoint:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               endingPoint:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       201:
 *         description: Race created successfully
 *       401:
 *         description: Access denied. No token provided.
 *       403:
 *         description: Access denied. Admin privileges required.
 *       500:
 *         description: Server error
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { name, startTime, endTime, description, startingPoint, endingPoint } = req.body;
    
    const race = new Race({
      name,
      startTime,
      endTime: endTime || null,
      description,
      startingPoint: startingPoint ? {
        latitude: startingPoint.latitude,
        longitude: startingPoint.longitude
      } : undefined,
      endingPoint: endingPoint ? {
        latitude: endingPoint.latitude,
        longitude: endingPoint.longitude
      } : undefined,
      racers: [],
      createdAt: new Date()
    });

    await race.save();
    res.status(201).json({ message: 'Race created successfully', raceId: race._id });
  } catch (error) {
    console.error('Error creating race:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all races
/**
 * @swagger
 * /raceManagement/all:
 *   post:
 *     summary: Get all races
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all races
 *       401:
 *         description: Access denied. No token provided.
 *       500:
 *         description: Server error
 */

router.post('/all', authenticateToken, async (req, res) => {
  try {
    const races = await Race.find()
      .populate('racers.userId', 'username'); // Change to populate the nested userId field
    
    res.status(200).json(races);
  } catch (error) {
    console.error('Error getting races:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Get specific race by ID
/**
 * @swagger
 * /raceManagement/get-race:
 *   post:
 *     summary: Get a specific race by ID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Race found
 *       404:
 *         description: Race not found
 *       500:
 *         description: Server error
 */
router.post('/get-race', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    const race = await Race.findOne({ name: id }).populate('racers', 'username');
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }
    res.status(200).json(race);
  } catch (error) {
    console.error('Error getting race:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Update race (admin only)
/**
 * @swagger
 * /raceManagement/update:
 *   post:
 *     summary: Update a race (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               description:
 *                 type: string
 *               startingPoint:
 *                 type: object
 *               endingPoint:
 *                 type: object
 *     responses:
 *       200:
 *         description: Race updated successfully
 *       403:
 *         description: Admin privileges required
 *       404:
 *         description: Race not found
 *       500:
 *         description: Server error
 */

router.post('/update', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { id, name, startTime, endTime, description, startingPoint, endingPoint } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (startTime) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (description) updateData.description = description;
    if (startingPoint !== undefined) {
      updateData.startingPoint = startingPoint ? {
        latitude: startingPoint.latitude,
        longitude: startingPoint.longitude
      } : null;
    }
    if (endingPoint !== undefined) {
      updateData.endingPoint = endingPoint ? {
        latitude: endingPoint.latitude,
        longitude: endingPoint.longitude
      } : null;
    }

    const race = await Race.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('racers', 'username');

    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    res.status(200).json({ message: 'Race updated successfully', race });
  } catch (error) {
    console.error('Error updating race:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete race (admin only)

/**
 * @swagger
 * /raceManagement/delete:
 *   post:
 *     summary: Delete a race (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Race deleted successfully
 *       403:
 *         description: Admin privileges required
 *       404:
 *         description: Race not found
 *       500:
 *         description: Server error
 */
router.post('/delete', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { id } = req.body;
    const race = await Race.findByIdAndDelete(id);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    res.status(200).json({ message: 'Race deleted successfully' });
  } catch (error) {
    console.error('Error deleting race:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//add racer
/**
 * @swagger
 * /raceManagement/add-racer:
 *   post:
 *     summary: Add a racer to a race
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               racerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Racer added successfully
 *       400:
 *         description: Racer already in race or invalid ID
 *       404:
 *         description: Racer or race not found
 *       500:
 *         description: Server error
 */
router.post('/add-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(racerId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Verify racer exists
    const racer = await User.findById(racerId);
    if (!racer) {
      return res.status(404).json({ message: 'Racer not found' });
    }

    const race = await Race.findById(id);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    // Check if racer is already in the race
    if (race.racers.some(r => r.userId.toString() === racerId.toString())) {
      return res.status(400).json({ message: 'Racer already in race' });
    }
    const userName=racer.username;
    // Add racer with proper structure
    race.racers.push({
      userId: racerId,
      username:userName,
      startTime: undefined,
      endTime: undefined
    });
    
    await race.save();

    // Populate the racers' user information
    const updatedRace = await Race.findById(id).populate('racers.userId', 'username');
    res.status(200).json({ 
      message: 'Racer added successfully',
      race: updatedRace 
    });
  } catch (error) {
    console.error('Error adding racer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Remove racer from race
/**
 * @swagger
 * /raceManagement/remove-racer:
 *   post:
 *     summary: Remove a racer from a race
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               racerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Racer removed successfully
 *       400:
 *         description: Racer not found in race or invalid ID
 *       404:
 *         description: Race or racer not found
 *       500:
 *         description: Server error
 */

router.post('/remove-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId } = req.body;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(racerId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const race = await Race.findById(id);
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    // Optional: Check if the racer exists
    const racer = await User.findById(racerId);
    if (!racer) {
      return res.status(404).json({ message: 'Racer not found' });
    }

    // Find the racer entry by userId
    const racerIndex = race.racers.findIndex(r => r.userId.toString() === racerId.toString());
    if (racerIndex === -1) {
      return res.status(400).json({ message: 'Racer not found in race' });
    }

    // Remove the racer from the array
    race.racers.splice(racerIndex, 1);
    await race.save();

    const updatedRace = await Race.findById(id).populate('racers.userId', 'username');
    res.status(200).json({ 
      message: 'Racer removed successfully',
      race: updatedRace 
    });
  } catch (error) {
    console.error('Error removing racer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record racer start time
/**
 * @swagger
 * /raceManagement/start-racer:
 *   post:
 *     summary: Record a racer's start time in a race
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               racerId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Racer start time recorded
 *       400:
 *         description: Racer already started or invalid date
 *       404:
 *         description: Race or racer not found
 *       500:
 *         description: Server error
 */

router.post('/start-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId, startTime } = req.body;
    console.log(`Starting racer ${racerId} for race ${id}`);
    
    const race = await Race.findById(id);
    if (!race) {
      console.warn(`Race not found: ${id}`);
      return res.status(404).json({ message: 'Race not found' });
    }
    console.log(`found race ${id}`);
    
    // Find the racer entry in the racers array
    const racerEntry = race.racers.find(r => r.userId.toString() === racerId);
    if (!racerEntry) {
      console.warn(`Racer not found in race: ${racerId}`);
      return res.status(400).json({ message: 'Racer not found in race' });
    }
    console.log(`found racer ${racerId} for race ${id}`);
    
    if (racerEntry.startTime) {
      console.warn(`Racer already started: ${racerId}`);
      return res.status(400).json({ message: 'Racer already started' });
    }
    
    // Check and validate date format if startTime is provided
    let finalStartTime;
    if (startTime) {
      const parsedDate = new Date(startTime);
      
      // Check if date is valid (not Invalid Date)
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date format provided: ${startTime}`);
        return res.status(400).json({ message: 'Invalid date format' });
      }
      finalStartTime = parsedDate;
    } else {
      finalStartTime = new Date();
    }
    
    racerEntry.startTime = finalStartTime;
    await race.save();
    
    console.log(`Start time recorded for racer ${racerId}: ${racerEntry.startTime}`);
    res.status(200).json({
      message: 'Racer start time recorded',
      startTime: racerEntry.startTime
    });
  } catch (error) {
    console.error('Error recording start time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record racer end time

/**
 * @swagger
 * /raceManagement/end-racer:
 *   post:
 *     summary: Record a racer's end time in a race
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               racerId:
 *                 type: string
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Racer end time recorded
 *       400:
 *         description: Racer has not started, already finished, or invalid date
 *       404:
 *         description: Race or racer not found
 *       500:
 *         description: Server error
 */
router.post('/end-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId, endTime } = req.body;
    console.log(`Ending racer ${racerId} for race ${id}`);
    
    const race = await Race.findById(id);
    if (!race) {
      console.warn(`Race not found: ${id}`);
      return res.status(404).json({ message: 'Race not found' });
    }
    
    // Find the racer entry in the racers array
    const racerEntry = race.racers.find(r => r.userId.toString() === racerId);
    if (!racerEntry) {
      console.warn(`Racer not found in race: ${racerId}`);
      return res.status(400).json({ message: 'Racer not found in race' });
    }
    
    if (!racerEntry.startTime) {
      console.warn(`Racer has not started: ${racerId}`);
      return res.status(400).json({ message: 'Racer has not started' });
    }
    
    if (racerEntry.endTime) {
      console.warn(`Racer already finished: ${racerId}`);
      return res.status(400).json({ message: 'Racer already finished' });
    }
    
    // Check and validate date format if endTime is provided
    let finalEndTime;
    if (endTime) {
      const parsedDate = new Date(endTime);
      
      // Check if date is valid (not Invalid Date)
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date format provided: ${endTime}`);
        return res.status(400).json({ message: 'Invalid date format' });
      }
      finalEndTime = parsedDate;
    } else {
      finalEndTime = new Date();
    }
    
    racerEntry.endTime = finalEndTime;
    await race.save();
    
    console.log(`End time recorded for racer ${racerId}: ${racerEntry.endTime}`);
    res.status(200).json({ 
      message: 'Racer end time recorded',
      endTime: racerEntry.endTime 
    });
  } catch (error) {
    console.error('Error recording end time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get leaderboard for a race
/**
 * @swagger
 * /raceManagement/leaderboard:
 *   post:
 *     summary: Get leaderboard for a race
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leaderboard retrieved
 *       404:
 *         description: Race not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /raceManagement/getRacerRaces:
 *   post:
 *     summary: Get all races a racer is registered in
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               racerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: List of races the racer is in
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;

    const race = await Race.findById(id).populate('racers.userId', 'username');
    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    const leaderboard = race.racers
      .map(racer => {
        if (!racer.startTime || !racer.endTime) {
          return null;
        }
        const duration = (new Date(racer.endTime).getTime() - new Date(racer.startTime).getTime()) / 1000; // seconds
        return {
          racerId: racer.userId._id,
          username: racer.userId.username,
          startTime: racer.startTime,
          endTime: racer.endTime,
          duration
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => a.duration - b.duration);

    res.status(200).json({ 
      raceName: race.name,
      leaderboard 
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/getRacerRaces', authenticateToken, async (req, res) => {
  try {
    const { racerId } = req.body;
    const user = await User.findById(racerId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const races = await Race.find({ 'racers.userId': racerId }).populate('racers.userId', 'username');
    res.status(200).json({ races });
    
  }catch(error){
    console.error('Error getting racer races:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
);

router.post("/getRacerRacesByName", authenticateToken, async (req, res) => {
  try {
    const { racerName,raceName } = req.body;
    const user = await User.findOne({ username: racerName });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const races = await Race.find({ "racers.userId": user._id,name:raceName }).populate(
      "racers.userId",
      "username"
    );
    if(races.length===0){
      return res.status(404).json({ message: "No races found for this user in the specified race" });
    }
    res.status(200).json({ races ,message:"success"});
  } catch (error) {
    console.error("Error getting racer races:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post('/', function(req, res, next) {
  res.json({ title: 'Express' });
});

module.exports = router;