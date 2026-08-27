-- ── HLAS ─────────────────────────────────────────────────────
-- Úložiště namluvených vět. Každá se vygeneruje jednou a zůstane
-- tu — ElevenLabs účtuje za znaky, takže opakované generování
-- téhož je zbytečná útrata.

insert into storage.buckets (id, name, public)
values ('hlas', 'hlas', false)
on conflict (id) do nothing;

-- Bucket je privátní. Nahrávky se vydávají podepsaným odkazem,
-- stejně jako dokumenty v cloudu.
