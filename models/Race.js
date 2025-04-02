import mongoose from "mongoose";
const {Schema,model}=mongoose

const raceSchema = new Schema({
    _id: ObjectId,
    name: String,
    startTime: Date,
    endTime: Date, // Nullable
    description: String,
    racers: [{ type: ObjectId, ref: "User" }], // Array of racer IDs
    createdAt: Date
})

const Race = model('Race', raceSchema);
export default Race;