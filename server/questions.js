const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");

    let type = mode === "60" ? "full" : "fast";
    let limit = mode === "60" ? 60 : 25;

    const result = await pool.query(
      `SELECT * FROM questions
       WHERE type = $1
       ORDER BY id ASC
       LIMIT $2`,
      [type, limit]
    );

    const raw = result.rows;

    console.log("📊 QUESTIONS DEBUG:", {
      mode,
      type,
      count: raw.length
    });

    const questions = raw.map((q) => ({
      qid: q.qid,
      question: q.question,
      option_a: q.options?.A || "",
      option_b: q.options?.B || "",
      option_c: q.options?.C || "",
      option_d: q.options?.D || "",
      type: q.type
    }));

    res.json({
      mode,
      type,
      count: questions.length,
      questions
    });

  } catch (err) {
    console.error("❌ API ERROR:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

module.exports = router;
