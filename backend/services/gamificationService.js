const mongoose = require("mongoose");
const studentModel = require("../models/studentModel");
const XpTransaction = require("../models/xpTransactionModel");
const { autoAwardBadges } = require("./badgeService");

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isYesterday(lastDate, now) {
  const a = startOfDay(lastDate).getTime();
  const b = startOfDay(now).getTime();
  return b - a === 24 * 60 * 60 * 1000;
}

// ✅ This is what you already import:
// const { awardXpOnce } = require("../services/gamificationService");
exports.awardXpOnce = async ({ studentId, courseId, event, refId, xp, meta = {} }) => {
  if (!studentId || !courseId || !event || !refId || !xp) {
    return { awarded: false, reason: "missing_params" };
  }

  const sid = new mongoose.Types.ObjectId(studentId);
  const cid = new mongoose.Types.ObjectId(courseId);
  const rid = new mongoose.Types.ObjectId(refId);

  // 1) create transaction (unique index prevents duplicates)
  let txn;
  try {
    txn = await XpTransaction.create({
      student: sid,
      course: cid,
      event,
      refId: rid,
      xp,
      meta,
    });
  } catch (err) {
    // duplicate key => already awarded
    if (err?.code === 11000) {
      return { awarded: false, reason: "already_awarded" };
    }
    throw err;
  }

  // 2) update student totals + course XP + streak
  const now = new Date();
  const student = await studentModel.findById(sid).select("xpTotal xpByCourse streakCount lastStreakDate");

  if (!student) {
    // rollback txn (optional but safe)
    await XpTransaction.deleteOne({ _id: txn._id });
    return { awarded: false, reason: "student_not_found" };
  }

  // streak logic (only when XP awarded)
  let newStreak = student.streakCount || 0;
  if (!student.lastStreakDate) {
    newStreak = 1;
  } else if (isSameDay(student.lastStreakDate, now)) {
    newStreak = student.streakCount || 1;
  } else if (isYesterday(student.lastStreakDate, now)) {
    newStreak = (student.streakCount || 0) + 1;
  } else {
    newStreak = 1;
  }

  // xpByCourse update
  const courseRow = student.xpByCourse.find((x) => x.course.toString() === cid.toString());
  if (courseRow) {
    courseRow.xp += xp;
  } else {
    student.xpByCourse.push({ course: cid, xp });
  }

  student.xpTotal += xp;
  student.streakCount = newStreak;
  student.lastStreakDate = now;

  await student.save();

  await autoAwardBadges({ studentId: student._id, courseId });

  return {
    awarded: true,
    xp,
    event,
    transactionId: txn._id,
    xpTotal: student.xpTotal,
    streakCount: student.streakCount,
  };
};
