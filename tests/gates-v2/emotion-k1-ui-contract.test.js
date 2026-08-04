'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EmotionK1ExperienceAdapter, SAFE_PROJECTION_KEYS } = require('../../gates-v2/ui/emotionK1ExperienceAdapter');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const start = () => { const adapter = new EmotionK1ExperienceAdapter({ id: () => 'experience-test' }); const result = adapter.startExperience(); return { adapter, id: result.session_id, result }; };
const advance = (adapter, id, option_id) => adapter.submitAction(id, option_id ? { option_id } : {});

test('experience starts through the existing reducer and exposes only child-safe projection keys', () => {
  const { result } = start();
  assert.equal(result.ok, true);
  assert.equal(result.projection.current_node.node_id, 'opening');
  assert.deepEqual(Object.keys(result.projection).filter((key) => key !== 'experience_notice').sort(), [...SAFE_PROJECTION_KEYS].filter((key) => key !== 'gate_title' || result.projection.gate_title).sort());
  const serialized = JSON.stringify(result);
  for (const hidden of ['authoring_tags', 'effect_refs', 'source_provenance', 'approvals', 'parent_summary_template', 'hidden branches', 'assessment']) assert.equal(serialized.includes(hidden), false);
});

test('invalid actions fail safely without moving the session', () => {
  const { adapter, id } = start();
  const failed = adapter.submitAction(id, { type: 'SELECT_CHOICE', option_id: 'hidden-option' });
  assert.equal(failed.ok, false);
  assert.equal(adapter.getCurrentProjection(id).projection.current_node.node_id, 'opening');
});

test('every first action, healthy follow-up, repair, reflection, skip, completion, and replay path uses reducer transitions', () => {
  for (const first of ['ask_accident', 'ask_space', 'push_blocks']) {
    for (const follow of first === 'push_blocks' ? ['name_and_fix', 'ask_adult'] : ['rebuild_together', 'adult_help']) {
      for (const reflection of ['feeling', 'body', 'pause', 'skip']) {
        const { adapter, id } = start();
        advance(adapter, id); advance(adapter, id, 'mad'); advance(adapter, id, 'hot_face'); advance(adapter, id, 'breath_done');
        let result = advance(adapter, id, first);
        assert.equal(result.projection.current_node.node_id, first === 'ask_accident' ? 'ask_result' : first === 'ask_space' ? 'space_result' : 'push_result');
        result = advance(adapter, id);
        assert.equal(result.projection.current_node.node_id, first === 'push_blocks' ? 'repair_choice' : 'healthy_followup');
        result = advance(adapter, id, follow);
        if (first === 'push_blocks') { assert.equal(result.projection.current_node.node_id, 'repair_result'); result = advance(adapter, id); }
        assert.equal(result.projection.current_node.node_id, 'reflection');
        result = advance(adapter, id, reflection);
        assert.equal(result.completed, true);
        assert.equal(result.projection.current_node.node_id, 'complete');
        result = adapter.replay(id);
        assert.equal(result.projection.current_node.node_id, 'first_action');
      }
    }
  }
});

test('replay respects reducer limit and preserves in-memory path history', () => {
  const { adapter, id } = start();
  const finish = (choice) => { if (adapter.getCurrentProjection(id).projection.current_node.node_id !== 'first_action') { advance(adapter,id); advance(adapter,id,'sad'); advance(adapter,id,'tight_hands'); advance(adapter,id,'breath_done'); } advance(adapter,id,choice); advance(adapter,id); advance(adapter,id,choice === 'push_blocks' ? 'name_and_fix' : 'adult_help'); if (choice === 'push_blocks') advance(adapter,id); advance(adapter,id,'pause'); };
  finish('ask_space'); assert.equal(adapter.replay(id).ok, true);
  finish('ask_accident'); assert.equal(adapter.replay(id).ok, true);
  finish('push_blocks'); assert.equal(adapter.replay(id).ok, true);
  finish('ask_space'); const blocked = adapter.replay(id);
  assert.equal(blocked.ok, false); assert.equal(blocked.code, 'REPLAY_LIMIT_REACHED');
  assert.equal(adapter.exit(id).summary.paths_explored, 3); assert.equal(adapter.exit(id).summary.repair_practiced, true);
});

test('child language, semantic controls, accessibility, motion, and responsive contracts are present', () => {
  const html = read('public/gates-v2-child/emotion-k1.html');
  const css = read('public/gates-v2-child/emotion-k1.css');
  const js = read('public/gates-v2-child/emotion-k1.js');
  assert.match(html, /<main/); assert.match(html, /<h2/); assert.match(js, /<h1>/); assert.match(js, /<button/); assert.match(html, /aria-live="polite"/); assert.match(html, /aria-pressed/);
  assert.match(css, /min-height:48px/); assert.match(css, /focus-visible/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /min-width:320px/); assert.match(css, /@media \(max-width:700px\)/); assert.match(css, /100dvh/);
  const all = `${html}\n${css}\n${js}`.toLowerCase();
  for (const prohibited of ['wrong answer', 'failed response', 'bad choice', 'weak gate', 'mastered', 'diagnosis', 'leaderboard', 'countdown']) assert.equal(all.includes(prohibited), false);
  assert.match(js, /speechSynthesis/); assert.match(html, /Calm view/); assert.match(html, /Exit to Parent/);
});

test('child assets are linked only from the Gates profile integration', () => {
  assert.equal(read('public/index.html').includes('gates-v2-child'), false);
  assert.equal(read('public/gates.html').includes('gates-v2-child'), false);
  assert.match(read('public/gates.js'), /Begin the Emotion Gate Adventure/);
});
