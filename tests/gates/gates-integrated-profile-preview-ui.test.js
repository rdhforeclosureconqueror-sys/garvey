const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const jsPath = path.join(__dirname, '..', '..', 'public', 'gates.js');

test('integrated profile preview renders with gates-only fallback copy and no flow regressions', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /api\(`\/api\/gates\/children\/\$\{childId\}\/integrated-profile`/);
  assert.match(js, /Emerging Identity \+ Gates Insight/);
  assert.match(js, /Development Journey/);
  assert.match(js, /Gates-only integration signals/);
  assert.match(js, /emerging strengths, current tendencies, developmental supports, and family practices/);
  assert.match(js, /return renderLanding\(\)/);
  assert.match(js, /nav\(result\.next_route \|\| `\/gates\/results\/\$\{result\.assessment_id\}`\)/);
});

test('integrated profile preview supports partial integrated data fields', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /section\('Emerging strengths', emergingStrengths\)/);
  assert.match(js, /section\('Current tendencies', currentTendencies\)/);
  assert.match(js, /section\('Developmental supports', developmentalSupports\)/);
  assert.match(js, /section\('Family practices', familyPractices\)/);
  assert.match(js, /section\('Integration signals', integrationSignals\)/);
  assert.match(js, /Identity: \$\{hasIdentitySignals \? 'Present' : 'Not present'\}/);
  assert.match(js, /Developmental Signals: \$\{hasDevelopmentalSignals \? 'Present' : 'Not present'\}/);
});
