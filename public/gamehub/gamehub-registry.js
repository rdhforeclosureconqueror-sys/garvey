(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.GameHubRegistry = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGameHubRegistryModule() {
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
      public_launch_allowed: true,
      parent_context_launch_allowed: true,
      child_context_launch_allowed: true,
      safety_notes: 'No player identity binding in this phase.'
    }
  ]);

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

  return {
    GAMEHUB_REGISTRY,
    listGames,
    getGameByKey,
    getLaunchableGames
  };
});
