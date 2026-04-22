"use strict";

(function initAssessmentVoice(global) {
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
            return;
          }
          if (synth) {
            const ut = new SpeechSynthesisUtterance(payload.playable_text || voiceText);
            synth.speak(ut);
            setStatus("Using browser speech fallback (seeking may be limited).");
            return;
          }
          setStatus("No audio path available in this browser.");
        } catch (_err) {
          setStatus("Voice playback unavailable right now.");
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
