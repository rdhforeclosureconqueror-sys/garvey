"use strict";

const fs = require("fs");
const path = require("path");
const { GRADE4_SKILL_PROFILES, buildGrade4QuestionOutline } = require("../youth-development/content/grade4QuestionGeniusMap");

const contentDirectory = path.resolve(__dirname, "../public/gamehub/skill-world/content");

function normalizeSkillId(value) { return String(value || "").trim().toUpperCase(); }

function getGrade4SkillWorldGeniusOutline(skillId) {
  const normalizedSkillId = normalizeSkillId(skillId);
  if (!GRADE4_SKILL_PROFILES[normalizedSkillId]) return null;
  const filePath = path.join(contentDirectory, `${normalizedSkillId}.skill-package.v1.json`);
  if (!fs.existsSync(filePath)) return null;
  const skillPackage = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return buildGrade4QuestionOutline(skillPackage);
}

module.exports = { getGrade4SkillWorldGeniusOutline, normalizeSkillId };
