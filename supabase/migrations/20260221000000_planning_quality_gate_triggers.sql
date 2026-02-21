-- Planning Quality Gate Triggers
-- DEA-270: trg_surface_gate  — block backlog→ready without SURFACE comment
-- DEA-271: trg_preflight_gate — block queued→executing without PRE-FLIGHT comment
-- DEA-272: trg_learning_gate  — block executing→delivered without LEARNING comment
-- Applied: 2026-02-21 | dev + prod

CREATE OR REPLACE FUNCTION fn_surface_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_has_surface BOOLEAN;
BEGIN
  IF OLD.lane = 'backlog' AND NEW.lane = 'ready' THEN
    SELECT EXISTS (
      SELECT 1 FROM nexus_comments
      WHERE card_id = NEW.id AND content ILIKE 'SURFACE:%'
        AND created_at >= NOW() - INTERVAL '7 days'
    ) INTO v_has_surface;
    IF NOT v_has_surface THEN
      RAISE EXCEPTION 'SURFACE gate: card % cannot move backlog→ready without a SURFACE comment.', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_surface_gate ON nexus_cards;
CREATE TRIGGER trg_surface_gate
  BEFORE UPDATE OF lane ON nexus_cards FOR EACH ROW EXECUTE FUNCTION fn_surface_gate();

CREATE OR REPLACE FUNCTION fn_preflight_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_has_preflight BOOLEAN;
BEGIN
  IF OLD.bender_lane = 'queued' AND NEW.bender_lane = 'executing' THEN
    SELECT EXISTS (
      SELECT 1 FROM nexus_comments
      WHERE card_id = NEW.id AND content ILIKE 'PRE-FLIGHT:%'
        AND created_at >= NOW() - INTERVAL '7 days'
    ) INTO v_has_preflight;
    IF NOT v_has_preflight THEN
      RAISE EXCEPTION 'PRE-FLIGHT gate: card % cannot move queued→executing without a PRE-FLIGHT comment.', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preflight_gate ON nexus_cards;
CREATE TRIGGER trg_preflight_gate
  BEFORE UPDATE OF bender_lane ON nexus_cards FOR EACH ROW EXECUTE FUNCTION fn_preflight_gate();

CREATE OR REPLACE FUNCTION fn_learning_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_has_learning BOOLEAN;
BEGIN
  IF OLD.bender_lane = 'executing' AND NEW.bender_lane = 'delivered' THEN
    SELECT EXISTS (
      SELECT 1 FROM nexus_comments
      WHERE card_id = NEW.id AND content ILIKE '%LEARNING:%'
        AND created_at >= NOW() - INTERVAL '7 days'
    ) INTO v_has_learning;
    IF NOT v_has_learning THEN
      RAISE EXCEPTION 'LEARNING gate: card % cannot move executing→delivered without a LEARNING comment.', NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_learning_gate ON nexus_cards;
CREATE TRIGGER trg_learning_gate
  BEFORE UPDATE OF bender_lane ON nexus_cards FOR EACH ROW EXECUTE FUNCTION fn_learning_gate();
