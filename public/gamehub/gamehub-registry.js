(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.GameHubRegistry = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGameHubRegistryModule() {
  const GATE_KEY_ALIASES = Object.freeze({
    1: 'learning',
    2: 'focus',
    3: 'resilience',
    4: 'problem-solving',
    5: 'consistency',
    6: 'confidence',
    7: 'self-control',
    8: 'persistence',
    9: 'adaptability'
  });

  const GAMEHUB_REGISTRY = Object.freeze([
    {
      game_key: 'adaptive_learning',
      title: 'Adaptive Learning Quiz',
      file_path: '/gamehub/adaptive_learning',
      launch_path: '/gamehub/adaptive_learning.html',
      description: 'Adaptive multiple-choice quiz with fallback and shared question-bank support.',
      game_type: 'quiz',
      primary_capacities: ['academic confidence', 'reasoning', 'focus'],
      suggested_age_range: '7-14',
      supported_gate_tags: ['learning', 'focus', 'resilience'],
      content_source_type: 'shared_question_bank_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['learning', 'focus'],
      secondary_gates: ['resilience'],
      signal_confidence: 'strong',
      signal_categories: ['attention_focus', 'adaptive_reasoning', 'challenge_choice', 'persistence'],
      suggested_mode_preset: 'support',
      suggested_practice_path: 'guided_focus',
      parent_reflection_prompt: 'What helped your child stay focused during this game?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No tracking or profile writeback yet; keep local-only play behavior.'
    },
    {
      game_key: 'braingame2',
      title: 'Brain Game 2',
      file_path: '/gamehub/braingame2',
      launch_path: '/gamehub/braingame2.html',
      description: 'Lightweight cognitive challenge mini-game.',
      game_type: 'cognitive',
      primary_capacities: ['working memory', 'focus'],
      suggested_age_range: '7-14',
      supported_gate_tags: ['focus', 'problem-solving'],
      content_source_type: 'embedded_static_content',
      config_ready: false,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['focus'],
      secondary_gates: ['problem-solving'],
      signal_confidence: 'medium',
      signal_categories: ['attention_focus', 'cognitive_flexibility', 'challenge_choice'],
      suggested_mode_preset: 'standard',
      suggested_practice_path: 'switching_practice',
      parent_reflection_prompt: 'What strategy did your child try next when a rule changed?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'Standalone behavior preserved; no profile/state integration.'
    },
    {
      game_key: 'braingames',
      title: 'Brain Games',
      file_path: '/gamehub/braingames',
      launch_path: '/gamehub/braingames.html',
      description: 'General brain-training style standalone game page.',
      game_type: 'cognitive',
      primary_capacities: ['attention', 'memory'],
      suggested_age_range: '7-14',
      supported_gate_tags: ['focus', 'consistency'],
      content_source_type: 'embedded_static_content',
      config_ready: false,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['focus'],
      secondary_gates: ['consistency'],
      signal_confidence: 'medium',
      signal_categories: ['attention_focus', 'cognitive_flexibility', 'persistence', 'strategy_use'],
      suggested_mode_preset: 'standard',
      suggested_practice_path: 'steady_progress',
      parent_reflection_prompt: 'What did your child do after something felt hard?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No tracking hooks introduced in registry phase.'
    },
    {
      game_key: 'brickblast',
      title: 'Brick Blast',
      file_path: '/gamehub/brickblast',
      launch_path: '/gamehub/brickblast.html',
      description: 'Arcade-style brick breaker with local configuration fallback.',
      game_type: 'arcade',
      primary_capacities: ['reaction control', 'focus'],
      suggested_age_range: '7-14',
      supported_gate_tags: ['focus', 'persistence'],
      content_source_type: 'config_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['focus', 'persistence'],
      secondary_gates: ['resilience'],
      signal_confidence: 'strong',
      signal_categories: ['attention_focus', 'recovery_after_setback', 'persistence', 'body_timing'],
      suggested_mode_preset: 'support',
      suggested_practice_path: 'reset_and_retry',
      parent_reflection_prompt: 'How did your child recover after a mistake?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No Gates scoring or tracking connection in this phase.'
    },
    {
      game_key: 'checkers',
      title: 'Checkers',
      file_path: '/gamehub/checkers',
      launch_path: '/gamehub/checkers.html',
      description: 'Classic checkers board game implementation.',
      game_type: 'strategy',
      primary_capacities: ['planning', 'strategy'],
      suggested_age_range: '7-16',
      supported_gate_tags: ['problem-solving', 'self-control'],
      content_source_type: 'embedded_static_content',
      config_ready: false,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: false,
      instrumentation_status: 'hold_for_repair',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'Registry-only launch metadata; no mechanics changes.'
    },
    {
      game_key: 'game6',
      title: 'Vocabulary Match (Game 6)',
      file_path: '/gamehub/game6',
      launch_path: '/gamehub/game6.html',
      description: 'Vocabulary game with synonym and antonym matching.',
      game_type: 'vocabulary',
      primary_capacities: ['language fluency', 'reasoning'],
      suggested_age_range: '8-15',
      supported_gate_tags: ['learning', 'confidence'],
      content_source_type: 'shared_word_bank_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['learning'],
      secondary_gates: ['confidence', 'problem-solving'],
      signal_confidence: 'medium',
      signal_categories: ['literacy_practice', 'adaptive_reasoning', 'strategy_use', 'challenge_choice'],
      suggested_mode_preset: 'challenge',
      suggested_practice_path: 'advanced_word_challenge',
      parent_reflection_prompt: 'What strategy did your child try next?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'Supports shared content but remains standalone.'
    },
    {
      game_key: 'spelling',
      title: 'Spelling Practice',
      file_path: '/gamehub/spelling',
      launch_path: '/gamehub/spelling.html',
      description: 'Spelling trainer with shared word-bank compatibility.',
      game_type: 'literacy',
      primary_capacities: ['literacy', 'focus'],
      suggested_age_range: '6-12',
      supported_gate_tags: ['learning', 'consistency'],
      content_source_type: 'shared_word_bank_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['learning'],
      secondary_gates: ['focus', 'consistency'],
      signal_confidence: 'strong',
      signal_categories: ['literacy_practice', 'attention_focus', 'persistence'],
      suggested_mode_preset: 'support',
      suggested_practice_path: 'daily_literacy',
      parent_reflection_prompt: 'What helped your child stay focused on the words?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No analytics wiring during registry foundation phase.'
    },
    {
      game_key: 'first_grade_sight_words',
      title: '1st Grade Sight Words',
      file_path: '/gamehub/1stgradesightwords',
      launch_path: '/gamehub/1stgradesightwords.html',
      description: 'Sight-words practice game for early literacy.',
      game_type: 'literacy',
      primary_capacities: ['reading confidence', 'memory'],
      suggested_age_range: '5-9',
      supported_gate_tags: ['learning', 'confidence'],
      content_source_type: 'shared_word_bank_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['learning', 'confidence'],
      secondary_gates: ['focus'],
      signal_confidence: 'strong',
      signal_categories: ['literacy_practice', 'attention_focus', 'recovery_after_setback'],
      suggested_mode_preset: 'support',
      suggested_practice_path: 'confidence_builder',
      parent_reflection_prompt: 'What did your child do after a missed word or mistake?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'Content remains kid-safe and standalone for now.'
    },
    {
      game_key: 'surf',
      title: 'Surf',
      file_path: '/gamehub/surf',
      launch_path: '/gamehub/surf.html',
      description: 'Endless-runner style reflex game with fallback configuration.',
      game_type: 'arcade',
      primary_capacities: ['reaction control', 'resilience'],
      suggested_age_range: '7-14',
      supported_gate_tags: ['persistence', 'focus'],
      content_source_type: 'config_with_fallback',
      config_ready: true,
      tracking_ready: false,
      adapter_ready: true,
      local_instrumentation_ready: true,
      instrumentation_status: 'local_pilot_ready',
      primary_gates: ['persistence', 'focus'],
      secondary_gates: ['resilience'],
      signal_confidence: 'medium',
      signal_categories: ['body_timing', 'recovery_after_setback', 'persistence', 'attention_focus', 'emotional_regulation'],
      suggested_mode_preset: 'standard',
      suggested_practice_path: 'timing_and_recovery',
      parent_reflection_prompt: 'Did your child choose a safer challenge or a harder challenge?',
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No player identity binding in this phase.'
    }
  ]);



  const SUPPORTED_MODE_PRESETS = Object.freeze(['support', 'standard', 'challenge']);
  const SAFE_TOKEN_PATTERN = /^[a-z0-9_-]{1,64}$/;

  function isSafeOptionalToken(value) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return SAFE_TOKEN_PATTERN.test(normalized);
  }

  function buildLaunchPathWithContext(launchPath, context) {
    const query = new URLSearchParams(context);
    const separator = launchPath.includes('?') ? '&' : '?';
    return `${launchPath}${separator}${query.toString()}`;
  }

  function getLaunchContextForGame(gameKey, options) {
    const entry = getGameByKey(gameKey);
    if (!entry || !entry.launch_path) return null;

    const source = options && typeof options === 'object' ? options : {};
    const normalized = { game_key: entry.game_key };

    if (Object.prototype.hasOwnProperty.call(source, 'gate_context')) {
      if (!isSafeOptionalToken(source.gate_context)) return null;
      normalized.gate_context = String(source.gate_context).trim().toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(source, 'practice_path')) {
      if (!isSafeOptionalToken(source.practice_path)) return null;
      normalized.practice_path = String(source.practice_path).trim().toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(source, 'mode_preset')) {
      const candidate = typeof source.mode_preset === 'string' ? source.mode_preset.trim().toLowerCase() : '';
      if (!SUPPORTED_MODE_PRESETS.includes(candidate)) return null;
      normalized.mode_preset = candidate;
    }

    return {
      context: normalized,
      launch_path: buildLaunchPathWithContext(entry.launch_path, normalized)
    };
  }

  function listGames() {
    return GAMEHUB_REGISTRY.slice();
  }

  function getGameByKey(gameKey) {
    return GAMEHUB_REGISTRY.find((entry) => entry.game_key === gameKey) || null;
  }

  function getLaunchableGames(context) {
    if (!context || context === 'public') {
      return GAMEHUB_REGISTRY.filter((entry) => entry.public_launch_allowed);
    }
    if (context === 'parent') {
      return GAMEHUB_REGISTRY.filter((entry) => entry.parent_context_launch_allowed);
    }
    if (context === 'child') {
      return GAMEHUB_REGISTRY.filter((entry) => entry.child_context_launch_allowed);
    }
    return [];
  }

  function getGamesByGate(gateNumberOrKey) {
    const normalized = String(gateNumberOrKey || '').trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    const resolvedGateKey = GATE_KEY_ALIASES[normalized] || normalized;
    return GAMEHUB_REGISTRY.filter((entry) => {
      const primary = Array.isArray(entry.primary_gates) ? entry.primary_gates : [];
      const secondary = Array.isArray(entry.secondary_gates) ? entry.secondary_gates : [];
      const supported = Array.isArray(entry.supported_gate_tags) ? entry.supported_gate_tags : [];
      return primary.includes(resolvedGateKey)
        || secondary.includes(resolvedGateKey)
        || supported.includes(resolvedGateKey);
    });
  }

  function hasValidSuggestedMetadata(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const hasPreset = Object.prototype.hasOwnProperty.call(entry, 'suggested_mode_preset');
    const hasPath = Object.prototype.hasOwnProperty.call(entry, 'suggested_practice_path');
    if (!hasPreset && !hasPath) return true;
    if (hasPreset) {
      const preset = typeof entry.suggested_mode_preset === 'string' ? entry.suggested_mode_preset.trim().toLowerCase() : '';
      if (!SUPPORTED_MODE_PRESETS.includes(preset)) return false;
    }
    if (hasPath && !isSafeOptionalToken(entry.suggested_practice_path)) return false;
    return true;
  }

  function getGateAlignmentSummary() {
    const gateMap = new Map();

    GAMEHUB_REGISTRY.forEach((entry) => {
      if (entry.instrumentation_status !== 'local_pilot_ready') {
        return;
      }
      if (entry.local_instrumentation_ready !== true || entry.tracking_ready !== false || entry.game_key === 'checkers') {
        return;
      }

      const gateKeys = [];
      if (Array.isArray(entry.primary_gates)) {
        gateKeys.push(...entry.primary_gates);
      }
      if (Array.isArray(entry.secondary_gates)) {
        gateKeys.push(...entry.secondary_gates);
      }

      gateKeys.forEach((gateKey) => {
        if (!gateKey) return;
        const normalizedGateKey = String(gateKey).trim().toLowerCase();
        if (!normalizedGateKey) return;
        if (!gateMap.has(normalizedGateKey)) {
          gateMap.set(normalizedGateKey, {
            gate_key: normalizedGateKey,
            gate_name: normalizedGateKey,
            games: []
          });
        }
        gateMap.get(normalizedGateKey).games.push(entry);
      });
    });

    return Array.from(gateMap.values()).sort((a, b) => a.gate_name.localeCompare(b.gate_name));
  }

  return {
    GAMEHUB_REGISTRY,
    listGames,
    getGameByKey,
    getLaunchableGames,
    getGamesByGate,
    getGateAlignmentSummary,
    getLaunchContextForGame,
    hasValidSuggestedMetadata
  };
});
