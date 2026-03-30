const MANIFEST_URL = "/archetypes/cards-manifest.json";

function safeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function byValueDesc(a, b) {
  return Number(b[1] || 0) - Number(a[1] || 0);
}

function qs(name) {
  const params = new URLSearchParams(window.location.search || "");
  return String(params.get(name) || "").trim();
}

function makeDataUriSvg(svg) {
  if (!svg) return "";
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pickVariant(card, seed) {
  if (!(card?.image_male && card?.image_female)) return null;
  if (!seed) return Math.random() < 0.5 ? card.image_male : card.image_female;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 2 === 0) ? card.image_male : card.image_female;
}

function resolveCardImage(card) {
  const seed = qs("email") || qs("name") || "";
  const variant = pickVariant(card, seed);
  return variant || card?.image || makeDataUriSvg(card?.svg);
}

const ArchetypeCards = {
  _manifestPromise: null,
  _stylesInjected: false,

  async _loadManifest() {
    if (!this._manifestPromise) {
      this._manifestPromise = fetch(MANIFEST_URL)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load archetype card manifest");
          return res.json();
        })
        .then((json) => json && json.cards ? json : { cards: {} });
    }
    return this._manifestPromise;
  },

  top3FromObject(obj) {
    return Object.entries(obj || {})
      .map(([id, value]) => [safeId(id), Number(value || 0)])
      .filter(([id, value]) => id && Number.isFinite(value))
      .sort(byValueDesc)
      .slice(0, 3)
      .map(([id]) => id);
  },

  async renderTop3(container, ids) {
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;

    const manifest = await this._loadManifest();
    this._injectStyles();

    const normalized = Array.from(new Set((ids || []).map(safeId).filter(Boolean))).slice(0, 3);
    const cards = normalized
      .map((id) => manifest.cards[id])
      .filter(Boolean);

    if (!cards.length) {
      el.innerHTML = "";
      return;
    }

    el.innerHTML = `
      <div class="archetype-top3-grid">
        ${cards.map((card) => `
          <button type="button" class="archetype-card-btn" data-archetype-id="${card.id}">
            <div class="archetype-card-media"><img src="${resolveCardImage(card)}" alt="${card.name || card.id}" loading="lazy"></div>
            <div class="archetype-card-name">${card.name || card.id}</div>
            <div class="archetype-card-meta">${card.category || "Archetype"}</div>
            <div class="archetype-card-summary">${card.summary || ""}</div>
          </button>
        `).join("")}
      </div>
    `;

    el.querySelectorAll(".archetype-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.openCard(btn.dataset.archetypeId || ""));
    });
  },

  async openCard(id) {
    const manifest = await this._loadManifest();
    this._injectStyles();

    const card = manifest.cards[safeId(id)];
    if (!card) return;

    const existing = document.getElementById("archetypeCardModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "archetypeCardModal";
    modal.className = "archetype-modal-backdrop";
    modal.innerHTML = `
      <div class="archetype-modal" role="dialog" aria-modal="true" aria-label="${card.name}">
        <button type="button" class="archetype-modal-close" aria-label="Close">×</button>
        <div class="archetype-modal-media"><img src="${resolveCardImage(card)}" alt="${card.name || card.id}"></div>
        <h3>${card.name || card.id}</h3>
        <p class="archetype-modal-category">${card.category || "Archetype"}</p>
        <p>${card.summary || ""}</p>
        <ul>
          ${(card.details || []).map((line) => `<li>${line}</li>`).join("")}
        </ul>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector(".archetype-modal-close")?.addEventListener("click", close);
  },

  bindPageCardPopup() {
    const id = document.body?.dataset?.pageArchetype;
    if (!id) return;

    this._injectStyles();

    document.body.style.cursor = "pointer";
    document.body.addEventListener("dblclick", () => {
      this.openCard(id);
    }, { once: true });
  },

  _injectStyles() {
    if (this._stylesInjected || !document.head) return;
    const style = document.createElement("style");
    style.textContent = `
      .archetype-top3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:10px 0 16px;}
      .archetype-card-btn{background:#0b1222;border:1px solid #334155;border-radius:12px;padding:10px;color:#e2e8f0;text-align:left;cursor:pointer}
      .archetype-card-btn:hover{border-color:#64748b;transform:translateY(-1px)}
      .archetype-card-media svg,.archetype-card-media img{width:100%;height:auto;display:block;border-radius:8px}
      .archetype-card-name{font-weight:700;margin-top:8px}
      .archetype-card-meta{font-size:12px;color:#94a3b8}
      .archetype-card-summary{font-size:13px;color:#cbd5e1;margin-top:6px}
      .archetype-modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
      .archetype-modal{max-width:560px;width:min(100%,560px);background:#0f172a;border:1px solid #334155;border-radius:14px;padding:16px;position:relative;color:#e2e8f0}
      .archetype-modal-close{position:absolute;right:10px;top:8px;background:transparent;border:0;color:#cbd5e1;font-size:24px;cursor:pointer}
      .archetype-modal-media svg,.archetype-modal-media img{width:100%;display:block;border-radius:10px;margin-bottom:10px}
      .archetype-modal-category{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8}
    `;
    document.head.appendChild(style);
    this._stylesInjected = true;
  }
};

window.ArchetypeCards = ArchetypeCards;

export { ArchetypeCards };
export default ArchetypeCards;
