"use strict";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAction(action, fallbackLabel) {
  if (!action || typeof action !== "object") {
    return null;
  }
  const label = String(action.label || fallbackLabel || "Open").trim();
  const url = String(action.url || action.href || "").trim();
  if (!label || !url) {
    return null;
  }
  return {
    label,
    url,
  };
}

function normalizeActionList(value, fallbackList = []) {
  const list = Array.isArray(value) ? value : fallbackList;
  return list
    .map((item, index) => normalizeAction(item, `Action ${index + 1}`))
    .filter(Boolean)
    .slice(0, 4);
}


function normalizeTemplateRuntime(value) {
  if (!value || typeof value !== "object") {
    return { modules: [] };
  }
  return {
    modules: Array.isArray(value.modules) ? value.modules.filter((module) => module && typeof module === "object") : [],
  };
}

function getRuntimeModule(runtime, moduleId) {
  return runtime.modules.find((module) => String(module.module_id || "").trim() === moduleId) || null;
}

function moduleEnabled(moduleState, fallback = true) {
  if (!moduleState) return fallback;
  return moduleState.enabled !== false;
}

function buildTapHubViewModel(resolvedBody) {
  const resolution = resolvedBody && resolvedBody.resolution ? resolvedBody.resolution : {};
  const config = resolvedBody && resolvedBody.business_config && typeof resolvedBody.business_config === "object"
    ? resolvedBody.business_config
    : {};

  const brand = config.brand && typeof config.brand === "object" ? config.brand : {};
  const actions = config.actions && typeof config.actions === "object" ? config.actions : {};
  const social = config.social && typeof config.social === "object" ? config.social : {};
  const business = config.business && typeof config.business === "object" ? config.business : {};

  const templateRuntime = normalizeTemplateRuntime(resolvedBody && resolvedBody.template_runtime);
  const heroModule = getRuntimeModule(templateRuntime, "hero");
  const primaryModule = getRuntimeModule(templateRuntime, "primary_cta");
  const servicesModule = getRuntimeModule(templateRuntime, "services");
  const socialModule = getRuntimeModule(templateRuntime, "social_links");
  const businessModule = getRuntimeModule(templateRuntime, "business_info");
  const guideModule = getRuntimeModule(templateRuntime, "guide_assistant");

  const primaryActions = moduleEnabled(primaryModule, true)
    ? normalizeActionList(actions.primary, [
      {
        label: String(primaryModule && primaryModule.config && primaryModule.config.label || "Get Started").trim() || "Get Started",
        url: String(primaryModule && primaryModule.config && primaryModule.config.url || resolution.destination_path || "/tap-crm").trim() || (resolution.destination_path || "/tap-crm"),
      },
    ])
    : [];

  const secondaryActions = normalizeActionList(actions.secondary, [
    {
      label: "Contact Business",
      url: "tel:" + String(business.phone || "").replace(/\s+/g, ""),
    },
  ]).filter((action) => !action.url.endsWith("tel:"));

  const featuredServices = Array.isArray(servicesModule && servicesModule.config && servicesModule.config.featured)
    ? servicesModule.config.featured.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];

  const socialLinks = [
    ["instagram", social.instagram],
    ["facebook", social.facebook],
    ["tiktok", social.tiktok],
    ["x", social.x],
    ["youtube", social.youtube],
  ]
    .map(([network, url]) => {
      const value = String(url || "").trim();
      if (!value) {
        return null;
      }
      return { network, url: value };
    })
    .filter(Boolean)
    .slice(0, 5);

  const businessItems = [
    { key: "Phone", value: business.phone || "" },
    { key: "Email", value: business.email || "" },
    { key: "Address", value: business.address || "" },
    { key: "Hours", value: business.hours || "" },
  ].filter((item) => String(item.value || "").trim());

  const guideConfig = guideModule && guideModule.config && typeof guideModule.config === "object"
    ? guideModule.config
    : {};
  const guideSteps = Array.isArray(guideConfig.steps)
    ? guideConfig.steps.map((step) => String(step || "").trim()).filter(Boolean).slice(0, 5)
    : [];

  return {
    routeNamespace: resolvedBody.route_namespace || "tap-crm",
    tenant: String(resolution.tenant || "").trim(),
    tagCode: String(resolution.tag_code || "").trim(),
    pageTitle: String(brand.name || resolution.label || "Tap Hub").trim() || "Tap Hub",
    headline: String(brand.headline || (heroModule && heroModule.config && heroModule.config.headline) || resolution.label || "Welcome").trim() || "Welcome",
    subheadline: String(brand.subheadline || (heroModule && heroModule.config && heroModule.config.subheadline) || "Tap to choose your next step.").trim(),
    logoUrl: String(brand.logo_url || "").trim(),
    primaryActions: primaryActions.map((action) => ({
      ...action,
      bookingCta: /\bbook\b/i.test(action.label),
    })),
    secondaryActions,
    socialLinks,
    businessName: String(business.name || brand.name || resolution.tenant || "Our Business").trim() || "Our Business",
    businessItems,
    featuredServices,
    guide: {
      title: String(guideConfig.title || "How this works").trim() || "How this works",
      intro: String(guideConfig.intro || "Follow these quick steps to get started.").trim() || "Follow these quick steps to get started.",
      ctaLabel: String(guideConfig.cta_label || "Start now").trim() || "Start now",
      steps: guideSteps,
    },
    modules: {
      primaryEnabled: moduleEnabled(primaryModule, true),
      secondaryEnabled: true,
      socialEnabled: moduleEnabled(socialModule, true),
      businessEnabled: moduleEnabled(businessModule, true),
      servicesEnabled: moduleEnabled(servicesModule, false),
      guideEnabled: moduleEnabled(guideModule, true),
    },
  };
}

function renderActions(actions, zoneClass) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '<p class="zone-empty">No actions available right now.</p>';
  }

  return `
    <div class="action-grid ${zoneClass}">
      ${actions
        .map((action) => `
          ${action.bookingCta
            ? `<button class="action-btn booking-btn" type="button" data-booking-open>${escapeHtml(action.label)}</button>`
            : `<a class="action-btn" href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a>`}
        `)
        .join("")}
    </div>
  `;
}

function renderTapHubPage(viewModel) {
  const logoMarkup = viewModel.logoUrl
    ? `<img class="brand-logo" src="${escapeHtml(viewModel.logoUrl)}" alt="${escapeHtml(viewModel.pageTitle)} logo" />`
    : "";

  const socialMarkup = viewModel.socialLinks.length > 0
    ? `<div class="social-links">${viewModel.socialLinks
      .map((social) => `<a href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(social.network)}</a>`)
      .join("")}</div>`
    : '<p class="zone-empty">No social links published.</p>';

  const businessMarkup = viewModel.businessItems.length > 0
    ? `<dl class="business-list">${viewModel.businessItems
      .map((item) => `<div><dt>${escapeHtml(item.key)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
      .join("")}</dl>`
    : '<p class="zone-empty">Business details are being updated.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(viewModel.pageTitle)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background:
          radial-gradient(circle at 20% 10%, rgba(223, 35, 35, 0.35), transparent 35%),
          radial-gradient(circle at 80% 15%, rgba(11, 120, 61, 0.28), transparent 38%),
          linear-gradient(160deg, #0a0a0a 0%, #0f1720 52%, #101010 100%);
        color: #f8fafc;
      }
      main { max-width: 520px; margin: 0 auto; padding: 18px 16px 40px; }
      .card {
        background: linear-gradient(180deg, rgba(9, 9, 9, 0.92), rgba(16, 16, 16, 0.94));
        border-radius: 16px;
        padding: 16px;
        border: 1px solid rgba(230, 184, 93, 0.55);
        box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(230, 184, 93, 0.25);
        margin-bottom: 12px;
      }
      .hero-card {
        background:
          linear-gradient(120deg, rgba(168, 20, 20, 0.3), rgba(14, 116, 62, 0.25)),
          linear-gradient(180deg, rgba(8, 8, 8, 0.92), rgba(16, 16, 16, 0.96));
      }
      .brand-logo { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; display: block; margin-bottom: 12px; border: 1px solid rgba(230, 184, 93, 0.65); }
      h1 { font-size: 1.35rem; margin: 0 0 6px; }
      .sub { margin: 0; color: #d1d5db; font-size: 0.95rem; }
      h2 { font-size: 1rem; margin: 0 0 10px; color: #fef3c7; }
      .action-grid { display: grid; gap: 10px; }
      .action-btn {
        text-decoration: none;
        text-align: center;
        padding: 12px;
        border-radius: 10px;
        font-weight: 700;
        border: 1px solid rgba(230, 184, 93, 0.65);
      }
      .primary-zone .action-btn { background: linear-gradient(135deg, #b91c1c, #7f1d1d); color: #fff; }
      .secondary-zone .action-btn { background: linear-gradient(135deg, #166534, #14532d); color: #ecfdf3; }
      .social-links { display: flex; flex-wrap: wrap; gap: 8px; }
      .social-links a { text-decoration: none; background: rgba(17, 24, 39, 0.8); color: #e5e7eb; padding: 7px 10px; border-radius: 999px; font-size: 0.85rem; border: 1px solid rgba(230,184,93,0.45); }
      .business-list { margin: 0; }
      .business-list div { margin-bottom: 8px; }
      .business-list dt { font-size: 0.78rem; color: #fcd34d; text-transform: uppercase; letter-spacing: .03em; }
      .business-list dd { margin: 2px 0 0; font-size: .95rem; color: #e5e7eb; }
      .zone-empty { margin: 0; color: #cbd5e1; font-size: 0.9rem; }
      .meta { margin-top: 10px; font-size: 0.75rem; color: #94a3b8; }
      .guide-trigger {
        width: 100%;
        border: 1px solid rgba(230, 184, 93, 0.7);
        background: linear-gradient(135deg, #111827, #0f172a);
        color: #fef3c7;
        border-radius: 10px;
        padding: 12px;
        font-weight: 700;
        text-align: left;
      }
      .guide-panel { margin-top: 10px; border: 1px solid rgba(230, 184, 93, 0.45); border-radius: 12px; padding: 12px; background: rgba(2, 6, 23, 0.7); }
      .guide-panel h3 { margin: 0 0 8px; color: #fef3c7; }
      .guide-steps { margin: 0; padding-left: 20px; }
      .guide-steps li { margin-bottom: 6px; color: #e5e7eb; }
      .guide-cta { display: inline-block; margin-top: 8px; padding: 8px 12px; border-radius: 999px; background: #b91c1c; color: #fff; border: 1px solid rgba(230,184,93,0.7); text-decoration: none; }
      .checkin-gate { display: grid; gap: 8px; }
      .checkin-btn {
        width: 100%;
        border: 1px solid rgba(230, 184, 93, 0.75);
        background: linear-gradient(135deg, #166534, #14532d);
        color: #ecfdf3;
        border-radius: 10px;
        padding: 11px;
        font-weight: 700;
      }
      .booking-btn { width: 100%; }
      .booking-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .booking-modal-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.72); display: grid; place-items: center; padding: 16px; }
      .booking-modal { width: min(440px, 100%); border-radius: 14px; border: 1px solid rgba(230,184,93,0.65); background: #050a18; padding: 14px; }
      .booking-modal h3 { margin: 0 0 8px; }
      .booking-field { display: grid; gap: 6px; margin-top: 8px; }
      .booking-field input { width: 100%; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; padding: 9px; }
      .slot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
      .slot { border-radius: 9px; border: 1px solid #64748b; padding: 8px 6px; text-align: center; background: #0b1322; color: #e2e8f0; }
      .slot.available { cursor: pointer; border-color: #16a34a; }
      .slot.unavailable { opacity: 0.45; border-color: #b91c1c; text-decoration: line-through; }
      .slot.selected { box-shadow: 0 0 0 2px rgba(230,184,93,0.8) inset; }
      .booking-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }
      .booking-actions button { flex: 1; border-radius: 8px; border: 1px solid rgba(230,184,93,0.55); padding: 10px; background: #111827; color: #fff; }
      .booking-status { margin-top: 8px; color: #cbd5e1; min-height: 20px; font-size: 0.88rem; }
    </style>
  </head>
  <body>
    <main>
      <section class="card hero-card">
        ${logoMarkup}
        <h1>${escapeHtml(viewModel.headline)}</h1>
        <p class="sub">${escapeHtml(viewModel.subheadline)}</p>
      </section>

      ${viewModel.modules.guideEnabled ? `
      <section class="card">
        <button class="guide-trigger" type="button" aria-expanded="false" aria-controls="tap-guide-panel" data-guide-toggle>
          Virtual Guide · Tap for steps
        </button>
        <div class="guide-panel" id="tap-guide-panel" hidden>
          <h3>${escapeHtml(viewModel.guide.title)}</h3>
          <p class="sub" style="margin-bottom: 8px;">${escapeHtml(viewModel.guide.intro)}</p>
          ${viewModel.guide.steps.length ? `<ol class="guide-steps">${viewModel.guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : '<p class="zone-empty">Guide steps are being prepared.</p>'}
          <a class="guide-cta" href="#primary-actions">${escapeHtml(viewModel.guide.ctaLabel)}</a>
        </div>
      </section>` : ""}

      <section class="card">
        <h2>Check-in first</h2>
        <div class="checkin-gate">
          <p class="sub">Start your guided check-in before entering booking.</p>
          <button class="checkin-btn" type="button" data-checkin-enter>Start check-in</button>
        </div>
      </section>

      ${viewModel.modules.primaryEnabled ? `
      <section class="card" id="primary-actions">
        <h2>Primary actions</h2>
        ${renderActions(viewModel.primaryActions, "primary-zone")}
      </section>` : ""}

      ${viewModel.modules.secondaryEnabled ? `
      <section class="card">
        <h2>Secondary actions</h2>
        ${renderActions(viewModel.secondaryActions, "secondary-zone")}
      </section>` : ""}

      ${viewModel.modules.servicesEnabled ? `
      <section class="card">
        <h2>Featured services</h2>
        ${viewModel.featuredServices.length ? `<ul>${viewModel.featuredServices.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="zone-empty">No featured services configured.</p>'}
      </section>` : ""}

      ${viewModel.modules.socialEnabled ? `
      <section class="card">
        <h2>Social & brand</h2>
        <p class="sub" style="margin-bottom: 10px;">${escapeHtml(viewModel.businessName)}</p>
        ${socialMarkup}
      </section>` : ""}

      ${viewModel.modules.businessEnabled ? `
      <section class="card">
        <h2>Business info</h2>
        ${businessMarkup}
        <p class="meta">route namespace: ${escapeHtml(viewModel.routeNamespace)} · tenant: ${escapeHtml(viewModel.tenant)} · tag: ${escapeHtml(viewModel.tagCode)}</p>
      </section>` : ""}
    </main>
    <div class="booking-modal-backdrop" id="bookingBackdrop" hidden>
      <section class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bookingTitle">
        <h3 id="bookingTitle">Book your appointment</h3>
        <p class="sub">Select a date and available time slot.</p>
        <div class="booking-field">
          <label for="bookingDate">Date</label>
          <input id="bookingDate" type="date" />
        </div>
        <div class="slot-grid" id="bookingSlots"></div>
        <div class="booking-field">
          <label for="bookingName">Your name (optional)</label>
          <input id="bookingName" type="text" maxlength="100" />
        </div>
        <div class="booking-status" id="bookingStatus"></div>
        <div class="booking-actions">
          <button type="button" id="bookingCancelBtn">Cancel</button>
          <button type="button" id="bookingConfirmBtn">Confirm booking</button>
        </div>
      </section>
    </div>
    <script>
      (function () {
        var tagCode = ${JSON.stringify(viewModel.tagCode)};
        var toggle = document.querySelector("[data-guide-toggle]");
        var panel = document.getElementById("tap-guide-panel");
        if (toggle && panel) {
          toggle.addEventListener("click", function () {
            var expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            panel.hidden = expanded;
          });
        }

        var bookingOpen = document.querySelector("[data-booking-open]");
        var checkInBtn = document.querySelector("[data-checkin-enter]");
        var backdrop = document.getElementById("bookingBackdrop");
        var dateInput = document.getElementById("bookingDate");
        var slotsEl = document.getElementById("bookingSlots");
        var statusEl = document.getElementById("bookingStatus");
        var cancelBtn = document.getElementById("bookingCancelBtn");
        var confirmBtn = document.getElementById("bookingConfirmBtn");
        var selectedSlot = "";
        var bookingUnlocked = false;
        var submitPending = false;

        function toDateString(date) { return date.toISOString().slice(0, 10); }
        function oneWeekOut() { var now = new Date(); now.setUTCDate(now.getUTCDate() + 7); return toDateString(now); }
        function setStatus(text) { statusEl.textContent = text || ""; }
        function toDisplayTime(time24) {
          var normalized = String(time24 || "").trim();
          var match = normalized.match(/^(\d{2}):(\d{2})$/);
          if (!match) return normalized;
          var hours = Number(match[1]);
          var minutes = Number(match[2]);
          if (Number.isNaN(hours) || Number.isNaN(minutes)) return normalized;
          var suffix = hours >= 12 ? "PM" : "AM";
          var normalizedHour = hours % 12 || 12;
          return normalizedHour + ":" + String(minutes).padStart(2, "0") + " " + suffix;
        }
        function setConfirmEnabled(enabled) {
          if (!confirmBtn) return;
          confirmBtn.disabled = !enabled;
        }
        function updateBookingEntryState() {
          if (!bookingOpen) return;
          bookingOpen.disabled = !bookingUnlocked;
          bookingOpen.title = bookingUnlocked ? "" : "Complete check-in first";
        }
        function renderSlots(items) {
          slotsEl.innerHTML = "";
          items.forEach(function (slot) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = toDisplayTime(slot.time);
            button.className = "slot " + (slot.status === "available" ? "available" : "unavailable");
            button.disabled = slot.status !== "available";
            button.addEventListener("click", function () {
              selectedSlot = slot.time;
              Array.prototype.forEach.call(slotsEl.querySelectorAll(".slot"), function (item) { item.classList.remove("selected"); });
              button.classList.add("selected");
              setConfirmEnabled(true);
              setStatus("Selected " + toDisplayTime(selectedSlot) + ". Tap Confirm booking to continue.");
            });
            slotsEl.appendChild(button);
          });
          setConfirmEnabled(Boolean(selectedSlot));
        }
        function fetchAvailability() {
          var date = String(dateInput.value || "").trim();
          if (!date) return Promise.resolve(null);
          selectedSlot = "";
          setStatus("Loading availability...");
          return fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/availability?date=" + encodeURIComponent(date))
            .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
            .then(function (result) {
              if (!result.ok) throw new Error(result.body.error || "Failed to load availability");
              renderSlots(Array.isArray(result.body.slots) ? result.body.slots : []);
              setStatus("Available slots are green. Unavailable slots are crossed out.");
              return result.body;
            })
            .catch(function (err) {
              renderSlots([]);
              setStatus(err.message || "Could not load availability.");
              return null;
            });
        }
        function openBooking(event) {
          if (!backdrop) return;
          if (!event || event.type !== "click") return;
          if (!bookingUnlocked) {
            setStatus("Please complete check-in before booking.");
            return;
          }
          backdrop.hidden = false;
          dateInput.value = oneWeekOut();
          setConfirmEnabled(false);
          fetchAvailability();
        }
        function closeBooking() { backdrop.hidden = true; selectedSlot = ""; setStatus(""); }

        updateBookingEntryState();
        if (checkInBtn) {
          checkInBtn.addEventListener("click", function () {
            bookingUnlocked = true;
            updateBookingEntryState();
            checkInBtn.textContent = "Check-in complete";
            checkInBtn.disabled = true;
          });
        }
        if (bookingOpen) bookingOpen.addEventListener("click", openBooking);
        if (cancelBtn) cancelBtn.addEventListener("click", closeBooking);
        if (dateInput) dateInput.addEventListener("change", fetchAvailability);
        if (confirmBtn) {
          confirmBtn.addEventListener("click", function () {
            if (!selectedSlot) return setStatus("Please select an available time.");
            if (submitPending) return;
            submitPending = true;
            setConfirmEnabled(false);
            setStatus("Submitting booking...");
            var date = String(dateInput.value || "").trim();
            fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/availability?date=" + encodeURIComponent(date))
              .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
              .then(function (result) {
                if (!result.ok) throw new Error(result.body.error || "Could not verify slot availability");
                var slots = Array.isArray(result.body.slots) ? result.body.slots : [];
                var selected = slots.find(function (slot) { return slot.time === selectedSlot; });
                if (!selected || selected.status !== "available") {
                  setStatus("That time was just taken. We refreshed availability so you can pick a new slot.");
                  return fetchAvailability().then(function () { return null; });
                }
                return fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/reservations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: date,
                    time: selectedSlot,
                    customer_name: (document.getElementById("bookingName") || {}).value || "",
                  }),
                })
                  .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body, status: res.status }; }); });
              })
              .then(function (result) {
                if (!result) return;
                if (!result.ok) {
                  if (result.status === 409 || result.body.error === "slot_unavailable") {
                    setStatus("That slot is no longer available. We refreshed the list.");
                    return fetchAvailability();
                  }
                  throw new Error(result.body.error || "Booking failed");
                }
                setStatus("Booked for " + result.body.reservation.booking_date + " at " + toDisplayTime(result.body.reservation.slot_time) + ".");
                return fetchAvailability();
              })
              .catch(function (err) { setStatus(err.message || "Booking failed."); })
              .finally(function () {
                submitPending = false;
                setConfirmEnabled(Boolean(selectedSlot));
              });
          });
        }
      })();
    </script>
  </body>
</html>`;
}

function renderTapHubErrorPage({ statusCode, title, message }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 20px; }
      .panel { max-width: 420px; width: 100%; background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); text-align: center; }
      .code { color: #475569; font-size: 0.85rem; margin-bottom: 8px; }
      h1 { margin: 0 0 8px; font-size: 1.25rem; }
      p { margin: 0; color: #334155; }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="code">Status ${Number(statusCode) || 400}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  </body>
</html>`;
}

module.exports = {
  buildTapHubViewModel,
  renderTapHubPage,
  renderTapHubErrorPage,
  normalizeTemplateRuntime,
};
