const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 */
const logActivity = async (userId, action, entityType = 'other', entityId = null, details = {}, req = null) => {
  try {
    const logData = {
      user: userId,
      action,
      entityType,
      details,
      timestamp: new Date()
    };

    // Only add entityId if it's provided
    if (entityId) {
      logData.entityId = entityId;
    }

    // Extract IP and user agent from request
    if (req) {
      logData.ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
      logData.userAgent = req.get('user-agent') || 'unknown';
    }

    const log = await ActivityLog.create(logData);
    console.log('✅ Activity logged:', log._id); // Confirm success
    return log;
  } catch (error) {
    console.error('❌ Activity logging failed:', error.message);
    console.error('Full error:', error); // Show full error for debugging
    throw error; // Re-throw so we can see what's wrong
  }
};

module.exports = { logActivity };
