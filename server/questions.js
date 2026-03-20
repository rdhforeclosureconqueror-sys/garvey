const express = require("express");
const router = express.Router();
const { pool } = require("./db");

router.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");

    // 🔥 FIX TYPE MAPPING (CORRECT WITH DB)
    let type;
    let limit;

    if (mode === "60") {
      type = "full";
      limit = 60;
    } else {
      type = "fast";
      limit = 25;
    }

    const result = await pool.query(
      `SELECT *
       FROM questions
       WHERE type = $1
       ORDER BY id ASC
       LIMIT $2`,
      [type, limit]
    );

    const raw = result.rows;

    // 🔥 DEBUG LOG (CRITICAL)
    console.log("📊 QUESTIONS DEBUG:");
    console.log("mode:", mode);
    console.log("type:", type);
    console.log("count:", raw.length);

    if (!raw.length) {
      return res.json({
        warning: "No questions found",
        mode,
        type,
        count: 0,
        questions: []
      });
    }

    // 🔥 TRANSLATE JSON → FRONTEND FORMAT
    const questions = raw.map((q) => ({
      qid: q.qid,
      question: q.question,

      option_a: q.options?.A || "",
      option_b: q.options?.B || "",
      option_c: q.options?.C || "",
      option_d: q.options?.D || "",

      type: q.type
    }));

    return res.json({
      mode,
      type,
      count: questions.length,
      questions
    });

  } catch (error) {
    console.error("❌ QUESTIONS API ERROR:", error);

    return res.status(500).json({
      error: "Failed to fetch questions"
    });
  }
});

module.exports = router;
