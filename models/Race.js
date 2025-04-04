import mongoose from "mongoose";
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
export default Race;