const mongoose = require('mongoose');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function connectDB() {
  if (!process.env.MONGO_URI) return;
  let retryDelay = 5000;

  while (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected');
      return;
    } catch (error) {
      console.error(`MongoDB connection failed: ${error.message}. Retrying in ${Math.round(retryDelay / 1000)}s.`);
      await wait(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
    }
  }
}

module.exports = connectDB;
