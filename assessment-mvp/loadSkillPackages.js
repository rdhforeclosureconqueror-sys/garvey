const fs = require('fs');
const path = require('path');

const DEFAULT_MANIFEST_PATH = path.join(
  __dirname,
  '..',
  'public',
  'gamehub',
  'skill-world',
  'content',
  'manifest.json',
);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function packageIdOf(pkg) {
  return pkg && (pkg.skill_id || pkg.package_id || pkg.id);
}

function requireSingleFilter(name, value) {
  if (Array.isArray(value) || value === undefined || value === null || value === '') {
    throw new Error(`loadSkillPackages requires exactly one ${name}`);
  }
  return value;
}

function loadSkillPackages(options = {}) {
  const grade = requireSingleFilter('grade', options.grade);
  const subject = requireSingleFilter('subject', options.subject);
  const manifestPath = options.manifestPath || DEFAULT_MANIFEST_PATH;
  const contentDir = options.contentDir || path.dirname(manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.packages)) {
    throw new Error('Skill World manifest must contain a packages array');
  }

  const manifestEntries = [...manifest.packages].sort((a, b) => String(a).localeCompare(String(b)));
  const seenIds = new Set();
  const packages = [];

  for (const entry of manifestEntries) {
    if (typeof entry !== 'string' || entry.includes('..') || path.isAbsolute(entry)) {
      throw new Error(`Invalid manifest package entry: ${entry}`);
    }
    const filePath = path.join(contentDir, entry);
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const packageId = packageIdOf(pkg);
    if (!packageId) throw new Error(`Manifest package ${entry} is missing a package ID`);
    if (seenIds.has(packageId)) throw new Error(`Duplicate package ID: ${packageId}`);
    seenIds.add(packageId);
    if (Number(pkg.grade) === Number(grade) && pkg.subject === subject) {
      Object.defineProperty(pkg, '__sourceFile', { value: entry, enumerable: false });
      packages.push(deepFreeze(pkg));
    }
  }

  return packages.sort((a, b) => packageIdOf(a).localeCompare(packageIdOf(b)));
}

module.exports = { loadSkillPackages, packageIdOf, DEFAULT_MANIFEST_PATH };
