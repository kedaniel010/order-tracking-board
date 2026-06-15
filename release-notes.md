# Order Tracking Board

English-only first version of a customer order tracking site.

## Features

- Desktop table view based on your hand-drawn layout
- Mobile card view for easier phone browsing
- Customer invoice number and factory invoice number
- Supabase login and multi-device sync
- Static front end that can be hosted for free

## Current Fields

- Date of Order
- Customer Invoice No.
- Factory Invoice No.
- Customer
- Factory
- F.E.
- T.E.
- Production Finish Date
- OA Process
- Production Status
- SO
- UP before shipment
- ETA
- Notes

## Free Deployment Plan

Recommended stack:

- GitHub Pages: free website hosting
- Supabase Free Plan: login, database, and sync

This project already fits GitHub Pages because it is a plain static site.

## Multi-Device Sync Setup

1. Create a free Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL Editor.
3. Copy the values from `config.example.js` into `config.js`.
4. Fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Open `index.html`, sign up, and sign in.
6. Use the same account on phone and desktop to sync the same order data.

## GitHub Pages Setup

1. Create a new GitHub repository.
2. Upload all files in this project to the repository root.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
5. Save and wait for GitHub Pages to publish the site.
6. Open the generated GitHub Pages link.

## Project Files

- `index.html`: page structure
- `styles.css`: visual design
- `app.js`: table logic, mobile cards, and auth flow
- `config.js`: your Supabase config
- `supabase-schema.sql`: database schema
