(() => {
  document.documentElement.setAttribute("data-gates-shell", "foundation");

  window.GatesChildRenderer = {
    renderEmptyState() {
      return '<section class="gates-empty-state"><p>No child profiles yet.</p></section>';
    },
    renderChildCard(child = {}) {
      const name = String(child.child_name || "Unnamed Child");
      const age = String(child.child_age_band || "");
      const grade = String(child.child_grade_band || "");
      return `<article class="gates-child-card"><h3>${name}</h3><p>${age}</p><p>${grade}</p></article>`;
    },
    renderChildList(children = []) {
      if (!Array.isArray(children) || children.length === 0) return this.renderEmptyState();
      return `<section class="gates-child-list">${children.map((child) => this.renderChildCard(child)).join("")}</section>`;
    },
    renderAssessmentIntro(data = {}) {
      const title = String(data.title || "");
      const instructions = String(data.instructions || "");
      return `<section class="gates-assessment-intro"><h2>${title}</h2><p>${instructions}</p></section>`;
    },
    renderAssessmentQuestionListShell(questions = []) {
      const count = Array.isArray(questions) ? questions.length : 0;
      return `<section class="gates-assessment-question-shell" data-question-count="${count}"></section>`;
    },
    renderAssessmentDisclaimer(disclaimer = "") {
      return `<aside class="gates-assessment-disclaimer"><p>${String(disclaimer || "")}</p></aside>`;
    },
    renderResultsShell() {
      return '<section class="gates-results-shell"><div data-gates-profile-summary></div><div data-gates-map-shell></div></section>';
    },
    renderGatesProfileSummary(profile = {}) {
      return `<section class="gates-profile-summary"><p>${String(profile.summary || "")}</p></section>`;
    },
    renderGatesMapShell(gateMap = []) {
      const count = Array.isArray(gateMap) ? gateMap.length : 0;
      return `<section class="gates-map-shell" data-gates-count="${count}"></section>`;
    },
    renderRecommendationsEmptyState() {
      return '<section class="gates-recommendations-empty"><p>No recommendations available yet.</p></section>';
    },
    renderRecommendationCard(recommendation = {}) {
      return `<article class="gates-recommendation-card" data-gate-key="${String(recommendation.gate_key || "")}"><h4>${String(recommendation.title || "")}</h4><p>${String(recommendation.description || "")}</p></article>`;
    },
    renderRecommendationsListShell(recommendations = []) {
      if (!Array.isArray(recommendations) || recommendations.length === 0) return this.renderRecommendationsEmptyState();
      return `<section class="gates-recommendations-shell">${recommendations.map((r) => this.renderRecommendationCard(r)).join("")}</section>`;
    },
  };
})();
