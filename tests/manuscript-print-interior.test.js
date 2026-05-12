const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PUBLISHER,
  sanitizeSectionBody,
  renderPrintInterior,
} = require('../server/manuscriptPrintInteriorRenderer');

const CHAPTER_ONE = 'Chapter One: Who Really Freed the Slaves?';
const CHAPTER_TWO = 'Chapter Two: When Did the War Become Black?';
const EPILOGUE = 'Epilogue';

function countOccurrences(text, needle) {
  return (String(text).match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

function sampleManuscript() {
  return {
    metadata: {
      title: 'Sample Print Interior',
      publisher: 'Wrong Publisher',
    },
    sections: [
      {
        title: CHAPTER_ONE,
        body: [
          'Chapter One',
          CHAPTER_ONE,
          '',
          'Opening',
          '',
          '“If I could save the Union without freeing any slave, I would do it.”',
          'A sentence with an em dash—and ellipses… plus an apostrophe’s curve.',
          '- First bullet remains separate',
          '- Second bullet remains separate',
          '* * *',
          'Continuation paragraph one.',
          'Continuation paragraph two.',
        ].join('\n'),
      },
      {
        title: CHAPTER_TWO,
        body: [
          CHAPTER_TWO,
          '',
          'Opening',
          'Chapter Two',
          'Continuation for chapter two.',
        ].join('\n'),
      },
      {
        title: EPILOGUE,
        body: [
          '[Epilogue]',
          EPILOGUE,
          '',
          'Opening',
          'Final reflection.',
        ].join('\n'),
      },
    ],
  };
}

test('sanitizes raw marker lines and duplicate canonical headings from section bodies', () => {
  const body = sanitizeSectionBody(['Chapter One', CHAPTER_ONE, '', 'Opening'].join('\n'), CHAPTER_ONE);

  assert.equal(body, 'Opening');
});

test('Chapter One opening page has renderer heading exactly once before Opening', () => {
  const rendered = renderPrintInterior(sampleManuscript(), { maxBodyBlocksPerPage: 4 });
  const chapterOneOpening = rendered.pages.find((page) => page.sectionTitle === CHAPTER_ONE && page.isOpeningPage);
  const beforeOpening = chapterOneOpening.text.slice(0, chapterOneOpening.text.indexOf('Opening'));

  assert.equal(countOccurrences(beforeOpening, CHAPTER_ONE), 1);
  assert.equal(countOccurrences(chapterOneOpening.text, CHAPTER_ONE), 1);
});

test('running header appears on continuation pages only, not chapter-opening pages', () => {
  const rendered = renderPrintInterior(sampleManuscript(), { maxBodyBlocksPerPage: 3 });
  const bodyPages = rendered.pages.filter((page) => page.type === 'body');

  assert.equal(bodyPages.filter((page) => page.isOpeningPage).every((page) => page.runningHeader === ''), true);

  const continuationPage = bodyPages.find((page) => page.sectionTitle === CHAPTER_ONE && !page.isOpeningPage);
  assert.ok(continuationPage);
  assert.equal(continuationPage.runningHeader, CHAPTER_ONE);
  assert.equal(continuationPage.text.startsWith(`${CHAPTER_ONE}\n\n`), true);
});

test('print interior keeps publisher, TOC, Unicode punctuation, bullets, and dividers', () => {
  const rendered = renderPrintInterior(sampleManuscript(), { maxBodyBlocksPerPage: 20 });

  assert.equal(rendered.metadata.publisher, DEFAULT_PUBLISHER);
  assert.deepEqual(rendered.toc.map((entry) => entry.title), [CHAPTER_ONE, CHAPTER_TWO, EPILOGUE]);
  assert.equal(rendered.toc.every((entry) => Number.isInteger(entry.pageNumber)), true);

  const allText = rendered.pages.map((page) => page.text).join('\n');
  assert.match(allText, /“If I could save the Union without freeing any slave, I would do it.”/);
  assert.match(allText, /em dash—and ellipses… plus an apostrophe’s curve/);
  assert.match(allText, /• First bullet remains separate\n• Second bullet remains separate/);
  assert.match(allText, /• • •/);
});
