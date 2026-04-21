"use strict";

function normalizeChildScopeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function extractExplicitChildIdFromRow(row = {}) {
  const raw = row?.raw_answers && typeof row.raw_answers === "object" ? row.raw_answers : {};
  return normalizeChildScopeId(
    raw?.ownership?.child_profile?.child_id
      || raw?.child_id
      || raw?.metadata?.child_id
      || ""
  );
}

function collectChildScopeCandidates(row = {}, deriveLegacyChildScopeId = () => "") {
  const candidates = new Set();
  const persistedChildId = normalizeChildScopeId(row?.child_id || "");
  const explicitChildId = extractExplicitChildIdFromRow(row);
  const legacyChildId = normalizeChildScopeId(deriveLegacyChildScopeId(row) || "");
  if (persistedChildId) candidates.add(persistedChildId);
  if (explicitChildId) candidates.add(explicitChildId);
  if (legacyChildId) candidates.add(legacyChildId);
  return {
    persistedChildId,
    explicitChildId,
    legacyChildId,
    candidateChildIds: [...candidates],
  };
}

function sortRowsNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
}

function selectLatestYouthSubmission({
  rows = [],
  requestedChildId = "",
  deriveLegacyChildScopeId = () => "",
}) {
  const scopedChildId = normalizeChildScopeId(requestedChildId);
  const sortedRows = sortRowsNewestFirst(rows);
  const analyzedRows = sortedRows.map((row) => ({
    row,
    ...collectChildScopeCandidates(row, deriveLegacyChildScopeId),
  }));

  const scopedRows = analyzedRows.filter((entry) => (
    !scopedChildId
      ? true
      : entry.candidateChildIds.includes(scopedChildId)
  ));

  const legacyUnscopedRows = scopedChildId
    ? analyzedRows.filter((entry) => entry.candidateChildIds.length === 0)
    : [];

  let selectedEntries = scopedRows;
  let selectionPath = scopedChildId ? "child_scope_match" : "unscoped_latest";
  let selectionReason = scopedChildId
    ? "Matched requested child scope against persisted/raw/legacy child identifiers."
    : "No child scope requested; selected newest submission globally for tenant/email scope.";

  if (!selectedEntries.length && legacyUnscopedRows.length) {
    selectedEntries = legacyUnscopedRows;
    selectionPath = "legacy_unscoped_fallback";
    selectionReason = "No child-scoped match found; falling back to legacy rows with no child identifiers.";
  }

  const selected = selectedEntries[0] || null;
  return {
    latestRow: selected?.row || null,
    scopedRows: scopedRows.map((entry) => entry.row),
    selectedRows: selectedEntries.map((entry) => entry.row),
    selectionPath,
    selectionReason,
    ordering: "created_at DESC, submission_id DESC",
    candidateSubmissionIds: selectedEntries.map((entry) => Number(entry.row?.id || 0)).filter(Boolean),
  };
}

module.exports = {
  collectChildScopeCandidates,
  selectLatestYouthSubmission,
  sortRowsNewestFirst,
};
