# Mutual Fund Dashboard: Meera's weekly fund intelligence

A personal mutual fund tracker. Every Saturday morning it tells Meera, in plain language, how each of her funds did against its benchmark index and its category, why, and whether she needs to do anything.

MESA Cohort C4, AI and its Applications, Section 1 final examination, Problem Statement 19.

**Repo:** https://github.com/patilprithvi2098/Mutual-FundDashboard

**Live URL:** _add your Vercel URL here_

## What it does

| Requirement | How it is met |
|---|---|
| Daily NAV for 5 funds from public MF APIs | mfapi.in, pulled by a daily Vercel Cron job |
| Week, month and year-to-date returns | `src/lib/returns.ts`, computed from stored NAV history |
| Compare to benchmark and category average | Benchmark from Yahoo Finance index closes; category average is the mean of up to 8 live Direct-Growth peer funds |
| Weekly market context | Nifty 50, Midcap 150, Smallcap 250 moves plus Google News RSS headlines |
| Plain-language report from Gemini | 3 sentences per fund, a market summary and a portfolio verdict reason, using Gemini Flash only |
| Portfolio verdict | "No action needed", "One fund worth watching" or "Consider reviewing your allocation", decided by rules in code, explained by Gemini |
| Snapshots stored for trends | Postgres table `weekly_snapshots`, shown on the Trends page |
| Add or remove a fund without code changes | Manage funds page: enter a scheme code |

## Components map

Rows are the components; columns are the stage of the flow. Colours: People, AI, Data and systems, Human takes over. The rendered version is at `/components-map`.

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
| Neon Postgres (system) | | | Fund list, past snapshots | | Weekly snapshot stored |
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
- **Database.** The brief mentions Supabase; this build uses Neon. The code is plain Postgres (`pg`), so switching is a connection-string change.
- **Public write access.** The fund form and "generate now" button have no login, with a 10-fund cap and a 60-second cooldown. Fine for a demo, add auth before real use.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon or Supabase). Tables are created automatically on first request |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Optional, defaults to `gemini-3.8-flash` |
| `CRON_SECRET` | Any long random string; Vercel Cron sends it as a Bearer token |

The first page load seeds five funds: UTI Nifty 50 Index (120716), HDFC Mid Cap (118989), Nippon India Small Cap (118778), HDFC Short Term (119016) and Axis Nasdaq 100 FoF (150751). Click "Generate report now" for the first report.

## Deploy on Vercel

1. Import the GitHub repo into Vercel.
2. Add the four environment variables above.
3. Deploy. `vercel.json` registers two crons: daily ingest and the Saturday report (both 08:00 IST).

## Stack

Next.js (App Router, TypeScript), Tailwind, Postgres on Neon, Gemini Flash, Vercel.
