const express = require('express');
const webpush = require('web-push');
const router = express.Router();

// Setup web-push with your VAPID keys from .env
webpush.setVapidDetails(
  'mailto:lmswebsite31@gmail.com', 
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

let subscriptions = [];

// Route to save the user's browser subscription
router.post('/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Save subscription to database
  subscriptions.push(subscription);
  
  res.status(201).json({ success: true, message: 'Subscribed successfully.' });
});

// Route to trigger a notification (Admin only ideally)
router.post('/send', (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title || 'LearnX Update',
    body: req.body.message || 'New content is available!',
    icon: '/icons/icon-192x192.png',
    url: req.body.url || '/'
  });

  // Send the notification to all subscribed users
  Promise.all(subscriptions.map(sub => webpush.sendNotification(sub, payload)))
    .then(() => res.status(200).json({ success: true }))
    .catch(err => {
      console.error('Error sending notification', err);
      res.sendStatus(500);
    });
});

module.exports = router;