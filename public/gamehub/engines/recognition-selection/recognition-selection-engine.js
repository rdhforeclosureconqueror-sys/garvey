(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.RecognitionSelectionEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRecognitionSelectionEngineModule() {
  const DEFAULTS = Object.freeze({
    maxAttemptsPerQuestion: 2,
    masteryThreshold: 0.8
  });

  function clampAnswerCount(choices) {
    if (!Array.isArray(choices)) return [];
    return choices.slice(0, 4);
  }

  function validateQuestion(question, index) {
    const choices = clampAnswerCount(question.choices);
    if (!question.id || !question.prompt) {
      throw new Error(`Invalid question at index ${index}: id and prompt are required.`);
    }
    if (choices.length < 2) {
      throw new Error(`Invalid question ${question.id}: requires 2-4 choices.`);
    }
    if (!choices.some((c) => c.id === question.correct_choice_id)) {
      throw new Error(`Invalid question ${question.id}: correct_choice_id not found.`);
    }
    return { ...question, choices };
  }

  function validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('content config object is required');
    }
    if (!config.skill_id || !config.questions || !Array.isArray(config.questions)) {
      throw new Error('content config requires skill_id and questions[]');
    }
    return {
      ...config,
      questions: config.questions.map(validateQuestion)
    };
  }

  function createEngineSession(config, deps) {
    const normalized = validateConfig(config);
    const options = {
      ...DEFAULTS,
      ...(normalized.engine_options || {})
    };

    const sessionAdapter = deps && deps.sessionAdapter;
    const ttsHook = deps && typeof deps.ttsHook === 'function' ? deps.ttsHook : null;

    let currentIndex = 0;
    let correctCount = 0;
    const attemptByQuestion = {};
    const results = [];

    if (sessionAdapter && typeof sessionAdapter.startSession === 'function') {
      sessionAdapter.startSession({
        game_key: 'recognition_selection_engine',
        skill_key: normalized.skill_id,
        subject: normalized.subject,
        grade: normalized.grade
      });
    }

    function getCurrentQuestion() {
      return normalized.questions[currentIndex] || null;
    }

    function getQuestionView() {
      const q = getCurrentQuestion();
      if (!q) return null;
      const attempts = attemptByQuestion[q.id] || 0;
      return {
        skill_id: normalized.skill_id,
        mission_id: normalized.mission_id,
        question_id: q.id,
        prompt: q.prompt,
        image_url: q.image_url || null,
        tts_text: q.tts_text || q.prompt,
        choices: q.choices,
        hint: attempts > 0 ? q.hint || null : null,
        attempts_remaining: Math.max(0, options.maxAttemptsPerQuestion - attempts)
      };
    }

    function playPromptAudio() {
      const q = getCurrentQuestion();
      if (!q || !ttsHook) return { played: false, reason: 'tts_hook_unavailable' };
      ttsHook({ text: q.tts_text || q.prompt, question_id: q.id, skill_id: normalized.skill_id });
      return { played: true };
    }

    function submitAnswer(choiceId) {
      const q = getCurrentQuestion();
      if (!q) {
        return { done: true, error: 'session_complete' };
      }

      const attempts = (attemptByQuestion[q.id] || 0) + 1;
      attemptByQuestion[q.id] = attempts;
      const isCorrect = q.correct_choice_id === choiceId;

      if (sessionAdapter && typeof sessionAdapter.emit === 'function') {
        sessionAdapter.emit('round_completed', {
          question_id: q.id,
          attempt_number: attempts,
          correct: isCorrect,
          skill_id: normalized.skill_id
        });
      }

      if (isCorrect) {
        correctCount += 1;
        results.push({ question_id: q.id, correct: true, attempts });
        currentIndex += 1;
        return {
          correct: true,
          feedback: q.feedback_correct || 'Nice work!',
          try_again: false,
          next_question: getQuestionView(),
          progress: getProgress()
        };
      }

      const canRetry = attempts < options.maxAttemptsPerQuestion;
      if (canRetry) {
        if (sessionAdapter && typeof sessionAdapter.emit === 'function') {
          sessionAdapter.emit('retry_started', { question_id: q.id, attempt_number: attempts });
        }
        return {
          correct: false,
          feedback: q.feedback_incorrect || 'Try again.',
          try_again: true,
          hint: q.hint || null,
          next_question: getQuestionView(),
          progress: getProgress()
        };
      }

      results.push({ question_id: q.id, correct: false, attempts });
      currentIndex += 1;
      return {
        correct: false,
        feedback: q.feedback_incorrect || 'Keep going!',
        try_again: false,
        reveal_explanation: q.explanation || null,
        next_question: getQuestionView(),
        progress: getProgress()
      };
    }

    function getProgress() {
      const total = normalized.questions.length;
      const completed = results.length;
      const accuracy = completed > 0 ? correctCount / completed : 0;
      return {
        total_questions: total,
        completed_questions: completed,
        correct_questions: correctCount,
        mastery_ratio: Number(accuracy.toFixed(2)),
        mastery_reached: accuracy >= options.masteryThreshold,
        done: completed >= total
      };
    }

    function finalize() {
      const progress = getProgress();
      const mastery_signal = {
        skill_id: normalized.skill_id,
        mastery_ratio: progress.mastery_ratio,
        mastery_reached: progress.mastery_reached,
        completed_questions: progress.completed_questions,
        total_questions: progress.total_questions,
        engine_family: 'recognition_selection'
      };

      if (sessionAdapter && typeof sessionAdapter.endSession === 'function') {
        sessionAdapter.endSession({
          skill_id: normalized.skill_id,
          mastery_ratio: mastery_signal.mastery_ratio,
          completed_questions: mastery_signal.completed_questions
        });
      }

      return {
        mission_id: normalized.mission_id,
        skill_id: normalized.skill_id,
        subject: normalized.subject,
        results,
        progress,
        mastery_signal
      };
    }

    return {
      getQuestionView,
      submitAnswer,
      getProgress,
      playPromptAudio,
      finalize,
      config_meta: {
        skill_id: normalized.skill_id,
        grade: normalized.grade,
        subject: normalized.subject,
        domain: normalized.domain,
        mission_id: normalized.mission_id
      }
    };
  }

  return {
    createEngineSession,
    validateConfig
  };
});
