<p align="center">
  <img src="branding/logo/icon-1024.png" width="96" alt="Chốt Lẹ logo">
</p>

<h1 align="center">Chốt Lẹ</h1>

<p align="center">
  <b>A curated restaurant guide for Ho Chi Minh City, on iOS, Android and the web from one codebase.</b><br>
  <a href="https://chot-le.expo.app">Live demo → chot-le.expo.app</a>
</p>

<p align="center">
  <img src="app/public/og.png" width="640" alt="Chốt Lẹ preview">
</p>

> *"Đi ăn hông? Chốt lẹ!"* ("Hungry? Let's decide, fast!"). The UI is in Vietnamese; this README is in English.

## What it does

- **Discover:** browse hand-picked places with photos, prices, opening hours, menus and offers. Filter by district, category, price and "open now".
- **Map:** see every place on an interactive map, with distance from you and one-tap directions.
- **Smart search:** type a free-form Vietnamese query (*"bún bò quận 3 dưới 50k còn mở"*). Claude, running in a Supabase Edge Function, turns it into structured filters; an on-device parser takes over in demo mode or when the call fails.
- **Ask tab:** a chat-style assistant that runs fully on-device, answers with matching places and suggests follow-up questions.
- **Group vote:** pick a few places, share a link, and friends vote without signing up. The creator then locks in the winner.
- **Random pick:** a "What should we eat today?" picker that respects your filters.
- **Community:** guests can suggest new places, and admins review them in-app.
- **Admin panel:** inside the same app. Add or edit places, paste a Google Maps link to auto-fill name, address, district and coordinates, crop and rotate photos before upload, drag to reorder photos, and view view/visit analytics by traffic source.

## Architecture

```
Expo app (iOS · Android · Web)  ──►  Supabase
  Expo Router, TypeScript strict         ├─ Postgres  (RLS on every table)
  src/lib/api.ts = single data layer     ├─ Storage   (place photos)
                                         ├─ Auth      (admins only)
                                         └─ Edge Function: parse-query (LLM)
```

- **No custom server.** Supabase is the only backend; authorization lives entirely in Postgres **Row Level Security** ([`supabase/schema.sql`](supabase/schema.sql)).
  - Anonymous users can only read published places; only `is_admin()` can write.
  - Community features (votes, suggestions, analytics, "trending") never touch tables directly. They call `security definer` RPC functions that validate input and rate-limit by device ID.
- **One data layer.** Every query goes through [`app/src/lib/api.ts`](app/src/lib/api.ts), so screens never call Supabase directly.
- **Demo mode.** Without a `.env`, the app runs on in-memory sample data, so anyone can clone it and try it in seconds.
- **Idempotent schema.** `schema.sql` can be re-run safely (12 tables, RLS policies, storage policies, seed categories).
- **Maps** use Leaflet + OpenStreetMap in a WebView on native and an iframe on the web.
- **Open Graph** tags make shared vote links render rich previews on Zalo, Facebook and TikTok.

## Tech stack

| Area | Tools |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript (strict) |
| Backend | Supabase: PostgreSQL, RLS, RPC functions, Storage, Auth, Edge Functions (Deno) |
| AI | Claude (Anthropic API) for natural-language query parsing, with a local rule-based fallback |
| Maps & location | Leaflet, OpenStreetMap, expo-location |
| Tooling | ESLint, EAS Hosting (web deploy), Node.js scripts for branding and social images |

## Project layout

```
app/                        Expo app
  src/app/                  Screens (file-based routing): tabs, place detail, edit form, vote, suggest
  src/lib/                  api.ts, auth, filters + Vietnamese query parser, location, maps-link parser
  src/components/           UI kit, place card, map, photo editor, sortable grid, random picker
supabase/schema.sql         Full schema + RLS + RPC functions (idempotent)
supabase/functions/         Edge Function: parse-query
tools/tiktok/               Generates 1080×1920 social posts from live app data
branding/                   Logo source files and export scripts
```

## Run it locally

```bash
cd app
npm install
npm run web        # http://localhost:8081, runs in demo mode without .env
```

To connect a real backend, copy `app/.env.example` to `app/.env`, fill in your Supabase URL and publishable key, and run `supabase/schema.sql` in the Supabase SQL editor. See [`HUONG_DAN_SUPABASE.md`](HUONG_DAN_SUPABASE.md) (Vietnamese).

```bash
npx tsc --noEmit   # typecheck
npx eslint src     # lint
```

## Author

**Dat Huynh** · Data Engineer & Software Developer (Python, SQL, TypeScript) · Ho Chi Minh City
