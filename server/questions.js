```javascript id="p9n1xz"
const express = require("express");
const router = express.Router();
const { pool } = require("./db");

router.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");

    // 🔥 MAP MODE → TYPE (FIXED)
    let type;
    let limit;

    if (mode === "60") {
      type = "extended";
      limit = 60;
    } else {
      type = "core";
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

    // 🚨 DEBUG OUTPUT
    console.log("📊 QUESTIONS DEBUG:");
    console.log("mode:", mode);
    console.log("type:", type);
    console.log("count:", raw.length);

    if (!raw.length) {
      return res.status(200).json({
        warning: "No questions found",
        mode,
        type,
        count: 0,
        questions: []
      });
    }

    // 🔒 LOCKED API FORMAT
    const questions = raw.map((q) => ({
      qid: q.qid,
      question: q.question,
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
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
```
