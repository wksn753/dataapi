import mongoose from "mongoose";
const {Schema,model}=mongoose

const racerSchema = new Schema({
    id: ObjectId,
    name: String,
    deviceImei: { type: String, ref: "Device" }, // References Device.imei
    userId: { type: ObjectId, ref: "User" },
    createdAt: Date
})

const Racer = model('Racer', racerSchema);
export default Racer;