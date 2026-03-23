// FILE: server/kanbanDb.js
"use strict";

async function initializeKanbanSchema(pool) {
  // Top-tier: tenant-scoped, indexed, auditable
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kanban_boards (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      board_key TEXT NOT NULL,                 -- e.g. "garvey"
      name TEXT NOT NULL DEFAULT 'GARVEY Board',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, board_key)
    );

    CREATE TABLE IF NOT EXISTS kanban_columns (
      id BIGSERIAL PRIMARY KEY,
      board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
      phase TEXT NOT NULL,                     -- G/A/R/V/E/Y
      name TEXT NOT NULL,
      position INT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (board_id, phase, position)
    );

    CREATE TABLE IF NOT EXISTS kanban_cards (
      id BIGSERIAL PRIMARY KEY,
      board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
      phase TEXT NOT NULL,                     -- G/A/R/V/E/Y
      column_id BIGINT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal',  -- low/normal/high/urgent
      due_date DATE,
      position INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',      -- open/done/blocked
      created_by TEXT NOT NULL DEFAULT 'system',
      assigned_to TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS kanban_card_events (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
      card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
      actor TEXT NOT NULL DEFAULT 'system',
      event_type TEXT NOT NULL,                -- created/updated/moved/comment/closed/reopened
      from_column_id BIGINT,
      to_column_id BIGINT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS kanban_boards_tenant_idx ON kanban_boards(tenant_id);
    CREATE INDEX IF NOT EXISTS kanban_columns_board_phase_idx ON kanban_columns(board_id, phase, position);
    CREATE INDEX IF NOT EXISTS kanban_cards_board_phase_idx ON kanban_cards(board_id, phase, column_id, position);
    CREATE INDEX IF NOT EXISTS kanban_events_tenant_board_idx ON kanban_card_events(tenant_id, board_id, created_at DESC);
  `);
}

module.exports = { initializeKanbanSchema };
