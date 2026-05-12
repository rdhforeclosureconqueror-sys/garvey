"use strict";

const DEFAULT_PUBLISHER = "SimbaWaUjamaa.com";

function normalizeLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canonicalHeadingPattern(title) {
  const normalizedTitle = escapeRegExp(normalizeLine(title));
  return new RegExp(`^${normalizedTitle}$`, "i");
}

function isRawMarkerLine(line) {
  const normalized = normalizeLine(line);
  return /^(chapter|epilogue)\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)?\s*$/i.test(normalized)
    || /^#{1,6}\s*(chapter|epilogue)\b/i.test(normalized)
    || /^\[(chapter|epilogue)[^\]]*\]$/i.test(normalized)
    || /^---\s*(chapter|epilogue)\b.*---$/i.test(normalized);
}

function sanitizeSectionBody(body, canonicalTitle) {
  const headingPattern = canonicalHeadingPattern(canonicalTitle);
  return String(body || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => {
      const normalized = normalizeLine(line);
      if (!normalized) return true;
      if (headingPattern.test(normalized)) return false;
      if (isRawMarkerLine(normalized)) return false;
      return true;
    })
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/g, "");
}

function bodyToBlocks(body) {
  const lines = String(body || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push(paragraph.join(" "));
      paragraph = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    if (/^•\s*•\s*•$/.test(trimmed) || /^\*\s*\*\s*\*$/.test(trimmed)) {
      flushParagraph();
      blocks.push("• • •");
      continue;
    }
    if (/^(?:[-*•])\s+/.test(trimmed)) {
      flushParagraph();
      blocks.push(trimmed.replace(/^(?:[-*•])\s+/, "• "));
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

function chunkBodyBlocks(blocks, maxBodyBlocksPerPage) {
  const chunks = [];
  for (let index = 0; index < blocks.length; index += maxBodyBlocksPerPage) {
    chunks.push(blocks.slice(index, index + maxBodyBlocksPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function buildTocPage(sections, firstPageNumbers) {
  return {
    type: "toc",
    text: ["Contents", "", ...sections.map((section, index) => `${section.title} ${firstPageNumbers[index]}`)].join("\n"),
  };
}

function renderPrintInterior(manuscript, options = {}) {
  const sections = Array.isArray(manuscript?.sections) ? manuscript.sections : [];
  const maxBodyBlocksPerPage = Math.max(1, Number(options.maxBodyBlocksPerPage || 28));
  const metadata = {
    ...(manuscript?.metadata || {}),
    publisher: DEFAULT_PUBLISHER,
  };

  const preparedSections = sections.map((section) => {
    const title = normalizeLine(section.title);
    const sanitizedBody = sanitizeSectionBody(section.body, title);
    const bodyPages = chunkBodyBlocks(bodyToBlocks(sanitizedBody), maxBodyBlocksPerPage);
    return {
      ...section,
      title,
      sanitizedBody,
      bodyPages,
    };
  });

  let nextPageNumber = 2;
  const firstPageNumbers = preparedSections.map((section) => {
    const pageNumber = nextPageNumber;
    nextPageNumber += section.bodyPages.length;
    return pageNumber;
  });

  const pages = [buildTocPage(preparedSections, firstPageNumbers)];

  preparedSections.forEach((section, sectionIndex) => {
    section.bodyPages.forEach((blocks, pageIndexInSection) => {
      const isOpeningPage = pageIndexInSection === 0;
      const pageLines = [];
      if (!isOpeningPage) {
        pageLines.push(section.title, "");
      }
      if (isOpeningPage) {
        pageLines.push(section.title, "");
      }
      pageLines.push(...blocks);
      pages.push({
        type: "body",
        sectionTitle: section.title,
        sectionIndex,
        pageIndexInSection,
        isOpeningPage,
        runningHeader: isOpeningPage ? "" : section.title,
        text: pageLines.join("\n"),
      });
    });
  });

  return {
    metadata,
    pages,
    toc: preparedSections.map((section, index) => ({ title: section.title, pageNumber: firstPageNumbers[index] })),
  };
}

module.exports = {
  DEFAULT_PUBLISHER,
  sanitizeSectionBody,
  renderPrintInterior,
};
