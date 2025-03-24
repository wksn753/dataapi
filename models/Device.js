import mongoose from "mongoose";
const {Schema,model}=mongoose;

const deviceSchema = new Schema({
    _id: ObjectId,
    imei: { type: String, unique: true },
    name: String,
    userId: { type: ObjectId, ref: "User" },
    createdAt: Date
})

const Device = model('Device', deviceSchema);
export default Device;