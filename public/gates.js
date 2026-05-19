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
  };
})();
