import api from "../api/api";

const SESSION_KEY = "lx_session_id";

// -- Settings for the analytics system --
const QUEUE_KEY = "lx_analytics_queue_v1";
const MAX_QUEUE = 300;          // Keep only 300 items max so we don't fill up the browser memory
const BATCH_SIZE = 20;          // Send 20 events at a time to the server
const FLUSH_INTERVAL_MS = 6000; // Try to send data every 6 seconds
const BASE_BACKOFF_MS = 1500;   // If sending fails, wait 1.5 seconds before retrying
const MAX_BACKOFF_MS = 30000;   // Never wait longer than 30 seconds to retry

// -- Helper: Identify the current user session --
function getSessionId() {
  // Try to find an existing ID in the current browser tab
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    // If not found, create a random ID (looks like a long random string)
    sid =
      crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// -- Helper: Prevent crashes if saved data is broken --
function safeJSONParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    // If the text isn't valid JSON, return the fallback value (like empty list)
    return fallback;
  }
}

// -- Storage: Read the list of events from browser storage --
function loadQueue() {
  return safeJSONParse(localStorage.getItem(QUEUE_KEY) || "[]", []);
}

// -- Storage: Save the list of events to browser storage --
function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

// -- Storage: Add a new event to the list --
function pushQueue(item) {
  const q = loadQueue();
  q.push(item);
  // If the list is too big, remove the oldest items to make space
  if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE);
  saveQueue(q);
}

// -- Storage: Take a batch of events out to send them --
function shiftBatch(size) {
  const q = loadQueue();
  const batch = q.slice(0, size); // Get the first 'size' items
  const rest = q.slice(size);     // Keep the rest
  saveQueue(rest);
  return batch;
}

// -- Storage: Put events back in front if sending failed --
function unshiftBatch(batch) {
  const q = loadQueue();
  const merged = [...batch, ...q]; // Put the failed batch back at the start
  if (merged.length > MAX_QUEUE) merged.splice(MAX_QUEUE); // Ensure we don't go over limit
  saveQueue(merged);
}

// -- Helper: Get current time in standard format --
function nowISO() {
  return new Date().toISOString();
}

// -- Data: Gather info we send with *every* event --
function getCommonContext() {
  const user = safeJSONParse(localStorage.getItem("user") || "null", null);
  return {
    sessionId: getSessionId(),
    userId: user?._id || null,     // Logged in user ID
    role: user?.role || null,      // User role (e.g., admin)
    path: window.location.pathname + window.location.search, // Current URL page
    referrer: document.referrer || null, // Which page sent them here
    ua: navigator.userAgent || null,     // Browser info (Chrome, Safari, etc.)
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null, // Timezone
  };
}

// ---- Throttling: Prevent spamming the same event ----
const lastEventAt = new Map(); // Stores the last time an event happened

function shouldDrop(event, options) {
  // If "force" is true, never ignore the event
  if (options?.force) return false;

  // Default rule: wait 400ms between same events
  const throttleMs = options?.throttleMs ?? 400;
  
  const key = `${event}`;
  const prev = lastEventAt.get(key) || 0;
  const now = Date.now();

  // If it happened too recently, tell the system to drop it
  if (now - prev < throttleMs) return true;
  
  // Update the time and let it pass
  lastEventAt.set(key, now);
  return false;
}

// ---- Sending State ----
let flushing = false;   // Are we currently sending data?
let backoffMs = 0;      // How long to wait before retrying?
let flushTimer = null;  // The timer object

// -- Network: Send data using normal HTTP request --
async function sendBatchHTTP(batch) {
  // Preferred endpoint: /analytics/track-batch
  // If you keep only /analytics/track, update backend as given below.
  return api.post("/analytics/track-batch", { events: batch });
}

// -- Network: Send data when closing the tab (Beacon API) --
function sendBatchBeacon(batch) {
  // This is used when the user leaves the page, because normal requests might get cancelled
  try {
    const payload = JSON.stringify({ events: batch });
    const url =
      (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "") +
      "/analytics/track-batch";

    // Try the modern 'Beacon' way first (background send)
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      return navigator.sendBeacon(url, blob);
    }

    // Fallback: Use 'fetch' with keepalive (keeps request alive even if tab closes)
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// -- Main Logic: Try to send the data to the server --
async function flush({ useBeacon = false } = {}) {
  // If already sending, or offline (and not using Beacon), stop.
  if (flushing) return;
  if (!navigator.onLine && !useBeacon) return;

  // Get a batch of data to send
  const batch = shiftBatch(BATCH_SIZE);
  if (!batch.length) return; // Nothing to send

  flushing = true;

  try {
    // If we are closing the tab, use the Beacon method
    if (useBeacon) {
      const ok = sendBatchBeacon(batch);
      if (!ok) throw new Error("beacon_failed");
      // If it worked, reset the retry timer
      backoffMs = 0;
      return;
    }

    // Normal send
    await sendBatchHTTP(batch);
    backoffMs = 0; // Reset retry timer on success

    // If there is still data left in the queue, try sending again very soon
    if (loadQueue().length) {
      setTimeout(() => flush(), 50);
    }
  } catch (e) {
    // If sending failed:
    // 1. Put the items back at the start of the queue
    unshiftBatch(batch);

    // 2. Increase the wait time (Exponential Backoff: 1.5s -> 3s -> 6s...)
    backoffMs = backoffMs ? Math.min(backoffMs * 2, MAX_BACKOFF_MS) : BASE_BACKOFF_MS;

    // 3. Try again after the wait time
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush(), backoffMs);
  } finally {
    // Mark as finished sending
    flushing = false;
  }
}

// -- Public Function: This is what you call from your React/Vue components --
export function track(event, payload = {}, options = {}) {
  try {
    // Basic validation
    if (!event || typeof event !== "string") return;
    
    // Check if we should ignore this event (throttling)
    if (shouldDrop(event, options)) return;

    const common = getCommonContext();
    
    // Create the full event object
    const item = {
      event,
      payload: payload || {},
      ts: nowISO(), // Timestamp
      ...common,    // Add the user/browser info
    };

    // Save it to the list
    pushQueue(item);

    // If 'force' is true, send immediately (don't wait for batch)
    if (options?.force) {
      flush();
      return;
    }

    // If the queue is getting full (>= 20 items), send now
    if (loadQueue().length >= BATCH_SIZE) flush();
  } catch {
    // If anything errors, suppress it so we don't crash the user's app
  }
}

// -- Automation: Run background tasks --
function startAutoFlush() {
  if (flushTimer) clearTimeout(flushTimer);

  // 1. Send data periodically (every 6 seconds)
  setInterval(() => {
    flush();
  }, FLUSH_INTERVAL_MS);

  // 2. Send immediately if internet comes back online
  window.addEventListener("online", () => flush());

  // 3. Send data if the user hides the tab or closes the browser
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush({ useBeacon: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    flush({ useBeacon: true });
  });
}

// Start the automation immediately
startAutoFlush();