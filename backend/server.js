require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const certificateRoutes = require('./routes/certificate');

const http = require('http');
const { Server } = require('socket.io');

// ===========================
// IMPORT ROUTES
// ===========================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const courseRoutes = require('./routes/course');
const lessonRoutes = require('./routes/lesson');
const examRoutes = require('./routes/exam');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/upload');
const downloadRoutes = require('./routes/download');

// ===========================
// IMPORT MIDDLEWARE
// ===========================
const { errorHandler, AppError } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ===========================
// ✅ SOCKET.IO CONFIGURATION
// ===========================
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      process.env.CLIENT_URL || '*'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// ✅ UPDATED: WebSocket connection handling with proper room management
io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id);

  // User registration
  socket.on('register', (data) => {
    const { userId, role } = data;
    
    console.log('👤 User registered:', { userId, role, socketId: socket.id });

    // Join role-based rooms
    if (role === 'admin') {
      socket.join('admins');
      console.log('👑 Admin joined:', userId);
    } else if (role === 'instructor') {
      socket.join('admins'); // Instructors also get admin notifications
      console.log('👨‍🏫 Instructor joined admins room:', userId);
    }
  });

  // ✅ NEW: Explicit instructor room joining
  socket.on('joinInstructorRoom', (instructorId) => {
    const roomName = `instructor-${instructorId}`;
    socket.join(roomName);
    console.log(`🏠 Instructor joined room: ${roomName}`);
    
    // Confirm room join
    socket.emit('roomJoined', { room: roomName });
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

app.set('io', io); // Make io accessible in routes

// ===========================
// CORS CONFIGURATION
// ===========================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    process.env.CLIENT_URL || '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===========================
// BODY PARSER MIDDLEWARE
// ===========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================
// REQUEST LOGGING (Development)
// ===========================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===========================
// DATABASE CONNECTION
// ===========================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ===========================
// HEALTH CHECK
// ===========================
app.get('/', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'SkillForge API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    websocket: 'enabled'
  });
});

// ===========================
// API ROUTES
// ===========================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/certificates', certificateRoutes);

// ===========================
// 404 HANDLER (Undefined Routes)
// ===========================
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ===========================
// GLOBAL ERROR HANDLER
// ===========================
app.use(errorHandler);

// ===========================
// START SERVER
// ===========================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n🎓 ═══════════════════════════════════════════════');
  console.log('   SkillForge LMS API Server');
  console.log('   ═══════════════════════════════════════════════');
  console.log(`   🚀 Server:      http://localhost:${PORT}`);
  console.log(`   📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   🗄️  Database:    ${mongoose.connection.name}`);
  console.log(`   🌐 CORS:        Enabled for multiple origins`);
  console.log(`   🔌 WebSocket:   Enabled for real-time updates`);
  console.log('   ═══════════════════════════════════════════════\n');
  console.log('   Available Routes:');
  console.log('   • POST   /api/auth/register');
  console.log('   • POST   /api/auth/login');
  console.log('   • GET    /api/courses');
  console.log('   • POST   /api/ai/generate-quiz');
  console.log('   • GET    /api/analytics/platform');
  console.log('   • GET    /api/analytics/my-stats');
  console.log('   • GET    /api/health');
  console.log('   ═══════════════════════════════════════════════\n');
});

// ===========================
// GRACEFUL SHUTDOWN
// ===========================
process.on('unhandledRejection', (err) => {
  console.error('\n❌ UNHANDLED REJECTION! Shutting down gracefully...');
  console.error(`Error: ${err.name} - ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = { app, io };
