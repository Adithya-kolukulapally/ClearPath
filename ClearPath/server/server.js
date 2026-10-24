require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const planRoutes = require('./routes/planRoutes');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Connect to MongoDB only if URI is present (for easier local testing without DB at first)
if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.log('MONGO_URI is missing, running without DB connection. Add MONGO_URI to .env to connect.');
}

app.use('/api/plan', planRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workspace', workspaceRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'This upload is larger than the 10 MB limit.', code: 'UPLOAD_TOO_LARGE' });
  console.error('Request failed:', error.message);
  return res.status(error.status || 500).json({ error: 'We could not complete that request. Please try again.', code: 'REQUEST_FAILED' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
