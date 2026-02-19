-- NEXUS-106: pg_net canary + webhook health log
--
-- Problem: pg_net underpins ALL Discord webhooks (new task alerts, inbox items, board health).
-- There is no monitoring to detect when pg_net itself fails. A silent pg_net failure means
-- all webhook-based alerts stop firing — including the ones meant to catch other failures.
--
-- Fix:
--   1. Create webhook_health_log table to record each canary attempt
--   2. Schedule an hourly pg_cron job that fires a canary request to DISCORD_WEBHOOK_ALERTS
--   3. Log result (ok/failed) with response code and latency
--
-- Configuration:
--   The webhook URL is read from a Postgres runtime setting to avoid hardcoding.
--   To configure, run:
--     ALTER DATABASE postgres SET "app.discord_alerts_webhook" = 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN';
--   Then reload: SELECT pg_reload_conf();
--   Or at session level: SET "app.discord_alerts_webhook" = '...';
--
-- The canary fires every hour on the hour. If the webhook returns non-2xx (or times out),
-- status='failed' is logged. The absence of 'ok' rows in webhook_health_log is itself a
-- detectable signal (via a separate query or future watchdog).
--
-- Dependencies: pg_net extension, pg_cron extension, both must be enabled.

-- ---------------------------------------------------------------------------
-- 1. Health log table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhook_health_log (
    id              uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
    checked_at      timestamptz     DEFAULT now() NOT NULL,
    status          text            NOT NULL CHECK (status IN ('ok', 'failed')),
    response_code   int,
    error_message   text,
    latency_ms      int
);

COMMENT ON TABLE webhook_health_log IS
    'Canary ping results for the Discord alerts webhook. Written by the pg_cron job '
    'defined in NEXUS-106. Absence of recent ''ok'' rows = pg_net or webhook is broken.';

-- Index for recency queries (watchdog: "any ok in last 2 hours?")
CREATE INDEX IF NOT EXISTS idx_webhook_health_log_checked_at
    ON webhook_health_log (checked_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Canary function — fires the ping and logs the result
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION webhook_canary_ping()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_webhook_url   text;
    v_start_ms      bigint;
    v_request_id    bigint;
    v_response      record;
    v_latency_ms    int;
    v_status        text;
    v_response_code int;
    v_error_msg     text;
BEGIN
    -- Read webhook URL from runtime setting — never hardcoded
    v_webhook_url := current_setting('app.discord_alerts_webhook', true);

    IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
        INSERT INTO webhook_health_log (status, error_message)
        VALUES ('failed', 'app.discord_alerts_webhook not configured');
        RETURN;
    END IF;

    v_start_ms := EXTRACT(EPOCH FROM clock_timestamp()) * 1000;

    -- Fire canary payload via pg_net (non-blocking HTTP POST)
    SELECT net.http_post(
        url     => v_webhook_url,
        headers => '{"Content-Type": "application/json"}'::jsonb,
        body    => jsonb_build_object(
            'embeds', jsonb_build_array(jsonb_build_object(
                'title',       'Webhook Canary',
                'description', 'pg_net health check — system operational',
                'color',       3145728,  -- Muted green (#300000 placeholder — use 0x2ECC71)
                'footer',      jsonb_build_object('text', 'NEXUS-106 canary | ' || to_char(now(), 'YYYY-MM-DD HH24:MI UTC'))
            ))
        )
    ) INTO v_request_id;

    -- pg_net responses are async; poll _http_response for the result (best-effort, 2s window)
    -- Wait briefly for the response to land
    PERFORM pg_sleep(2);

    SELECT status_code INTO v_response_code
    FROM net._http_response
    WHERE id = v_request_id
    LIMIT 1;

    v_latency_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000 - v_start_ms)::int;

    IF v_response_code IS NOT NULL AND v_response_code BETWEEN 200 AND 299 THEN
        v_status := 'ok';
        v_error_msg := NULL;
    ELSE
        v_status := 'failed';
        v_error_msg := CASE
            WHEN v_response_code IS NULL THEN 'No response received within 2s'
            ELSE 'HTTP ' || v_response_code
        END;
    END IF;

    INSERT INTO webhook_health_log (status, response_code, error_message, latency_ms)
    VALUES (v_status, v_response_code, v_error_msg, v_latency_ms);

EXCEPTION WHEN OTHERS THEN
    -- Catch pg_net unavailable or any other error
    INSERT INTO webhook_health_log (status, error_message)
    VALUES ('failed', SQLERRM);
END;
$$;

COMMENT ON FUNCTION webhook_canary_ping() IS
    'Fires a canary HTTP POST to the Discord alerts webhook and logs the result to '
    'webhook_health_log. Called hourly by the pg_cron job defined in NEXUS-106. '
    'Uses current_setting(''app.discord_alerts_webhook'') — never hardcoded.';

-- ---------------------------------------------------------------------------
-- 3. pg_cron job — schedule canary every hour at :00
-- ---------------------------------------------------------------------------

-- Remove any existing canary job before re-creating (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'nexus106-webhook-canary';

SELECT cron.schedule(
    'nexus106-webhook-canary',  -- job name (unique)
    '0 * * * *',               -- every hour at :00
    'SELECT webhook_canary_ping()'
);

-- ---------------------------------------------------------------------------
-- 4. RLS — health log is internal, no public read
-- ---------------------------------------------------------------------------

ALTER TABLE webhook_health_log ENABLE ROW LEVEL SECURITY;

-- Service role (used by scripts and MCP) can read and write
CREATE POLICY "service_role_full_access" ON webhook_health_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
