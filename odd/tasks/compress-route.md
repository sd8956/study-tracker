# Feature: compress the book modules of the study route

Objective: shorten book modules 01–07 based on a diagnostic of what the user already knows and on overlap with later courses. Move the Cloud route back to the end.
Branch: `feat/compress-route` · Delivery: ask-on-risk · Test runner: vitest (`npm test`), plus `npm run typecheck`, `npm run lint`, `npm run build`.

## Specs

- **S1 Scope.** "Me gustaria comprimir un poco la ruta de estudio ... algunos temas ya los conozco lo que no comprimiria serian las rutas de data camp y scrimba, dejaria al final si la ruta de cloud que ya tenia, pero el resto me gustaria comprimirlo un poco". Modules 08–17 (DataCamp, Scrimba) and the 139 Cloud sessions stay untouched. Only book modules 01–07 are compressed.
- **S2 Cloud last.** "dejaria al final si la ruta de cloud que ya tenia". `content/plan-order.txt`: 01–06, 08–13, 07, 14–17, then cloud-b1 … cloud-b6. The AI book stays right before the AI tracks.
- **S3 Overlap.** "seria bueno igual validar si en alguno de los cursos que voy a hacer ya se cubre algun tema". A book topic covered by a later course (or by an earlier kept module) is dropped from the book module.
- **S4 Apply every cut.** "aplica todos los recortes": both the diagnostic cuts (−31) and the content cuts (−8). Final session counts: 01 → 16, 02 → 21, 03 → 29, 04 → 24, 05 → 24, 06 → 17, 07 → 15.
- **S5 Merge rules.** A merged session keeps the FIRST file of its group (lowest NN prefix). It may be renamed to a descriptive slug, but it keeps that NN prefix; `01-problem-solving/01-*` is never touched. The merged content is original text that covers the essentials of every merged session in one 2 h or 3 h session (`hours` ≤ 3), in the format of `docs/CONTENT-FORMAT.md`. Other files of the group are deleted. Remaining files are never renumbered.
- **S6 Consistency.** `module.md`, the projects and the evaluations of each module never reference or quiz a dropped topic, unless it was merged into a kept session. `16-dsa-python/01` no longer compares against TS versions from the dropped 01-12.

### Cuts per module

- **01 (25 → 16).** 01 stays untouched (completed by the user). 02 stays; it becomes the review session on constraints and problem reduction (Luhn with digits arriving left to right, two running sums). Merge 03+04 (Big O in depth). Drop 05, 06, 07, 08, 11, 12 (DataCamp DSA in 11-python-programmer s15–18). Merge 13+14 (hash internals, heaps, tries). Merge 22+23. Keep 09, 10, 15–21, 24, 25.
- **02 (31 → 21).** Merge 01–03. Merge 04–06 (functions, flag args, abstraction levels). Merge 07–09 (boundaries, adapters, input mutation). Keep 10–18 and 21–24. Merge 19+20. Merge 25+27. Keep 26. Merge 28+29 (deprecation and contract evolution; git is in DataCamp 11). Drop 30 (Cloud covers GitHub Actions, gitleaks and pre-commit). Keep 31.
- **03 (36 → 29).** Drop 16, 17, 18, 19, 20 (19: normalization is in DataCamp 09 s19–20; 16–18, 20: content cut). Simplify project 21 to the kept topics. Merge 22+23. Merge 27+28. Keep the rest.
- **04 (25 → 24).** Merge 24 into the final evaluation 25.
- **05 (30 → 24).** Drop 07 (covered by 04-12, 04-19) and 08 (covered by 04-14). Drop the cases 20 (web crawler), 24 (autocomplete), 25 (YouTube) and 27 (geohashing); 28 (ride-hailing) absorbs the geohash/quadtree essentials it needs.
- **06 (19 → 17).** Drop 15 (≈ 05-13 + Cloud); move NetworkPolicy into 11. Merge 16 (≈ 05-12) into 12 (chaos engineering, HPA, degradation).
- **07 (19 → 15).** Drop 08 (DataCamp 14-01..05); its essentials go into 10. Merge 11+12 (conceptual RAG). Drop 13 (≈ 14-23). Drop 14 (DataCamp 15-08..10).

## Tasks

| ID | Specs | Route | Status | Commit |
| --- | --- | --- | --- | --- |
| T1 | S2 plan order + content test | inline | done (RED → GREEN) | 04814fa |
| T2 | S4–S6 module 01 + 16-dsa-python/01 | delegated (parallel unit W01) | done | df9e504 |
| T3 | S4–S6 module 02 | delegated (parallel unit W02) | done | f363923 |
| T4 | S4–S6 module 03 | delegated (parallel unit W03) | done | 6361235 |
| T5 | S4–S6 modules 04 + 05 | delegated (parallel unit W45) | done | 2e194ec |
| T6 | S4–S6 modules 06 + 07 | delegated (parallel unit W67) | done | f31f433 |
| T7 | all: docs, README, seam check | inline | done (457 tests, typecheck, lint) | 162c112 |

Route evidence: T2–T6 are independent content units with disjoint edit surfaces (`content/modules/NN-*/**`). Each rewrites several merged sessions (well over 100 lines), so the Writer trigger (a) parallelism holds. T1 and T7 are small and run inline.

## Log

- **L1 (2026-10-22, user, verbatim):** "Me gustaria comprimir un poco la ruta de estudio ¿como lo podemos hacer? algunos temas ya los conozco lo que no comprimiria serian las rutas de data camp y scrimba, dejaria al final si la ruta de cloud que ya tenia, pero el resto me gustaria comprimirlo un poco ¿tu me podrias evaluar para re ajustar la ruta y reducir el tiempo que dura?"
- **L2 (2026-10-22, user, verbatim):** "seria bueno igual validar si en alguno de los cursos que voy a hacer ya se cubre algun tema"
- **L3 (diagnostic):** Self-ratings (0–3), each 2–3 verified with an applied exercise. 01: A2 B2 C2 D1 E0 F1 G0 H0 I0; the Luhn test showed A as partial. 02: A3 B3 C3 D2 E2 F2 G3 H3 I3. The code review missed SQL injection, partial failure, SRP, the flag argument and test doubles; the estimation scenario missed scope negotiation and ranges. 03: A1 B1 C1 D1 E2 F1 G2 H2 I2 J1; the SOLID/DDD test passed S and bounded contexts, and was partial on DIP/ISP, aggregate boundaries and value objects. 04–07: 1 everywhere.
- **L4 (2026-10-22, user, verbatim):** "aplica todos los recortes".
- **L5 (decision):** The user has progress on `01-problem-solving/01-estrategias-para-resolver-problemas` (completed, 6 cards, answers, notes). That file stays untouched, and 01-02 stays as the review session. The remaining study load equals the planned 01+02 merge. Other keys hold no progress, so renaming the merged files is safe.
- **L6 (2026-10-22, result):** The book modules went from 394 to 355 session files across modules 01–17 (books 185 → 146), and from 857 to 787 hours. The whole route went from 533 to 494 sessions. The new order is books → DataCamp → Scrimba → Cloud, so DataCamp starts on Día 132, Scrimba on Día 275 and Cloud on Día 356. Two out-of-scope consistency fixes went into DataCamp 11 (s15 step 3 and module.md), because they pointed at the deleted TS linked list from 01. No course content was cut. Writers also flagged that PACELC now lives only as an inline definition in 05-17, and that consistent hashing rests on 04-14 + 05-17. RDD assess over d38dd34..HEAD: medium, review_due false (under_budget), so no native review ran.

- **L7 (2026-10-22, native review):** The stop hook asked for a review of the whole branch candidate (base f3a7c5c, 479 files, 55,774 lines). The user granted consent, but START stopped with `lens_context_budget_exceeded`, so no review authority was created. Even this feature alone (d38dd34..HEAD, 135 files) is above the 8,801-line size that already exceeded the budget in the earlier feature (L8 of local-study-plan).
