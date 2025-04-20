const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

// Sub-schema for coordinates
const coordinateSchema = new Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  }
});

const raceSchema = new Schema({
  name: String,
  startTime: Date,
  endTime: Date, // Nullable
  description: String,
  startingPoint: {
    type: coordinateSchema
  },
  endingPoint: {
    type: coordinateSchema
  },
  racers: [{
    userId: { type: Types.ObjectId, ref: "User" },
    username:String,
    startTime: Date,
    endTime: Date
  }],
  createdAt: Date
});

const Race = model('Race', raceSchema);
module.exports = Race;