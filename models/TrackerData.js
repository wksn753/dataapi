import mongoose from "mongoose";
const {Schema,model}=mongoose;

const trackerDataSchema = new Schema({
    _id: ObjectId,
    raceId: { type: ObjectId, ref: "Race" }, // Ties to Race
    racerId: { type: ObjectId, ref: "Racer" }, // Ties to Racer
    latitude: Number,
    longitude: Number,
    altitude: Number,
    accel: { x: Number, y: Number, z: Number },
    gyro: { x: Number, y: Number, z: Number },
    date: Date,
    timestamp: Date
})