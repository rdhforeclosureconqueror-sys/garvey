const { Pool } = require("pg");
const { seed } = require("./seedQuestions");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
connectionString
? {
connectionString,
ssl: connectionString.includes("localhost")
? false
: { rejectUnauthorized: false }
}
: {
host: process.env.PGHOST || "127.0.0.1",
port: Number(process.env.PGPORT) || 5432,
user: process.env.PGUSER || "postgres",
password: process.env.PGPASSWORD || "postgres",
database: process.env.PGDATABASE || "garvey"
}
);

// 🔥 THIS IS THE IMPORTANT PART
async function initDB() {
try {
console.log("🧠 Initializing database...");

```
await seed(pool); // 👈 THIS runs your seed file properly

console.log("✅ Database ready");
```

} catch (err) {
console.error("❌ DB INIT ERROR:", err);
throw err;
}
}

// run it
initDB();

module.exports = { pool };
