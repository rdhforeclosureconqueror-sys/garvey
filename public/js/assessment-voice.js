"use strict";

(function initAssessmentVoice(global) {
  const diagnostics = global.__assessmentVoiceDiagnostics || [];
  global.__assessmentVoiceDiagnostics = diagnostics;

  function emitDiagnostic(event) {
    const payload = { ts: new Date().toISOString(), ...event };
    diagnostics.push(payload);
    if (diagnostics.length > 100) diagnostics.shift();
    try {
      console.info("assessment_voice_diagnostic", payload);
    } catch (_) {
      // no-op
    }
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function postSection(payload) {
    const res = await fetch("/api/assessment/voice/section", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`voice_section_failed_${res.status}`);
    return res.json();
  }

  function createController(defaults = {}) {
    let currentAudio = null;
    const synth = global.speechSynthesis;

    const stopCurrent = () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      if (synth) synth.cancel();
    };

    const bind = (target, block = {}) => {
      if (!target) return;
      const sectionKey = String(block.section_key || target.getAttribute("data-voice-section-key") || "section").trim();
      const sectionLabel = String(block.section_label || target.getAttribute("data-voice-section-label") || sectionKey).trim();
      const voiceText = String(block.voice_text || block.text_content || target.textContent || "").trim();
      const scopeId = String(block.scope_id || defaults.scope_id || "default_scope").trim();
      const surface = String(block.surface || defaults.surface || "assessment").trim();
      if (!voiceText) return;

      const controls = document.createElement("div");
      controls.className = "assessment-voice-controls";
      controls.setAttribute("data-assessment-voice-control", sectionKey);
      controls.setAttribute("data-voice-route", "/api/assessment/voice/section");
      controls.innerHTML = `
        <button type="button" data-voice-action="play">Listen</button>
        <button type="button" data-voice-action="pause">Pause</button>
        <button type="button" data-voice-action="back10">« 10s</button>
        <button type="button" data-voice-action="forward10">10s »</button>
        <span data-voice-status>AI voice status checking…</span>`;
      target.prepend(controls);

      const statusNode = controls.querySelector("[data-voice-status]");
      const setStatus = (txt) => { if (statusNode) statusNode.textContent = txt; };

      let hydrated = null;
      const hydrate = async () => {
        if (hydrated) return hydrated;
        hydrated = await postSection({
          surface,
          scope_id: scopeId,
          section_key: sectionKey,
          section_label: sectionLabel,
          voice_text: voiceText,
          text_content: voiceText,
          voice_ready: true,
        });
        if (hydrated.voice_mode === "provider_audio") setStatus("AI voice ready (OpenAI/provider audio available).");
        else setStatus("AI voice unavailable, using fallback browser speech.");
        controls.setAttribute("data-voice-mode", String(hydrated.voice_mode || "unknown"));
        controls.setAttribute("data-upstream-route", String(hydrated.upstream_route || "/speak"));
        controls.setAttribute("data-provider-ready", hydrated.provider_ready ? "true" : "false");
        emitDiagnostic({
          mode: "hydrate",
          section_key: sectionKey,
          surface,
          scope_id: scopeId,
          route: "/api/assessment/voice/section",
          upstream_route: hydrated.upstream_route || "/speak",
          provider_ready: Boolean(hydrated.provider_ready),
          provider_status: hydrated.provider_status || null,
          playback_mode: hydrated.voice_mode || "unknown",
          fallback_reason: hydrated.fallback_reason || null,
        });
        return hydrated;
      };

      controls.querySelector('[data-voice-action="play"]')?.addEventListener("click", async () => {
        try {
          const payload = await hydrate();
          stopCurrent();
          if (payload.voice_mode === "provider_audio" && payload.audio_url) {
            currentAudio = new Audio(payload.audio_url);
            await currentAudio.play();
            setStatus("Playing AI voice (OpenAI/provider audio).");
            emitDiagnostic({
              mode: "playback_selected",
              section_key: sectionKey,
              surface,
              playback_mode: "provider_audio",
              upstream_route: payload.upstream_route || "/speak",
              stream_url: payload.audio_url,
            });
            return;
          }
          if (synth) {
            const ut = new SpeechSynthesisUtterance(payload.playable_text || voiceText);
            synth.speak(ut);
            setStatus("Using browser speech fallback (seeking may be limited).");
            emitDiagnostic({
              mode: "playback_selected",
              section_key: sectionKey,
              surface,
              playback_mode: "fallback_browser_speech",
              fallback_reason: payload.fallback_reason || "provider_audio_unavailable",
            });
            return;
          }
          setStatus("No audio path available in this browser.");
        } catch (_err) {
          setStatus("Voice playback unavailable right now.");
          emitDiagnostic({
            mode: "playback_error",
            section_key: sectionKey,
            surface,
            playback_mode: "error",
          });
        }
      });

      controls.querySelector('[data-voice-action="pause"]')?.addEventListener("click", () => {
        if (currentAudio) currentAudio.pause();
        if (synth?.speaking) synth.pause();
        setStatus("Playback paused.");
      });

      controls.querySelector('[data-voice-action="back10"]')?.addEventListener("click", () => {
        if (currentAudio) currentAudio.currentTime = Math.max(0, Number(currentAudio.currentTime || 0) - 10);
        else setStatus("Skip controls require provider audio; browser fallback cannot seek reliably.");
      });

      controls.querySelector('[data-voice-action="forward10"]')?.addEventListener("click", () => {
        if (currentAudio) currentAudio.currentTime = Math.max(0, Number(currentAudio.currentTime || 0) + 10);
        else setStatus("Skip controls require provider audio; browser fallback cannot seek reliably.");
      });
    };

    const bindFromSelector = (selector, shared = {}) => {
      const nodes = Array.from(document.querySelectorAll(selector || "[data-voice-section-key]"));
      for (const node of nodes) bind(node, shared);
    };

    return { bind, bindFromSelector, stopCurrent };
  }

  global.AssessmentVoice = { createController, esc };
})(window);
