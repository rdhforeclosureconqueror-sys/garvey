(function (root) {
  "use strict";
  const params = new URLSearchParams(root.location.search);
  const childId = params.get("child_id");
  if (!/^[1-9][0-9]*$/.test(String(childId || ""))) return;
  let context = null;
  const contextUrl = `/api/garvey-learning/children/${encodeURIComponent(childId)}/context`;
  const ready = fetch(contextUrl, { credentials: "include" })
    .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
    .then(({ response, data }) => {
      if (!response.ok || data.ok !== true || data.consent_status !== "granted") return null;
      context = data;
      return context;
    }).catch(() => null);
  async function transport(event) {
    const active = context || await ready;
    if (!active || !active.event_endpoint || !active.csrf_token) return { saved: false, reason: "consent_or_session_unavailable" };
    const response = await fetch(active.event_endpoint, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-Garvey-Consent-CSRF": active.csrf_token },
      body: JSON.stringify({ event }),
    });
    return response.json().catch(() => ({ saved: false }));
  }
  root.GarveyActivityRuntime = Object.freeze({ childId, ready, transport });
})(window);
