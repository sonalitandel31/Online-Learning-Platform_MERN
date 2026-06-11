import api from '../api/api';

// Convert the base64 public key to a format the browser understands
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Request permission and subscribe the user
export const subscribeToPushNotifications = async () => {
  // Check if browser supports service workers and push messaging
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications are not supported by this browser.');
    return false;
  }

  try {
    // Ask user for permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permission not granted for Notification');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Replace this with the Public Key generated in Step 1
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY; 

    // Subscribe via the browser PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // Send the subscription object to your Node.js backend
    await api.post('/notifications/subscribe', subscription);
    
    console.log('Successfully subscribed to push notifications!');
    return true;

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

// Check if user is already subscribed
export const checkPushSubscriptionStatus = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null; 
  } catch (error) {
    return false;
  }
};

// Unsubscribe the user from push notifications
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return false;
  }
};