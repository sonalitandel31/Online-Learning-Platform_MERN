const webpush = require('web-push');
const User = require('../models/userModel'); // Path to your User model

// Setup VAPID details (If not already initialized in server.js)
webpush.setVapidDetails(
  'mailto:lmswebsite31@gmail.com', // Replace with your active developer/admin email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPushToUser = async (userId, payload) => {
  try {
    // 1. Find the user in the database to retrieve their 'pushSubscriptions' array
    const user = await User.findById(userId);
    
    // Return silently if the user hasn't opted in for notifications or has no active subscriptions
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return; 
    }

    const pushPayload = JSON.stringify(payload);

    // 2. Send the notification to all registered devices (Phone, PC, etc.) of the user
    const promises = user.pushSubscriptions.map(sub => 
      webpush.sendNotification(sub, pushPayload)
    );

    await Promise.all(promises);
    console.log(`✅ Auto-Notification sent to user: ${userId}`);

  } catch (error) {
    console.error("❌ Error sending automatic push notification:", error);
  }
};

module.exports = { sendPushToUser };