const axios = require("axios");

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getZoomAccessToken = async () => {
  const now = Date.now();

  if (cachedToken && cachedTokenExpiresAt > now + 60 * 1000) {
    return cachedToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  console.log("Zoom env check:", {
    accountId: accountId ? "SET" : "MISSING",
    clientId: clientId ? "SET" : "MISSING",
    clientSecret: clientSecret ? "SET" : "MISSING",
  });

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Missing Zoom Server-to-Server OAuth environment variables");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

  try {
    const response = await axios.post(url, null, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    cachedToken = response.data.access_token;
    cachedTokenExpiresAt = now + Number(response.data.expires_in || 3600) * 1000;

    console.log("Zoom access token generated successfully");
    return cachedToken;
  } catch (error) {
    console.log("Zoom token error:");
    console.log("Status:", error?.response?.status);
    console.log("Data:", error?.response?.data);
    throw new Error(
      error?.response?.data?.reason ||
        error?.response?.data?.message ||
        error.message ||
        "Failed to generate Zoom access token"
    );
  }
};

const createZoomMeeting = async ({
  topic,
  agenda,
  startAt,
  durationMin,
  password,
}) => {
  const token = await getZoomAccessToken();
  const zoomUserId = process.env.ZOOM_USER_ID || "me";

  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/users/${zoomUserId}/meetings`,
      {
        topic,
        type: 2,
        agenda: agenda || "",
        start_time: new Date(startAt).toISOString(),
        duration: Number(durationMin || 60),
        timezone: "Asia/Kolkata",
        password: password || undefined,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          auto_recording: "cloud",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Zoom meeting created successfully:", response.data?.id);

    return response.data;
  } catch (error) {
    console.log("Zoom create meeting error:");
    console.log("Status:", error?.response?.status);
    console.log("Data:", error?.response?.data);

    throw new Error(
      error?.response?.data?.message ||
        error.message ||
        "Failed to create Zoom meeting"
    );
  }
};

const getPastMeetingParticipants = async (meetingId) => {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/past_meetings/${meetingId}/participants?page_size=300`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data?.participants || [];
  } catch (error) {
    console.log("Zoom participants fetch error:");
    console.log("Status:", error?.response?.status);
    console.log("Data:", error?.response?.data);

    throw new Error(
      error?.response?.data?.message ||
        error.message ||
        "Failed to fetch Zoom meeting participants"
    );
  }
};

const getMeetingRecordings = async (meetingId) => {
  const token = await getZoomAccessToken();

  try {
    const response = await axios.get(
      `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log("Zoom recordings fetch error:");
    console.log("Status:", error?.response?.status);
    console.log("Data:", error?.response?.data);

    return null;
  }
};

module.exports = {
  getZoomAccessToken,
  createZoomMeeting,
  getPastMeetingParticipants,
  getMeetingRecordings
};