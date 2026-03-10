exports.emailLiveCreated = ({ courseTitle, topic, timeText, joinLink }) => ({
  subject: "New Live Class Scheduled",
  html: `
    <h3>New Live Class Scheduled</h3>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Time:</b> ${timeText}</p>
    <p><b>Join Link:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveReminder10Min = ({ courseTitle, topic, timeText, joinLink }) => ({
  subject: "Live class starting in 10 minutes",
  html: `
    <h3>Live class starting in 10 minutes</h3>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Start Time:</b> ${timeText}</p>
    <p><b>Join now:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveRescheduled = ({ courseTitle, topic, oldTimeText, newTimeText, joinLink,}) => ({
  subject: "Live Class Rescheduled",
  html: `
    <h3>Live Class Rescheduled</h3>
    <p>Your live class schedule has been updated.</p>
    <p><b>Course:</b> ${courseTitle}</p>
    <p><b>Topic:</b> ${topic}</p>
    <p><b>Previous Time:</b> ${oldTimeText}</p>
    <p><b>New Time:</b> ${newTimeText}</p>
    <p><b>Join Link:</b> <a href="${joinLink}">${joinLink}</a></p>
  `,
});

exports.emailLiveCancelled = ({ courseTitle, topic, timeText,}) => ({
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