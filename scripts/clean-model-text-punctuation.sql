-- Use a comma for em dashes and a regular hyphen for en dashes in generated
-- model-review content. Keep user reviews and source-list metadata unchanged.
UPDATE expert_reviews
SET
  source_name = replace(replace(replace(source_name, ' — ', ', '), '—', ','), '–', '-'),
  original_title = replace(replace(replace(original_title, ' — ', ', '), '—', ','), '–', '-'),
  summary_he = replace(replace(replace(summary_he, ' — ', ', '), '—', ','), '–', '-'),
  local_summary_he = replace(replace(replace(local_summary_he, ' — ', ', '), '—', ','), '–', '-'),
  global_summary_he = replace(replace(replace(global_summary_he, ' — ', ', '), '—', ','), '–', '-'),
  pros = replace(replace(replace(pros, ' — ', ', '), '—', ','), '–', '-'),
  cons = replace(replace(replace(cons, ' — ', ', '), '—', ','), '–', '-'),
  sources_breakdown = replace(replace(replace(sources_breakdown, ' — ', ', '), '—', ','), '–', '-'),
  pros_en = replace(replace(replace(pros_en, ' — ', ', '), '—', ','), '–', '-'),
  cons_en = replace(replace(replace(cons_en, ' — ', ', '), '—', ','), '–', '-'),
  local_summary_en = replace(replace(replace(local_summary_en, ' — ', ', '), '—', ','), '–', '-'),
  global_summary_en = replace(replace(replace(global_summary_en, ' — ', ', '), '—', ','), '–', '-'),
  summary_en = replace(replace(replace(summary_en, ' — ', ', '), '—', ','), '–', '-'),
  safety_he = replace(replace(replace(safety_he, ' — ', ', '), '—', ','), '–', '-'),
  tech_comfort_he = replace(replace(replace(tech_comfort_he, ' — ', ', '), '—', ','), '–', '-'),
  who_for_he = replace(replace(replace(who_for_he, ' — ', ', '), '—', ','), '–', '-'),
  recalls_il_text = replace(replace(replace(recalls_il_text, ' — ', ', '), '—', ','), '–', '-'),
  recalls_nhtsa_text = replace(replace(replace(recalls_nhtsa_text, ' — ', ', '), '—', ','), '–', '-'),
  chips_json = replace(replace(replace(chips_json, ' — ', ', '), '—', ','), '–', '-'),
  pros_cons_note = replace(replace(replace(pros_cons_note, ' — ', ', '), '—', ','), '–', '-')
WHERE
  instr(source_name, '—') > 0 OR instr(source_name, '–') > 0 OR
  instr(original_title, '—') > 0 OR instr(original_title, '–') > 0 OR
  instr(summary_he, '—') > 0 OR instr(summary_he, '–') > 0 OR
  instr(local_summary_he, '—') > 0 OR instr(local_summary_he, '–') > 0 OR
  instr(global_summary_he, '—') > 0 OR instr(global_summary_he, '–') > 0 OR
  instr(pros, '—') > 0 OR instr(pros, '–') > 0 OR
  instr(cons, '—') > 0 OR instr(cons, '–') > 0 OR
  instr(sources_breakdown, '—') > 0 OR instr(sources_breakdown, '–') > 0 OR
  instr(pros_en, '—') > 0 OR instr(pros_en, '–') > 0 OR
  instr(cons_en, '—') > 0 OR instr(cons_en, '–') > 0 OR
  instr(local_summary_en, '—') > 0 OR instr(local_summary_en, '–') > 0 OR
  instr(global_summary_en, '—') > 0 OR instr(global_summary_en, '–') > 0 OR
  instr(summary_en, '—') > 0 OR instr(summary_en, '–') > 0 OR
  instr(safety_he, '—') > 0 OR instr(safety_he, '–') > 0 OR
  instr(tech_comfort_he, '—') > 0 OR instr(tech_comfort_he, '–') > 0 OR
  instr(who_for_he, '—') > 0 OR instr(who_for_he, '–') > 0 OR
  instr(recalls_il_text, '—') > 0 OR instr(recalls_il_text, '–') > 0 OR
  instr(recalls_nhtsa_text, '—') > 0 OR instr(recalls_nhtsa_text, '–') > 0 OR
  instr(chips_json, '—') > 0 OR instr(chips_json, '–') > 0 OR
  instr(pros_cons_note, '—') > 0 OR instr(pros_cons_note, '–') > 0;

-- Remove incomplete model-level safety/equipment sentences found during the live check.
UPDATE expert_reviews
SET
  safety_he = replace(safety_he, 'במבחן הריסוק של;', 'במבחן הריסוק;'),
  tech_comfort_he = 'מוצע בישראל בשלוש רמות גימור: ELEGANCE, GS LINE ו-ULTIMATE.'
WHERE make_slug = 'opel' AND model_slug = 'mokka' AND year IS NULL;
