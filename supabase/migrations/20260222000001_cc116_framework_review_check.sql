-- CC-116/117: framework_review_check() pg_cron quarterly function
-- Detects stale frameworks (0 citations in 90 days) and creates a council card + Discord alert
-- Scheduled: quarterly (9am on 1st of Jan/Apr/Jul/Oct)
-- Applied to dev + prod (2026-02-21)
--
-- Also fixes:
--   - create_nexus_card() INSERT cast: p_framework_ids::nexus_framework_id[]
--   - 'ogsm' was missing from nexus_framework_id enum (added via ADD VALUE)
--   - Dev instance: nexus_generate_card_id() trigger + webhook_log table were missing

-- 1. Add missing 'ogsm' enum value (idempotent)
ALTER TYPE nexus_framework_id ADD VALUE IF NOT EXISTS 'ogsm';

-- 2. Fix create_nexus_card() — add ::nexus_framework_id[] cast on INSERT
CREATE OR REPLACE FUNCTION public.create_nexus_card(
  p_project_slug            text,
  p_title                   text,
  p_card_type               text    DEFAULT 'task',
  p_lane                    text    DEFAULT 'backlog',
  p_summary                 text    DEFAULT NULL,
  p_priority                text    DEFAULT 'normal',
  p_delegation_tag          text    DEFAULT 'DEA',
  p_delegation_justification text   DEFAULT NULL,
  p_assigned_to             text    DEFAULT NULL,
  p_assigned_model          text    DEFAULT NULL,
  p_source                  text    DEFAULT NULL,
  p_tags                    text[]  DEFAULT NULL,
  p_bender_lane             text    DEFAULT NULL,
  p_parent_card_id          text    DEFAULT NULL,
  p_overview                text    DEFAULT NULL,
  p_requirements            text    DEFAULT NULL,
  p_acceptance_criteria     text    DEFAULT NULL,
  p_deliverables            text    DEFAULT NULL,
  p_constraints             text    DEFAULT NULL,
  p_framework_ids           text[]  DEFAULT NULL
)
RETURNS TABLE(out_card_id text, out_card_uuid uuid, out_project_slug text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  VALUES (v_project_id, v_parent_uuid, trim(p_title), normalize_newlines(p_summary), p_card_type, p_lane, p_bender_lane, p_priority, p_delegation_tag, normalize_newlines(p_delegation_justification), p_assigned_to, p_assigned_model, p_source, COALESCE(p_tags, '{}'), p_framework_ids::nexus_framework_id[])
  RETURNING id, card_id INTO v_card_uuid, v_card_id;

  IF p_overview IS NOT NULL THEN
    INSERT INTO nexus_task_details (card_id, overview, requirements, acceptance_criteria, deliverables, constraints)
    VALUES (v_card_uuid, normalize_newlines(p_overview), normalize_newlines(p_requirements), normalize_newlines(p_acceptance_criteria), normalize_newlines(p_deliverables), normalize_newlines(p_constraints));
  END IF;

  RETURN QUERY SELECT v_card_id, v_card_uuid, p_project_slug;
END;
$$;

-- 3. framework_review_check() quarterly cron function
CREATE OR REPLACE FUNCTION public.framework_review_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_known_ids text[] := ARRAY[
    'ogsm', 'pre-mortem', 'working-backwards', 'rice',
    'tdd', 'separation-of-concerns', 'integration-first', 'progressive-enhancement',
    'pyramid-principle', 'scqa', 'documentation-as-code',
    'design-thinking', 'visual-first', 'atomic-design',
    'first-principles', 'swot', 'inversion', 'second-order-thinking', 'jtbd',
    'stoic-control', 'occams-razor', 'via-negativa',
    'raci', 'capability-mapping', 'tuckman',
    'rfc', 'retrospective', 'decision-log',
    'five-whys', 'issue-trees', 'constraint-analysis', 'cynefin',
    'hive-team-construction'
  ];
  v_stale_ids   text[] := '{}';
  v_fwid        text;
  v_cite_count  int;
  v_stale_list  text;
  v_card_id     text;
  v_council_webhook text;
  v_embed       jsonb;
  v_result      jsonb;
BEGIN
  -- 1. Find stale frameworks (0 citations in past 90 days)
  FOREACH v_fwid IN ARRAY v_known_ids LOOP
    SELECT COUNT(*) INTO v_cite_count
    FROM nexus_cards
    WHERE framework_ids::text[] @> ARRAY[v_fwid]
      AND updated_at > now() - interval '90 days';

    IF v_cite_count = 0 THEN
      v_stale_ids := v_stale_ids || v_fwid;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'checked_at',       now(),
    'total_frameworks', array_length(v_known_ids, 1),
    'stale_count',      array_length(v_stale_ids, 1),
    'stale_ids',        to_jsonb(v_stale_ids)
  );

  -- 2. Nothing stale — return early
  IF array_length(v_stale_ids, 1) IS NULL OR array_length(v_stale_ids, 1) = 0 THEN
    RETURN v_result;
  END IF;

  v_stale_list := array_to_string(v_stale_ids, ', ');

  -- 3. Create council card
  SELECT out_card_id
  INTO v_card_id
  FROM create_nexus_card(
    p_project_slug   => 'council',
    p_title          => format('Framework Library Review — %s stale framework(s) detected', array_length(v_stale_ids, 1)),
    p_card_type      => 'chore',
    p_lane           => 'backlog',
    p_priority       => 'normal',
    p_delegation_tag => 'DEA',
    p_source         => 'framework_review_check',
    p_summary        => format(
      'PROBLEM: %s framework(s) in library-v01.md have 0 citations in the last 90 days and may be candidates for pruning via Via Negativa.%s%sFRAMEWORKS: %s%s%sSOLUTION: Review each stale framework. For each: (a) cite it on a real card if still valuable, or (b) open a removal PR with Via Negativa justification if superseded or not context-fit.%s%sUSER IMPACT: Framework library stays lean and high-signal. Every framework in the library is one the system actually uses.',
      array_length(v_stale_ids, 1), chr(10), chr(10),
      v_stale_list, chr(10), chr(10), chr(10), chr(10)
    ),
    p_framework_ids  => NULL
  );

  v_result := v_result || jsonb_build_object('card_id', v_card_id);

  -- 4. Discord alert (council webhook from project metadata)
  SELECT metadata->>'discord_webhook_url'
  INTO v_council_webhook
  FROM nexus_projects WHERE slug = 'council';

  IF v_council_webhook IS NOT NULL THEN
    v_embed := jsonb_build_object(
      'title',       format('[%s] Framework Library Stale Alert', v_card_id),
      'description', format('%s framework(s) have 0 citations in 90 days: %s', array_length(v_stale_ids, 1), v_stale_list),
      'color',       15105570,  -- orange
      'fields', jsonb_build_array(
        jsonb_build_object('name', 'Card', 'value', v_card_id, 'inline', true),
        jsonb_build_object('name', 'Stale Count', 'value', array_length(v_stale_ids, 1)::text, 'inline', true)
      )
    );

    PERFORM net.http_post(
      url     := v_council_webhook,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('embeds', jsonb_build_array(v_embed))::text
    );

    PERFORM log_webhook_call(
      p_source     := 'framework_review_discord',
      p_target_url := v_council_webhook,
      p_payload    := jsonb_build_object('embeds', jsonb_build_array(v_embed)),
      p_success    := NULL,
      p_metadata   := jsonb_build_object('stale_count', array_length(v_stale_ids, 1), 'card_id', v_card_id)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 4. Schedule quarterly review
SELECT cron.schedule(
  'framework-review-quarterly',
  '0 9 1 1,4,7,10 *',
  'SELECT framework_review_check()'
);
