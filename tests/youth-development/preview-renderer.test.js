const test = require('node:test');
const assert = require('node:assert/strict');

const { buildYouthDevelopmentResult } = require('../../youth-development/measurement/resultBuilder');
const { buildYouthDevelopmentDashboard } = require('../../youth-development/measurement/dashboardBuilder');
const { buildParentDashboardPageModel } = require('../../youth-development/presentation/parentDashboardPageModel');
const { PREVIEW_AGGREGATED_ROWS } = require('../../server/youthDevelopmentRoutes');
const { renderYouthDevelopmentParentDashboardPage } = require('../../server/youthDevelopmentRenderer');

function buildPreviewPageModel(rows = PREVIEW_AGGREGATED_ROWS) {
  const result = buildYouthDevelopmentResult(rows, {
    generatedAt: '2026-01-01T00:00:00.000Z',
    evidenceSummary: {
      sources_used: ['child_task', 'teacher_observation', 'assessor_observation'],
      confidence_caveats: ['Preview fixture only: this output is for renderer verification, not production interpretation.'],
    },
    environmentNotes: ['Preview fixture note: this page is test-only and uses deterministic sample rows.'],
  });
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  return buildParentDashboardPageModel(dashboard, {
    page_title: 'Youth Development Parent Dashboard (Preview)',
    page_subtitle: 'Preview / test-only rendering from deterministic fixture data.',
    maxItems: 5,
  });
}

test('renderer output includes hero summary, trait cards, and all required sections for preview fixture', () => {
  const pageModel = buildPreviewPageModel();
  const html = renderYouthDevelopmentParentDashboardPage(pageModel, {
    previewLabel: 'Preview / test-only output (deterministic fixture, no production data)',
  });

  assert.match(html, /<h1>Youth Development Parent Dashboard \(Preview\)<\/h1>/);
  assert.match(html, /<h2>Overview<\/h2>/);
  assert.match(html, /<h2>Trait signals<\/h2>/);
  assert.match(html, /<table>/);
  assert.match(html, /<h2>Current strengths<\/h2>/);
  assert.match(html, /<h2>Support next<\/h2>/);
  assert.match(html, /<h2>Evidence and confidence<\/h2>/);
  assert.match(html, /<h2>Next actions<\/h2>/);
  assert.match(html, /What this means:/);
  assert.match(html, /If ignored:/);
  assert.match(html, /Progress:/);
});

test('preview fixture low-confidence handling is rendered when low-confidence rows exist', () => {
  const pageModel = buildPreviewPageModel();
  const html = renderYouthDevelopmentParentDashboardPage(pageModel);

  assert.match(html, /Confidence notice:/);
  assert.match(html, /Interpret cautiously due to low confidence\./);
  assert.match(html, /Where more evidence is needed: gather repeated observations across settings\./);
});

test('renderer safely escapes raw strings and supports empty-state rendering for reduced fixture rows', () => {
  const reducedPageModel = buildPreviewPageModel([]);
  const reducedHtml = renderYouthDevelopmentParentDashboardPage(reducedPageModel);

  assert.match(reducedHtml, /No high-priority traits are flagged right now\./);
  assert.match(reducedHtml, /Trait cards are not available yet\./);
  assert.match(reducedHtml, /No strengths are currently ranked\./);
  assert.match(reducedHtml, /Support recommendations are currently empty\./);

  const dangerousPageModel = {
    page_title: 'Unsafe <script>alert("x")</script>',
    page_subtitle: 'subtitle',
    hero_summary: {
      section_title: 'Overview',
      overview_text: 'Use <img src=x onerror=alert(1)> with care',
      high_priority_traits: [
        { trait_label: 'Trait <b>Bold</b>', priority_level: 'build_next<script>' },
      ],
      empty_state: '',
      confidence_notice: '',
    },
    trait_cards: { section_title: 'Trait signals', cards: [], empty_state: 'none' },
    strengths: { title: 'Current strengths', items: [], empty_state: 'none' },
    support: { title: 'Support next', items: [], empty_state: 'none' },
    evidence: { title: 'Evidence and confidence', sources_used: [], confidence_caveats: [], low_confidence_flags: [], empty_state: 'none' },
    action: { title: 'Next actions', top_development_levers: [], next_step_prompts: [], environment_notes: [], empty_state: 'none' },
  };

  const dangerousHtml = renderYouthDevelopmentParentDashboardPage(dangerousPageModel);
  assert.ok(!dangerousHtml.includes('<script>alert("x")</script>'));
  assert.ok(!dangerousHtml.includes('<img src=x onerror=alert(1)>'));
  assert.match(dangerousHtml, /Unsafe &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(dangerousHtml, /Use &lt;img src=x onerror=alert\(1\)&gt; with care/);
});
