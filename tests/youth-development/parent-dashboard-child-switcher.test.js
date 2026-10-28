const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboard = fs.readFileSync('server/youthDevelopmentRoutes.js', 'utf8');

test('parent dashboard requires an explicit child choice when a family has multiple children', () => {
  assert.match(dashboard, /id="childSwitcherPanel"/);
  assert.match(dashboard, /function renderChildSwitcher\(children, selectedChildId\)/);
  assert.match(dashboard, /data-child-dashboard-id/);
  assert.match(dashboard, /child_selection_required/);
  assert.match(dashboard, /Choose a child above to view that child’s Genius snapshot, parent guidance, and adaptive-learning history/);
  assert.doesNotMatch(dashboard, /multi_child_latest_fallback/);
});

test('a child switch keeps Genius and adaptive learning in the same child scope', () => {
  assert.match(dashboard, /function dashboardUrlForChild\(childId\)/);
  assert.match(dashboard, /url\.searchParams\.set\('child_id', String\(childId \|\| ''\)\)/);
  assert.match(dashboard, /window\.location\.assign\(dashboardUrlForChild\(childId\)\)/);
  assert.match(dashboard, /Each child has a separate Genius snapshot, parent guidance, and adaptive-learning history/);
});

test('parent dashboard uses one focused Genius insight and hides developer-facing learning details', () => {
  assert.match(dashboard, /function selectedGeniusCode\(\)/);
  assert.match(dashboard, /data-genius-nav="previous"/);
  assert.match(dashboard, /data-genius-nav="next"/);
  assert.match(dashboard, /function parentFriendlyLearningArea\(value\)/);
  assert.match(dashboard, /function parentFriendlyActivity\(eventType\)/);
  assert.match(dashboard, /developer-diagnostics/);
  assert.doesNotMatch(dashboard, /Profile ID ' \+ esc\(summary\.child_id/);
});
