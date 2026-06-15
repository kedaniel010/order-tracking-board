# GitHub Pages + Supabase

This site can be deployed for free with:

- GitHub Pages for the website
- Supabase Free Plan for login and data sync

## Steps

1. Create a GitHub repository.
2. Upload the project files to the repository root.
3. In GitHub, open `Settings` -> `Pages`.
4. Choose `Deploy from a branch`.
5. Select branch `main` and folder `/ (root)`.
6. Save and wait for the site URL.
7. In Supabase, run `supabase-schema.sql`.
8. Fill `config.js` with your Supabase project URL and anon key.
9. Open the GitHub Pages URL and sign in.

## Files you need

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `supabase-schema.sql`
- `.nojekyll`
