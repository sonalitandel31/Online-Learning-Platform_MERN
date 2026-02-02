module.exports = [
  {
    key: "FIRST_XP",
    title: "First XP",
    icon: "✨",
    description: "Earn your first XP point",
    scope: "global", 
    condition: ({ student }) => (student.xpTotal || 0) >= 1,
  },
  {
    key: "XP_500",
    title: "XP 500 Club",
    icon: "⭐",
    description: "Reach 500 total XP",
    scope: "global",
    condition: ({ student }) => (student.xpTotal || 0) >= 500,
  },
  {
    key: "STREAK_7",
    title: "7 Day Streak",
    icon: "🔥",
    description: "Maintain a 7-day learning streak",
    scope: "global",
    condition: ({ student }) => (student.streakCount || 0) >= 7,
  },
  {
    key: "COURSE_XP_100",
    title: "Course XP 100",
    icon: "🏁",
    description: "Earn 100 XP in a course",
    scope: "course",
    condition: ({ xpInCourse }) => xpInCourse >= 100,
  },
];
