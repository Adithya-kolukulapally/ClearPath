const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error (server still running):', error.message);
    // Don't exit — server still works with mock AI
  }
};
module.exports = connectDB;
