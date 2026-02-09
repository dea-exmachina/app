-- NEXUS Discord Notifications — per-board webhook via pg_net
-- Fires on actionable comment types (question, directive, rejection, review, pivots).
-- Silent for notes and delivery comments (no spam).
-- Reads webhook URL from nexus_projects.metadata->>'discord_webhook_url'.
-- Projects without a webhook URL are silently skipped.

-- Ensure pg_net extension is available (ships with Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Discord notification function
CREATE OR REPLACE FUNCTION nexus_discord_comment_notify()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  card_display_id TEXT;
  project_name TEXT;
  embed_color INTEGER;
  type_label TEXT;
  payload JSONB;
BEGIN
  -- Only notify for actionable comment types
  IF NEW.comment_type NOT IN ('question', 'directive', 'rejection', 'review')
     AND NEW.is_pivot = false THEN
    RETURN NEW;
  END IF;

  -- Resolve card display ID and project webhook URL in one query
  SELECT nc.card_id, np.name, np.metadata->>'discord_webhook_url'
  INTO card_display_id, project_name, webhook_url
  FROM nexus_cards nc
  LEFT JOIN nexus_projects np ON nc.project_id = np.id
  WHERE nc.id = NEW.card_id;

  -- Graceful degradation: no webhook configured for this project
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN NEW;
  END IF;

  -- Color coding by type (Discord embed color as integer)
  embed_color := CASE NEW.comment_type
    WHEN 'question'  THEN 16760576  -- #FFB300 amber
    WHEN 'directive'  THEN 3443387  -- #348ABB blue
    WHEN 'rejection'  THEN 15548997 -- #ED4245 red
    WHEN 'review'     THEN 5763719  -- #57F287 green
    ELSE 8421504                    -- #808080 gray (pivot fallback)
  END;

  -- Build type label
  type_label := UPPER(NEW.comment_type);
  IF NEW.is_pivot THEN
    type_label := type_label || ' [PIVOT/' || UPPER(COALESCE(NEW.pivot_impact, 'minor')) || ']';
  END IF;

  -- Build Discord embed payload
  payload := jsonb_build_object(
    'embeds', jsonb_build_array(
      jsonb_build_object(
        'title', type_label || ' on ' || COALESCE(card_display_id, 'unknown'),
        'description', LEFT(NEW.content, 500),
        'color', embed_color,
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'Author', 'value', NEW.author, 'inline', true),
          jsonb_build_object('name', 'Card', 'value', COALESCE(card_display_id, 'N/A'), 'inline', true),
          jsonb_build_object('name', 'Board', 'value', COALESCE(project_name, 'N/A'), 'inline', true)
        ),
        'timestamp', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
  );

  -- Fire and forget via pg_net (async, non-blocking)
  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fire after comment insert
CREATE TRIGGER nexus_comment_discord_notify
  AFTER INSERT ON nexus_comments
  FOR EACH ROW
  EXECUTE FUNCTION nexus_discord_comment_notify();
