-- NEX-129: Add execution_mode to task_type_routing
-- Distinguishes claude_task (agentic) vs gemini_api (completion) vs gemini_cli (future)
-- Applied: 2026-02-21 | dev + prod

ALTER TABLE task_type_routing
ADD COLUMN IF NOT EXISTS execution_mode TEXT
  NOT NULL DEFAULT 'claude_task'
  CHECK (execution_mode IN ('claude_task', 'gemini_api', 'gemini_cli'));

UPDATE task_type_routing SET execution_mode = 'gemini_api'
  WHERE task_type IN ('research', 'documentation', 'code-review');

UPDATE task_type_routing SET execution_mode = 'claude_task'
  WHERE task_type IN ('frontend', 'backend', 'testing', 'debugging', 'architecture', 'council', 'governance');
