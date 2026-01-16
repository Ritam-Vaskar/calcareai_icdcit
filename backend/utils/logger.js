const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const getTimestamp = () => {
  return new Date().toISOString();
};

const logger = {
  info: (message, meta = {}) => {
    const log = {
      timestamp: getTimestamp(),
      level: 'INFO',
      message,
      ...meta
    };
    console.log(`[INFO] ${message}`, meta);
    fs.appendFileSync(
      path.join(logDir, 'info.log'),
      JSON.stringify(log) + '\n'
    );
  },
  
  error: (message, error = {}) => {
    const log = {
      timestamp: getTimestamp(),
      level: 'ERROR',
      message,
      error: error.message || error,
      stack: error.stack
    };
    console.error(`[ERROR] ${message}`, error);
    fs.appendFileSync(
      path.join(logDir, 'error.log'),
      JSON.stringify(log) + '\n'
    );
  },
  
  warn: (message, meta = {}) => {
    const log = {
      timestamp: getTimestamp(),
      level: 'WARN',
      message,
      ...meta
    };
    console.warn(`[WARN] ${message}`, meta);
    fs.appendFileSync(
      path.join(logDir, 'warn.log'),
      JSON.stringify(log) + '\n'
    );
  },
  
  audit: (action, user, details = {}) => {
    const log = {
      timestamp: getTimestamp(),
      action,
      user,
      ...details
    };
    fs.appendFileSync(
      path.join(logDir, 'audit.log'),
      JSON.stringify(log) + '\n'
    );
  }
};

module.exports = logger;
