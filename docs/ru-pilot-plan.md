# `/ru` pilot — plan (not implemented)

Goal: reach Russian-speaking Israelis (~1M+), who search in Russian for "проверка машины по номеру", "сравнение ... или ...". Pilot on **carissues.co.il/ru/** (no new domain), measure 8–12 weeks, then expand or drop.

## Scope
1. `/ru/vehicle-lookup` and `/ru/vehicle-lookup/[plate]` — the plate tool is the strongest non-brand entry point and is mostly UI strings plus data.gov.il fields.
2. `/ru/cars/compare/...` for the **top 50 compare pairs** (TOP_COMPARE_PAIRS + SEARCHED_COMPARE_PAIRS + GSC). Everything else under `/ru` returns 404, not a thin auto-translation.
3. `/ru` landing page linking to both.

## How (fits the current host-based locale)
- Locale today is host-derived (`getHostLocale()`: .net = en, .co.il = he; `<html lang dir>` in `layout.tsx`; client `localeContext.tsx`). Add a third locale `ru` that is **path-derived**: proxy/middleware matches `^/ru(/|$)` on the co.il host only, rewrites to the internal route, and sets an `x-locale: ru` request header. `getHostLocale()` reads that header first. Because Next 16 renamed `middleware.ts` → `proxy.ts`, do this as part of that migration.
- `layout.tsx`: `lang="ru" dir="ltr"`. Add a Cyrillic font subset (Rubik and Assistant both have Cyrillic).
- `translations.ts` (~1,100 lines, `he` / `en` objects): add `ru` keyed by the same type, so TypeScript flags missing keys. Only the keys used by the pilot pages need real copy. Unused keys fall back to `en`.
- Page code branches on `isEn` in ~32 files / ~290 places. For the pilot, change only the pages in scope to a `t()` / `locale` switch. Don't touch the rest.
- Data: compare insights (`compareInsights.ts`) and spec summaries are generated from numbers, so add `ru` templates there. Expert-review pros/cons exist in he/en only. Show them in English with a label, or translate with an LLM **and label them as machine-translated**. Don't present them as editorial Russian.
- SEO:
  - Self-canonical on every `/ru` URL.
  - hreflang triplet on the pilot pages only: `he-IL` → co.il, `ru-IL` → co.il/ru, `en` → .net, `x-default` → .net.
  - Separate child sitemap `/sitemaps/ru.xml` listed in the co.il robots.txt. Leave the main co.il urlset unchanged.
- Navigation: a "Русский" link in the co.il header/footer (visible, not hidden). No auto-redirect by Accept-Language. At most a dismissible banner, like the .net banner.

## Effort (one developer)
| Item | Estimate |
|---|---|
| Path locale in proxy + `getHostLocale` + layout lang/dir/fonts | 1–1.5 days |
| `ru` translations for lookup + compare + shared chrome (native-speaker review) | 1.5–2 days + review |
| Compare insights / spec text templates in `ru` | 1 day |
| hreflang, canonical, `/ru` sitemap, 404 for out-of-scope `/ru` paths | 0.5 day |
| QA (SSR HTML, JSON-LD, RTL/LTR switches, analytics segment) | 1 day |
| **Total** | **~5–6 days** |

## Risks
- **Thin or duplicate content:** 50 compare pages with mostly numeric content can look templated. Mitigate with the verdict + FAQ (Task C) and real Russian copy, and keep it to 50 pages.
- **Machine-translation quality:** wrong car terms read as spam to native speakers. A native-speaker review is required before launch.
- **Locale leaks:** the `isEn` boolean is everywhere. Any untouched component will render Hebrew/RTL inside a Russian page. Mitigate with an SSR HTML check of every pilot URL and a Hebrew-character detector in QA.
- **Caching:** the edge cache keys on host. Make sure `/ru` responses aren't served for `/` (vary on path is natural, but check the OpenNext cache keys).
- **hreflang errors:** bidirectional tags are required. Put them only on pages that really exist in all three versions.
- **Measurement:** create a GA4 segment for `/ru/*` and a GSC page filter. Success criterion: e.g. ≥300 organic sessions/month by week 12, otherwise roll back (just 404 `/ru`, no other pages affected).
