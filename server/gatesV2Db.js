'use strict';
const fs=require('node:fs');const path=require('node:path');
const IDS=['001_create_gates_v2_content_releases','002_create_gates_v2_experience_sessions','003_create_gates_v2_experience_events','004_create_gates_v2_idempotency_records'];
const directory=path.join(__dirname,'..','gates-v2','persistence','migrations');
const GATES_V2_MIGRATIONS=IDS.map(id=>({id:`gates-v2-${id}`,sql:fs.readFileSync(path.join(directory,`${id}.sql`),'utf8')}));
async function applyGatesV2Migrations(pool){await pool.query(`CREATE TABLE IF NOT EXISTS gates_schema_migrations (id TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);let appliedCount=0;for(const migration of GATES_V2_MIGRATIONS){const found=await pool.query('SELECT 1 FROM gates_schema_migrations WHERE id=$1',[migration.id]);if(found.rowCount)continue;const client=await pool.connect();try{await client.query('BEGIN');await client.query(migration.sql);await client.query('INSERT INTO gates_schema_migrations(id) VALUES($1)',[migration.id]);await client.query('COMMIT');appliedCount++;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}return{appliedCount,totalMigrations:GATES_V2_MIGRATIONS.length};}
module.exports={GATES_V2_MIGRATIONS,applyGatesV2Migrations};
