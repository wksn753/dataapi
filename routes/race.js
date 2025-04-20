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
router.post('/get-race', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    const race = await Race.findById(id).populate('racers', 'username');
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
router.post('/start-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId } = req.body;
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

    racerEntry.startTime = new Date();
    await race.save();
    console.log(`Start time recorded for racer ${racerId}`);

    res.status(200).json({ message: 'Racer start time recorded' });
  } catch (error) {
    console.error('Error recording start time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record racer end time
router.post('/end-racer', authenticateToken, async (req, res) => {
  try {
    const { id, racerId } = req.body;
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

    racerEntry.endTime = new Date();
    await race.save();
    console.log(`End time recorded for racer ${racerId}`);

    res.status(200).json({ message: 'Racer end time recorded' });
  } catch (error) {
    console.error('Error recording end time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get leaderboard for a race
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


router.post('/', function(req, res, next) {
  res.json({ title: 'Express' });
});

module.exports = router;