const mongoose = require("mongoose");
const studentModel = require("../models/studentModel");
const badgeRules = require("./badgeRules");

exports.autoAwardBadges = async ({ studentId, courseId = null }) => {
  const sid = new mongoose.Types.ObjectId(studentId);
  const cid = courseId && mongoose.Types.ObjectId.isValid(courseId)
    ? new mongoose.Types.ObjectId(courseId)
    : null;

  const student = await studentModel.findById(sid).select("xpTotal xpByCourse streakCount badges");
  if (!student) return { awarded: [], checked: 0 };

  const badges = student.badges || [];
  const hasBadge = (key, courseScopeId) =>
    badges.some((b) => b.key === key && String(b.course || "") === String(courseScopeId || ""));

  // compute xpInCourse for course badges
  let xpInCourse = 0;
  if (cid) {
    const row = (student.xpByCourse || []).find((x) => String(x.course) === String(cid));
    xpInCourse = Number(row?.xp || 0);
  }

  const awarded = [];

  for (const rule of badgeRules) {
    const isCourseRule = rule.scope === "course";
    const scopeCourseId = isCourseRule ? cid : null;

    // skip course rules if courseId not provided
    if (isCourseRule && !cid) continue;

    // already has badge?
    if (hasBadge(rule.key, scopeCourseId)) continue;

    // condition match?
    const ok = rule.condition({ student, xpInCourse, courseId: cid });
    if (!ok) continue;

    student.badges.push({
      key: rule.key,
      title: rule.title,
      icon: rule.icon,
      description: rule.description,
      course: scopeCourseId,
      earnedAt: new Date(),
    });

    awarded.push(rule.key);
  }

  if (awarded.length) await student.save();

  return { awarded, checked: badgeRules.length };
};
