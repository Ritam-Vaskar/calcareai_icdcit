require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const cronService = require('./services/cronService');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareCall AI Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/calls', require('./routes/callLogRoutes'));
app.use('/api/followups', require('./routes/followUpRoutes'));
app.use('/api/recordings', require('./routes/recordingRoutes'));
app.use('/api/webhooks/twilio', require('./routes/twilioWebhookRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CareCall AI API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      patients: '/api/patients',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      calls: '/api/calls',
      followups: '/api/followups',
      webhooks: '/api/webhooks'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);

  // Initialize cron jobs
  if (process.env.NODE_ENV !== 'test') {
    cronService.init();
    logger.info('🕐 Cron jobs initialized');
  }

  // Setup WebSocket server for Twilio Media Streams
  const WebSocket = require('ws');
  const mediaStreamHandler = require('./services/mediaStreamHandler');

  const wss = new WebSocket.Server({ server, path: '/media-stream' });

  wss.on('connection', (ws) => {
    logger.info('WebSocket connection established for media stream');
    mediaStreamHandler.handleConnection(ws);
  });

  logger.info('✅ WebSocket server ready for media streams');
  console.log('✅ WebSocket ready at: ws://localhost:' + PORT + '/media-stream');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  console.error('❌ Unhandled Rejection:', err);

  // Close server & exit
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('👋 SIGTERM received, shutting down gracefully');

  cronService.stop();

  server.close(() => {
    logger.info('Process terminated');
    console.log('✅ Process terminated');
  });
});

module.exports = app;
