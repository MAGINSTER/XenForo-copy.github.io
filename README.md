# XenForo Copy

A community forum inspired by the familiar XenForo 2 layout, built as an original React application for GitHub Pages with Supabase as its backend.

## Stack
- React + Vite
- Supabase Auth, PostgreSQL, Storage and Realtime
- GitHub Pages deployment through GitHub Actions

> This is an independent implementation. It does not include XenForo source code and is not an official XenForo product.

## Local development
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and anon/publishable key.
5. Run `npm run dev`.

## Supabase setup
Open the Supabase SQL Editor and run `supabase/schema.sql`. Then configure the frontend environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never put a Supabase service-role key in frontend code.

## Deployment
Enable GitHub Pages with **GitHub Actions** as the build and deployment source. Add the two frontend environment variables as repository Actions secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The initial interface includes a forum home page and sample categories. Supabase connection and real forum workflows will be implemented in subsequent steps.
