-- Israeli vehicle recalls (data.gov.il, "הודעות יצרני הרכב RECALL",
-- resource 2c33523f-87aa-44ec-a736-edbb0a82975e). `make` is a normalized
-- (uppercase, diacritics/punctuation stripped) manufacturer key so the app
-- can match it against our own normalized make name without fuzzy SQL.
CREATE TABLE IF NOT EXISTS recalls_il (
  id TEXT PRIMARY KEY,
  recall_id INTEGER,
  make TEXT NOT NULL,
  make_raw TEXT,
  degem TEXT,
  recall_year INTEGER,
  build_begin TEXT,
  build_end TEXT,
  recall_type TEXT,
  fault_type TEXT,
  fault_description TEXT,
  fix_method TEXT,
  importer TEXT,
  phone TEXT,
  website TEXT
);

CREATE INDEX IF NOT EXISTS idx_recalls_il_make ON recalls_il(make);
