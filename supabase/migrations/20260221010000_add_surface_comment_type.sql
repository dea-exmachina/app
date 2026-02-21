-- CC-124: Add 'surface' to nexus_comments comment_type constraint
-- SURFACE comments are posted by the webapp when promoting backlog→ready
-- to satisfy trg_surface_gate. Distinct type enables filtering in audit views.

ALTER TABLE nexus_comments DROP CONSTRAINT nexus_comments_comment_type_check;
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_comment_type_check
  CHECK (comment_type = ANY (ARRAY[
    'note', 'pivot', 'question', 'directive', 'delivery',
    'review', 'rejection', 'system', 'transition', 'dispatch', 'surface'
  ]));
