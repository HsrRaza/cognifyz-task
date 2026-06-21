// Load environment variables
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { initQueues } = require('./services/queueService');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('[Server] Initializing Smart Task Manager Application...');

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Redis (with graceful dev fallbacks)
    await initRedis();

    // 3. Initialize Background Queues / Workers
    initQueues();

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`[Server] Web application running at http://127.0.0.1:${PORT}`);
      console.log(`[Server] Press Ctrl+C to terminate.`);
    });
  } catch (error) {
    console.error(`[Server] Critical bootstrap error:`, error.message);
    process.exit(1);
  }
};

startServer();
