(function initIntroGate() {
  const INTRO_DURATION_MS = 3000;
  const CONTROL_KEYS = new Set(["to", "dest", "destination", "delay"]);

  function normalizeDelay(raw) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return INTRO_DURATION_MS;
    return Math.max(1600, Math.min(12000, Math.round(parsed)));
  }

  function resolveDestination() {
    const current = new URL(window.location.href);
    const incoming = current.searchParams;
    const configuredTarget = incoming.get("to") || incoming.get("dest") || incoming.get("destination") || "/";

    let target;
    try {
      target = new URL(configuredTarget, window.location.origin);
    } catch (_) {
      target = new URL("/", window.location.origin);
    }

    incoming.forEach((value, key) => {
      if (!CONTROL_KEYS.has(key)) {
        target.searchParams.set(key, value);
      }
    });

    return `${target.pathname}${target.search}${target.hash}`;
  }

  const introVideo = document.getElementById("lionIntroVideo");
  const skipButton = document.getElementById("skipIntro");
  const current = new URL(window.location.href);
  const delayMs = normalizeDelay(current.searchParams.get("delay"));
  const destination = resolveDestination();

  let redirected = false;
  function continueFlow() {
    if (redirected) return;
    redirected = true;
    window.location.assign(destination);
  }

  if (introVideo) {
    introVideo.defaultMuted = true;
    introVideo.muted = true;
    const playPromise = introVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // If autoplay is blocked, we still continue after the gate delay.
      });
    }
  }

  if (skipButton) {
    skipButton.addEventListener("click", continueFlow);
  }

  window.setTimeout(continueFlow, delayMs);
})();
