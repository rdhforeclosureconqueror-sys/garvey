// FILE: public/garvey-kanban.js
export async function ensureBoard(tenant) {
  const r = await fetch("/api/kanban/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant })
  });
  return r.json();
}

export async function getBoard(tenant) {
  const r = await fetch(`/api/kanban/board?tenant=${encodeURIComponent(tenant)}`);
  return r.json();
}

export async function getCards(tenant, phase) {
  const r = await fetch(`/api/kanban/cards?tenant=${encodeURIComponent(tenant)}&phase=${encodeURIComponent(phase)}`);
  return r.json();
}

export async function createCard({ tenant, phase, column_id, title, description }) {
  const r = await fetch("/api/kanban/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant, phase, column_id, title, description })
  });
  return r.json();
}

export async function moveCard(id, to_column_id) {
  const r = await fetch(`/api/kanban/cards/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_column_id })
  });
  return r.json();
}

export function renderKanban({ mount, tenant, phase, columns, cards, onCreate, onMove }) {
  mount.innerHTML = "";

  const cols = columns.filter(c => c.phase === phase).sort((a,b) => a.position - b.position);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols.length}, 1fr)`;
  grid.style.gap = "10px";

  for (const col of cols) {
    const colEl = document.createElement("div");
    colEl.className = "card";
    colEl.innerHTML = `<h3>${col.name}</h3><div class="muted">Phase ${phase}</div>`;

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";
    list.style.marginTop = "10px";

    const myCards = cards.filter(c => c.column_id === col.id).sort((a,b) => a.position - b.position);
    for (const card of myCards) {
      const item = document.createElement("div");
      item.style.border = "1px solid #334155";
      item.style.borderRadius = "10px";
      item.style.padding = "10px";
      item.style.background = "#0b1020";
      item.innerHTML = `
        <div style="font-weight:800">${card.title}</div>
        <div class="muted">${card.description || ""}</div>
        <div class="row" style="margin-top:8px">
          ${cols.filter(c => c.id !== col.id).map(c =>
            `<button class="btn" data-move="${card.id}" data-to="${c.id}" style="padding:6px 8px">${c.name}</button>`
          ).join("")}
        </div>
      `;
      list.appendChild(item);
    }

    const form = document.createElement("div");
    form.style.marginTop = "10px";
    form.innerHTML = `
      <div class="muted">Add card</div>
      <input placeholder="Title" style="width:100%; margin-top:6px; padding:10px; border-radius:10px; border:1px solid #334155; background:#0b1020; color:#e5e7eb" />
      <textarea placeholder="Description" style="width:100%; margin-top:6px; padding:10px; border-radius:10px; border:1px solid #334155; background:#0b1020; color:#e5e7eb"></textarea>
      <button class="btn" style="margin-top:6px">Create</button>
    `;

    const [titleInput, descInput, createBtn] = form.querySelectorAll("input, textarea, button");
    createBtn.onclick = async () => {
      const title = (titleInput.value || "").trim();
      const description = (descInput.value || "").trim();
      if (!title) return;
      await onCreate({ tenant, phase, column_id: col.id, title, description });
    };

    colEl.appendChild(list);
    colEl.appendChild(form);
    grid.appendChild(colEl);
  }

  mount.appendChild(grid);

  mount.querySelectorAll("button[data-move]").forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.getAttribute("data-move"));
      const to = Number(btn.getAttribute("data-to"));
      await onMove(id, to);
    };
  });
}
