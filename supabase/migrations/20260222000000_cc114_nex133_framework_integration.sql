-- CC-114: Add p_framework_ids to create_nexus_card() proc
-- NEX-133: Add framework_hint column to bender_tasks
-- Applied via MCP 2026-02-22

-- CC-114: Update create_nexus_card() to accept and persist framework_ids
CREATE OR REPLACE FUNCTION public.create_nexus_card(
  p_project_slug text,
  p_title text,
  p_card_type text DEFAULT 'task'::text,
  p_summary text DEFAULT NULL::text,
  p_lane text DEFAULT 'backlog'::text,
  p_priority text DEFAULT 'normal'::text,
  p_delegation_tag text DEFAULT 'DEA'::text,
  p_delegation_justification text DEFAULT NULL::text,
  p_assigned_to text DEFAULT NULL::text,
  p_assigned_model text DEFAULT NULL::text,
  p_source text DEFAULT NULL::text,
  p_parent_card_id text DEFAULT NULL::text,
  p_tags text[] DEFAULT '{}'::text[],
  p_bender_lane text DEFAULT NULL::text,
  p_overview text DEFAULT NULL::text,
  p_requirements text DEFAULT NULL::text,
  p_acceptance_criteria text DEFAULT NULL::text,
  p_deliverables text DEFAULT NULL::text,
  p_constraints text DEFAULT NULL::text,
  p_framework_ids text[] DEFAULT NULL::text[]
)
RETURNS TABLE(out_card_id text, out_card_uuid uuid, out_project_slug text)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_project_id UUID; v_parent_uuid UUID; v_card_uuid UUID; v_card_id TEXT;
  v_valid_lanes TEXT[] := ARRAY['backlog','ready','in_progress','review','done','ideas','drafts','unpublished','published','archive'];
  v_valid_card_types TEXT[] := ARRAY['epic','task','bug','chore','research','article'];
  v_valid_priorities TEXT[] := ARRAY['critical','high','normal','low'];
  v_valid_delegation TEXT[] := ARRAY['BENDER','DEA'];
  v_valid_bender_lanes TEXT[] := ARRAY['proposed','queued','executing','delivered','integrated'];
  v_bender_retired_at TIMESTAMPTZ;
BEGIN
  SET search_path TO 'public';

  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'p_title is required and cannot be empty'; END IF;
  IF p_card_type != ALL(v_valid_card_types) THEN RAISE EXCEPTION 'Invalid card_type: %. Valid: %', p_card_type, array_to_string(v_valid_card_types, ', '); END IF;
  IF p_lane != ALL(v_valid_lanes) THEN RAISE EXCEPTION 'Invalid lane: %. Valid: %', p_lane, array_to_string(v_valid_lanes, ', '); END IF;
  IF p_priority != ALL(v_valid_priorities) THEN RAISE EXCEPTION 'Invalid priority: %. Valid: %', p_priority, array_to_string(v_valid_priorities, ', '); END IF;
  IF p_delegation_tag != ALL(v_valid_delegation) THEN RAISE EXCEPTION 'Invalid delegation_tag: %. Valid: BENDER, DEA', p_delegation_tag; END IF;
  IF p_bender_lane IS NOT NULL AND p_bender_lane != ALL(v_valid_bender_lanes) THEN RAISE EXCEPTION 'Invalid bender_lane: %. Valid: %', p_bender_lane, array_to_string(v_valid_bender_lanes, ', '); END IF;

  IF p_assigned_to IS NOT NULL THEN
    SELECT retired_at INTO v_bender_retired_at
    FROM bender_identities
    WHERE slug = p_assigned_to;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'assigned_to "%" is not a valid bender slug. Must exist in bender_identities.', p_assigned_to;
    END IF;

    IF v_bender_retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'assigned_to "%" is a retired bender (retired at %). Cannot assign to retired benders.', p_assigned_to, v_bender_retired_at;
    END IF;
  END IF;

  SELECT id INTO v_project_id FROM nexus_projects WHERE slug = p_project_slug;
  IF v_project_id IS NULL THEN RAISE EXCEPTION 'Unknown project_slug: %', p_project_slug; END IF;

  IF p_parent_card_id IS NOT NULL THEN
    SELECT id INTO v_parent_uuid FROM nexus_cards WHERE card_id = p_parent_card_id;
    IF v_parent_uuid IS NULL THEN RAISE EXCEPTION 'Parent card not found: %', p_parent_card_id; END IF;
  END IF;

  INSERT INTO nexus_cards (project_id, parent_id, title, summary, card_type, lane, bender_lane, priority, delegation_tag, delegation_justification, assigned_to, assigned_model, source, tags, framework_ids)
  VALUES (v_project_id, v_parent_uuid, trim(p_title), normalize_newlines(p_summary), p_card_type, p_lane, p_bender_lane, p_priority, p_delegation_tag, normalize_newlines(p_delegation_justification), p_assigned_to, p_assigned_model, p_source, COALESCE(p_tags, '{}'), p_framework_ids)
  RETURNING id, card_id INTO v_card_uuid, v_card_id;

  IF p_overview IS NOT NULL THEN
    INSERT INTO nexus_task_details (card_id, overview, requirements, acceptance_criteria, deliverables, constraints)
    VALUES (v_card_uuid, normalize_newlines(p_overview), normalize_newlines(p_requirements), normalize_newlines(p_acceptance_criteria), normalize_newlines(p_deliverables), normalize_newlines(p_constraints));
  END IF;

  RETURN QUERY SELECT v_card_id, v_card_uuid, p_project_slug;
END;
$function$;

-- NEX-133: Add framework_hint column to bender_tasks
ALTER TABLE public.bender_tasks
ADD COLUMN IF NOT EXISTS framework_hint text[] DEFAULT NULL;

COMMENT ON COLUMN public.bender_tasks.framework_hint IS 'Framework canonical IDs the bender should apply when executing this task (e.g. ARRAY[''ogsm'', ''first-principles''])';
