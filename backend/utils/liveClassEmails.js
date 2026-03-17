exports.emailLiveCreated = ({ courseTitle, topic, timeText, joinLink }) => ({
  subject: `New Live Class Scheduled: ${topic}`,
  html: `
    <h3>New Live Class Scheduled</h3>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Time:</b> ${timeText}</p>
    <p style="color: #d9534f; font-weight: bold;">⚠️ IMPORTANT: Please join the class directly from the LMS Website dashboard to ensure your attendance is marked correctly. Do not use the raw Zoom link.</p>
    <p><b>Join via Dashboard:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveReminder10Min = ({ courseTitle, topic, timeText, joinLink }) => ({
  subject: `Starts in 10m: ${topic}`,
  html: `
    <h3>Live Class Starting in 10 Minutes</h3>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Start Time:</b> ${timeText}</p>
    <p style="color: #d9534f; font-weight: bold;">⚠️ ATTENTION: You must join through the LMS Website to get attendance credit for this session.</p>
    <p><b>Join Now:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveRescheduled = ({
  courseTitle,
  topic,
  oldTimeText,
  newTimeText,
  joinLink,
}) => ({
  subject: "Live Class Rescheduled",
  html: `
    <h3>Live Class Rescheduled</h3>
    <p>Your live class schedule has been updated.</p>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Previous Time:</b> ${oldTimeText}</p>
    <p><b>New Time:</b> ${newTimeText}</p>
    <p style="color: #d9534f; font-weight: bold;">⚠️ Reminder: Join through the LMS website only for attendance tracking.</p>
    <p><b>Updated Join Link:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveCancelled = ({ courseTitle, topic, timeText }) => ({
  subject: "Live Class Cancelled",
  html: `
    <h3>Live Class Cancelled</h3>
    <p>The following live class has been cancelled.</p>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Scheduled Time:</b> ${timeText}</p>
    <p>Please check the LMS dashboard for future sessions.</p>
  `,
});

exports.emailLiveRecordingReady = ({ courseTitle, topic, recordingLink }) => ({
  subject: "Live Class Recording Available",
  html: `
    <h3>Live Class Recording Available</h3>
    <p>The recording for your live class is now available.</p>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Watch on Website:</b> <a href="${recordingLink}">${recordingLink}</a></p>
  `,
});