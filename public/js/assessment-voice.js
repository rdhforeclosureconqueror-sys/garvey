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

  async function postWarmup(payload) {
    const res = await fetch("/api/assessment/voice/warmup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error(`voice_warmup_failed_${res.status}`);
    return res.json();
  }

  function createController(defaults = {}) {
    let currentAudio = null;
    const synth = global.speechSynthesis;
    const warmupPromise = defaults.warmup_promise && typeof defaults.warmup_promise.then === "function"
      ? defaults.warmup_promise
      : null;

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
      const voiceTier = String(block.voice_tier || "full_section").trim();
      if (!voiceText) {
        emitDiagnostic({
          mode: "bind_skipped",
          section_key: sectionKey,
          surface,
          scope_id: scopeId,
          diagnostic_code: "empty_text_payload",
          playback_mode: "none",
        });
        return;
      }

      const controls = document.createElement("div");
      controls.className = "assessment-voice-controls";
      controls.setAttribute("data-assessment-voice-control", sectionKey);
      controls.setAttribute("data-voice-route", "/api/assessment/voice/section");
      const playLabel = esc(block.play_label || "Listen");
      const pauseLabel = esc(block.pause_label || "Pause");
      controls.innerHTML = `
        <button type="button" data-voice-action="play">${playLabel}</button>
        <button type="button" data-voice-action="pause">${pauseLabel}</button>
        <button type="button" data-voice-action="back10">« 10s</button>
        <button type="button" data-voice-action="forward10">10s »</button>
        <span data-voice-status>${warmupPromise ? "Warming AI voice…" : "AI voice status checking…"}</span>`;
      target.prepend(controls);

      const statusNode = controls.querySelector("[data-voice-status]");
      const setStatus = (txt) => { if (statusNode) statusNode.textContent = txt; };

      let hydrated = null;
      const hydrate = async () => {
        if (hydrated) return hydrated;
        if (warmupPromise) {
          setStatus("Warming AI voice…");
          await warmupPromise.catch(() => null);
        }
        hydrated = await postSection({
          surface,
          scope_id: scopeId,
          section_key: sectionKey,
          section_label: sectionLabel,
          voice_text: voiceText,
          text_content: voiceText,
          voice_ready: true,
        });
        if (hydrated.voice_mode === "provider_audio") {
          setStatus(voiceTier === "summary" ? "AI voice ready — ready to hear summary." : "AI voice ready — ready to hear full section.");
        } else setStatus("AI voice unavailable, using fallback.");
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
          voice_diagnostics: hydrated.voice_diagnostics || null,
          resolved_upstream_url: hydrated.voice_diagnostics?.resolved_upstream_url || hydrated.upstream_url || null,
          upstream_included_speak: Boolean(hydrated.voice_diagnostics?.upstream_included_speak),
          final_upstream_url: hydrated.voice_diagnostics?.final_upstream_url || hydrated.upstream_url || null,
          provider_audio_returned: Boolean(hydrated.voice_diagnostics?.provider_audio_returned),
          browser_fallback_used: Boolean(hydrated.voice_diagnostics?.browser_fallback_used),
          tts_http_status: hydrated.voice_diagnostics?.tts_http_status || null,
          error_message: hydrated.voice_diagnostics?.error_message || null,
        });
        return hydrated;
      };

      if (block.prefetch === true) {
        hydrate().catch(() => {
          setStatus("AI voice unavailable, using fallback.");
        });
      }

      controls.querySelector('[data-voice-action="play"]')?.addEventListener("click", async () => {
        try {
          const payload = await hydrate();
          stopCurrent();
          if (payload.voice_mode === "provider_audio" && payload.audio_url) {
            try {
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
                voice_diagnostics: payload.voice_diagnostics || null,
                provider_audio_returned: true,
                browser_fallback_used: false,
                tts_http_status: payload.voice_diagnostics?.tts_http_status || null,
              });
              return;
            } catch (audioErr) {
              emitDiagnostic({
                mode: "provider_audio_failed",
                section_key: sectionKey,
                surface,
                playback_mode: "fallback_browser_speech",
                diagnostic_code: "failed_tts_request",
                fallback_reason: "provider_audio_play_failed",
                message: String(audioErr && audioErr.message || audioErr || ""),
                voice_diagnostics: payload.voice_diagnostics || null,
                provider_audio_returned: false,
                browser_fallback_used: true,
                tts_http_status: payload.voice_diagnostics?.tts_http_status || null,
              });
            }
          }
          if (synth) {
            const ut = new SpeechSynthesisUtterance(payload.playable_text || voiceText);
            synth.speak(ut);
            setStatus("AI voice unavailable, using fallback.");
            emitDiagnostic({
              mode: "playback_selected",
              section_key: sectionKey,
              surface,
              playback_mode: "fallback_browser_speech",
              fallback_reason: payload.fallback_reason || "provider_audio_unavailable",
              diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : ["browser_fallback_used"],
              voice_diagnostics: payload.voice_diagnostics || null,
              provider_audio_returned: Boolean(payload.voice_diagnostics?.provider_audio_returned),
              browser_fallback_used: true,
              tts_http_status: payload.voice_diagnostics?.tts_http_status || null,
              error_message: payload.voice_diagnostics?.error_message || null,
            });
            return;
          }
          setStatus("No audio path available in this browser.");
        } catch (_err) {
          const fallbackText = String(voiceText || "").trim();
          if (synth && fallbackText) {
            try {
              synth.cancel();
              synth.speak(new SpeechSynthesisUtterance(fallbackText));
              setStatus("AI voice request failed, using fallback browser speech.");
              emitDiagnostic({
                mode: "playback_error_fallback_used",
                section_key: sectionKey,
                surface,
                playback_mode: "fallback_browser_speech",
                diagnostic_code: "failed_tts_request",
                fallback_reason: "browser_fallback_used",
              });
              return;
            } catch (_) {
              // fall through to hard failure status
            }
          }
          setStatus("Voice playback unavailable right now.");
          emitDiagnostic({
            mode: "playback_error",
            section_key: sectionKey,
            surface,
            playback_mode: "error",
            diagnostic_code: fallbackText ? "failed_tts_request" : "empty_text_payload",
          });
        }
      });

      controls.querySelector('[data-voice-action="pause"]')?.addEventListener("click", () => {
        stopCurrent();
        setStatus(pauseLabel === "Stop Reading" ? "Reading stopped." : "Playback paused.");
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
  global.AssessmentVoice.warmup = postWarmup;
})(window);
