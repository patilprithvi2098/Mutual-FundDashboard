# Mutual Fund Dashboard: Meera's weekly fund intelligence

A personal mutual fund tracker. Every Saturday morning it tells Meera, in plain language, how each of her funds did against its benchmark index and its category, why, and whether she needs to do anything.

MESA Cohort C4, AI and its Applications, Section 1 final examination, Problem Statement 19.

**Repo:** https://github.com/patilprithvi2098/Mutual-FundDashboard

**Live URL:** https://mutual-fund-dashboard-patilprithvi2098-2548s-projects.vercel.app

## What it does

| Requirement | How it is met |
|---|---|
| Daily NAV for 5 funds from public MF APIs | mfapi.in, pulled by a daily Vercel Cron job |
| Week, month and year-to-date returns | `src/lib/returns.ts`, computed from stored NAV history |
| Compare to benchmark and category average | Benchmark from Yahoo Finance index closes; category average is the mean of up to 8 live Direct-Growth peer funds |
| Weekly market context | Nifty 50, Midcap 150, Smallcap 250 moves plus Google News RSS headlines |
| Plain-language report from Gemini | 3 sentences per fund, a market summary and a portfolio verdict reason, using Gemini Flash only |
| Portfolio verdict | "No action needed", "One fund worth watching" or "Consider reviewing your allocation", decided by rules in code, explained by Gemini |
| Snapshots stored for trends | Supabase Postgres table `weekly_snapshots`, shown on the Insights page (the map's "trends") as 12-week status strips with ahead/behind streaks |
| Add or remove a fund without code changes | Manage funds page: enter a scheme code |

## Components map

Rows are the components; columns are the stage of the flow. Colours: People, AI, Data and systems, Human takes over. The rendered version is at `/components-map` and is kept identical to this submitted table; additions since submission are listed under "Beyond the brief", not in the map.

| Component | Trigger | Input | Context | Processing | Output |
|---|---|---|---|---|---|
| **Meera** (people) | Opens Saturday report | Enters or removes a scheme code | | | Reads plain-language report |
| Vercel Cron (system) | Daily NAV pull; Saturday 8:00 IST report | | | | |
| Fund form (system) | | Validates code, adds or removes fund | | | |
| MF data, mfapi.in (system) | | Daily NAV for each fund | NAVs of category peers | | |
| Index data, Yahoo Finance (system) | | | Nifty 50, Midcap 150, Smallcap 250 | | |
| News, Google News RSS (system) | | | Week's market and macro headlines | | |
| Rules engine (system) | | | | 1W, 1M, YTD returns; benchmark and category gap; verdict | |
| **Gemini Flash** (AI) | | | | Explains market-wide vs fund-specific gap | 3-sentence fund summaries, verdict reason |
| Supabase Postgres (system) | | | Fund list, past snapshots | | Weekly snapshot stored |
| Web dashboard (system) | | | | | Report, trends, manage funds |
| **Meera as reviewer** (human takes over) | | | | Reviews fund if flagged "Consider reviewing" | |

## Design decisions

- **Rules decide, Gemini explains.** The verdict and each fund's status come from deterministic rules (a fund is "worth watching" when its 1-month return trails its benchmark or category by 2 percentage points; 0.3 for debt funds). Three weeks in a row escalates it to "review". Gemini never sees a chance to invent a number or contradict the verdict.
- **Graceful degradation.** If Gemini or a data source fails, the report still saves with rule-based text and says so on the page.
- **Category average without a category API.** mfapi.in has no category listing, so peers are found by name pattern from the full scheme list, filtered to live Direct-Growth funds, and cached.
- **No-code fund management.** Funds live in the database. Removing a fund deactivates it and keeps its history.

## Known limitations (honest notes)

- **Smallcap index.** The brief names Nifty Smallcap 100. No free source returns its history, so Nifty Smallcap 250 is used. It is also Nippon India Small Cap's official benchmark.
- **Debt funds have no benchmark index.** No free feed exists, so they are compared to the category average only.
- **Price indices, not total-return indices.** Benchmarks exclude dividends, so a fund can look slightly better than its benchmark than it really is; the 2pp threshold absorbs most of this.
- **Nasdaq fund** is compared with Nasdaq 100 in USD terms; rupee moves are not adjusted.
- **Category average for the Nasdaq fund** rests on a single peer fund, because few Nasdaq 100 funds of funds exist in India. The other categories use 8 peers.
- **History.** The latest week was written by Gemini. The earlier weeks were rebuilt from stored NAV history by the same rules engine (see Backfilling history), and the Insights page says so.
- **Scheduled runs.** The daily ingest and the Saturday report run on Vercel Cron. Both endpoints were tested by calling them with the secret; the first unattended Saturday run happens after submission.
- **Public write access.** The fund form and goals have no login (the brief asks for an open form), with a 10-fund cap. Regenerating the report needs an admin passcode and has a 60-second cooldown. Add real auth before real use.

## Backfilling history

`scripts/backfill-snapshots.ts` rebuilds up to 12 weeks of weekly snapshots from the stored NAV and index history, so the Trends page has data before the weekly cron has run that many times.

```bash
npm run backfill               # 12 weeks
npm run backfill -- --weeks=8
npm run backfill -- --dry-run  # print what would be written
npm run backfill -- --ingest   # fetch fresh NAVs and peers first
```

- **Idempotent.** Rows written by the script have no summary, so a re-run refreshes only those rows. Snapshots created by a real report are never touched.
- **Same rules.** Returns, benchmark and category gaps, status and the 3-week "review" streak use the same thresholds as the live report.
- **Limits.** There is no AI commentary and no headlines for backfilled weeks (news feeds only cover the last week), so they carry rule-based text. Category averages use today's peer set.

## Database (Supabase)

Data lives in Supabase Postgres. The schema is created by the app on first request, and the app connects through Supabase's transaction pooler as a dedicated `meera_app` role that owns only the app's tables, never the `postgres` master login. Row-level security is enabled on every table with no policies, so Supabase's public Data API cannot read or write them; the app connects as the table owner and is unaffected.

The project started on Neon and was moved with `scripts/copy-to-supabase.ts` (`npm run copy-to-supabase`), which copies every table and checks row counts on both sides. The code uses plain `pg`, so any Postgres works.

## Beyond the brief

Everything in the submitted components map is built. These sit on top of it and are reachable from the sidebar, the bottom nav and the More page; nothing in the map depends on them.

- **Overview** (`/`). A summary page: Meera's monthly SIP amounts valued at real NAVs since August 2024 (portfolio value, gain, performance chart, allocation), the three market indices and her funds as a ticker strip, this week's verdict, goals progress and the week's headlines. The amounts are illustrative and editable on Manage funds; the footer says so.
- **Fund pages** (`/fund`, `/fund/[code]`). Per-fund returns for 1 week, 1 month, 3 months, year to date and 1 year against the benchmark and category, the rebased chart, the week's Gemini summary and a 12-week status strip.
- **Tappable verdicts** on the weekly report explain the rule behind each of the three verdicts. **Light and dark mode**, saved per device.
- **What a warning looks like** (`/example`). Every real week so far is "No action needed", so this page shows the amber state: it copies this week's report, lowers one fund's returns below its benchmark, and runs the real rules and the real Gemini prompt on it. Built once by `npm run build-example` and saved, so opening it never calls Gemini. It is clearly labelled as simulated.
- A rebased chart per fund (fund against benchmark, 1 week, 1 month or year to date) with a one-sentence reading, and "?" explanations for terms like benchmark and category average.
- A Goals page: targets with saved-so-far and a monthly saving, marked on pace, slightly behind or well behind using a future-value projection at an assumed 8% to 12% annual return. Goals and SIP amounts are illustrative; the site footer says so.
- "How SIPs work" and "Where else can money go?" cards on the Goals page. The second compares equity, debt, gold, real estate and fixed deposits with rough historical ranges and states that it is not financial advice.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Supabase transaction pooler, port 6543, with `uselibpqcompat=true&sslmode=require`. Tables are created automatically on first request |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Optional, defaults to `gemini-3.8-flash` |
| `CRON_SECRET` | Any long random string; Vercel Cron sends it as a Bearer token |
| `ADMIN_PASSCODE` | Optional. When set, the "Regenerate now" button asks for it, so visitors cannot spend the Gemini quota |

The first page load seeds five funds: UTI Nifty 50 Index (120716), HDFC Mid Cap (118989), Nippon India Small Cap (118778), HDFC Short Term (119016) and Axis Nasdaq 100 FoF (150751). Click "Generate report now" for the first report.

## Deploy on Vercel

1. Import the GitHub repo into Vercel.
2. Add the four environment variables above.
3. Deploy. `vercel.json` registers two crons: daily ingest and the Saturday report (both 08:00 IST).

## Stack

Next.js (App Router, TypeScript), Tailwind, Supabase Postgres, Gemini Flash, Vercel.
