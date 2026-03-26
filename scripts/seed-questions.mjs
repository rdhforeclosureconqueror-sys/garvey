#!/usr/bin/env node
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { pool, initializeDatabase } = require("../server/db");
const { seed } = require("../server/seedQuestions");

async function main() {
  await initializeDatabase();
  const count = await seed(pool);
  console.log(`✅ Seeded ${count} questions into questions table.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed", err?.stack || err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
