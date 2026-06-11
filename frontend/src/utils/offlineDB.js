// 1. Initialize the Database (Version bumped to 2 for video support)
export const initDB = () => {
  return new Promise((resolve, reject) => {
    // Open 'SmartLearnDB', upgraded to version 2
    const request = indexedDB.open('SmartLearnDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for lesson completion progress
      if (!db.objectStoreNames.contains('offlineProgress')) {
        db.createObjectStore('offlineProgress', { keyPath: 'lessonId' });
      }
      
      // NEW: Store for heavy video blobs
      if (!db.objectStoreNames.contains('offlineVideos')) {
        db.createObjectStore('offlineVideos', { keyPath: 'lessonId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 2. Save Offline Progress (UPDATED)
export const saveProgressLocally = async (lessonId, data, userId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction('offlineProgress', 'readwrite');
    const store = transaction.objectStore('offlineProgress');
    
    // NAYA: userId save kar rahe hain
    store.put({ lessonId, ...data, userId: String(userId), isSynced: false });
    
    console.log('[IndexedDB] Progress saved offline for lesson:', lessonId);
  } catch (error) {
    console.error('Error saving to offline DB:', error);
  }
};

// 3. Retrieve un-synced data (UPDATED)
export const getUnsyncedProgress = async (userId) => {
  return new Promise(async (resolve, reject) => {
    const db = await initDB();
    const transaction = db.transaction('offlineProgress', 'readonly');
    const store = transaction.objectStore('offlineProgress');
    const request = store.getAll();

    request.onsuccess = () => {
      // NAYA: Sirf is logged-in user ka unsynced data nikalna hai
      const unsyncedData = request.result.filter(item => 
        item.isSynced === false && item.userId === String(userId)
      );
      resolve(unsyncedData);
    };
    request.onerror = () => reject(request.error);
  });
};

// Save video blob to local database (UPDATED)
export const saveVideoOffline = async (lesson, course, videoBlob, userId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction('offlineVideos', 'readwrite');
    const store = transaction.objectStore('offlineVideos');
    
    store.put({ 
      lessonId: String(lesson._id), 
      courseId: String(course._id),
      userId: String(userId), // NAYA: User ID attach kar di
      lessonTitle: lesson.title,
      courseTitle: course.title,
      blob: videoBlob,
      savedAt: new Date().toISOString() 
    });
    
    console.log('[IndexedDB] Video saved offline with metadata:', lesson.title);
    return true;
  } catch (error) {
    console.error('Error saving video to offline DB:', error);
    return false;
  }
};

// NEW: Get ALL downloaded videos for the Downloads page (UPDATED)
export const getAllOfflineVideos = async (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction('offlineVideos', 'readonly');
      const store = transaction.objectStore('offlineVideos');
      const request = store.getAll();

      request.onsuccess = () => {
        const allVideos = request.result || [];
        // NAYA: Sirf is user ki videos return karo
        const userVideos = allVideos.filter(v => String(v.userId) === String(userId));
        resolve(userVideos);
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

// 4. Mark data as synced (called after successfully sending to the backend)
export const markAsSynced = async (lessonId) => {
  const db = await initDB();
  const transaction = db.transaction('offlineProgress', 'readwrite');
  const store = transaction.objectStore('offlineProgress');
  const request = store.get(lessonId);

  request.onsuccess = () => {
    const data = request.result;
    if (data) {
      data.isSynced = true;
      store.put(data);
    }
  };
};

// Retrieve video blob from local database (UPDATED WITH USER ID CHECK)
export const getVideoOffline = async (lessonId, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction('offlineVideos', 'readonly');
      const store = transaction.objectStore('offlineVideos');
      const request = store.get(lessonId);

      request.onsuccess = () => {
        const result = request.result;
        // Agar video mili AUR usko is current user ne hi download kiya tha
        if (result && String(result.userId) === String(userId)) {
          resolve(result.blob);
        } else {
          resolve(null); // Agar kisi aur user ki video hai toh null return karo
        }
      };
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
};

// Delete video to free up storage space
export const removeVideoOffline = async (lessonId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction('offlineVideos', 'readwrite');
    const store = transaction.objectStore('offlineVideos');
    store.delete(lessonId);
    console.log('[IndexedDB] Offline video deleted for lesson:', lessonId);
  } catch (error) {
    console.error('Error deleting offline video:', error);
  }
};