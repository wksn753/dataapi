import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
    _id: ObjectId,
    username: String,
    password: String, // Hash in production
    type: String, // e.g., "admin"
    createdAt: Date
})

const User = model('User', userSchema);

export default User;