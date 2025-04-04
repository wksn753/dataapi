const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const raceSchema = new Schema({
  name: String,
  startTime: Date,
  endTime: Date, // Nullable
  description: String,
  racers: [{ type: Types.ObjectId, ref: "User" }],
  createdAt: Date
});

const Race = model('Race', raceSchema);
module.exports = Race;