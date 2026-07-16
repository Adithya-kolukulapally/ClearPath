require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const planRoutes = require('./routes/planRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB only if URI is present (for easier local testing without DB at first)
if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.log('MONGO_URI is missing, running without DB connection. Add MONGO_URI to .env to connect.');
}

app.use('/api/plan', planRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
