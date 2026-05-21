"use strict";

const CHILD_REFLECTION_CONTRACT_VERSION = "v0-proposal";

function createReflectionSessionContract() {
  return {
    contract_version: CHILD_REFLECTION_CONTRACT_VERSION,
    reflection_session: {
      session_id: null,
      tenant_slug: "the-gates",
      parent_profile_id: null,
      child_id: null,
      gate_number: null,
      status: "in_progress",
      started_at: null,
      completed_at: null,
      age_band: null,
      narrative_scene_key: null,
      safety_flags: {
        required_break_offered: true,
        low_stimulation_mode: true,
        non_scored_experience: true,
      },
      metadata: {},
    },
  };
}

function createReflectionPromptContract() {
  return {
    prompt_id: null,
    gate_number: null,
    prompt_type: "symbolic_choice",
    narrative_frame: "",
    prompt_text: "",
    options: [],
    accessibility: {
      reading_level_hint: null,
      supports_audio: false,
      supports_visual_symbols: true,
    },
    no_right_wrong: true,
    tags: [],
  };
}

function createInteractionResponseContract() {
  return {
    response_id: null,
    session_id: null,
    prompt_id: null,
    response_type: "symbolic_choice",
    child_payload: {
      selected_option_key: null,
      free_text_reflection: null,
      voice_reflection_ref: null,
      drawing_ref: null,
    },
    reflection_notes: {
      child_words_excerpt: null,
      emotional_weather: null,
      self_named_need: null,
    },
    created_at: null,
  };
}

function createSymbolicChoiceContract() {
  return {
    choice_key: null,
    symbol_family: null,
    label: "",
    meaning_hint: "",
    non_evaluative: true,
    narrative_effect: {
      scene_transition_key: null,
      tone_shift: "neutral",
    },
  };
}

function createNarrativePathContract() {
  return {
    path_id: null,
    gate_number: null,
    scene_key: null,
    transitions: [],
    path_state: {
      current_scene_key: null,
      visited_scene_keys: [],
      branch_history: [],
    },
  };
}

function createDevelopmentalObservationContract() {
  return {
    observation_id: null,
    session_id: null,
    category: "emotional_awareness",
    theme: "",
    language_style: "emerging",
    confidence_band: "low",
    evidence_refs: [],
    summary: "",
    do_not_use_for_diagnosis: true,
  };
}

function createParentReflectionSummaryContract() {
  return {
    summary_id: null,
    child_id: null,
    period_start: null,
    period_end: null,
    emerging_themes: [],
    observed_preferences: [],
    growth_opportunities: [],
    suggested_conversations: [],
    wording_policy: {
      non_diagnostic: true,
      no_pathology_labels: true,
      no_child_ranking: true,
    },
  };
}

module.exports = {
  CHILD_REFLECTION_CONTRACT_VERSION,
  createReflectionSessionContract,
  createReflectionPromptContract,
  createInteractionResponseContract,
  createSymbolicChoiceContract,
  createNarrativePathContract,
  createDevelopmentalObservationContract,
  createParentReflectionSummaryContract,
};
