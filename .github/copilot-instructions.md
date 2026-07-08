# CampAtlas — GitHub Copilot Instructions

## Project purpose
CampAtlas is a multi-page web application where users share campsites they have visited.
Users can create campsite listings, upload photos, add GPS coordinates, descriptions,
positive and negative highlights, and save favorites.
Admins review pending campsite listings and publish or reject them.

## General Rules
Use already existing components instead of starting from scratch (mainly the available ones from Bootstrap CSS 5 and their JS)
For development environment use Node.js, npm, and Vite.
You are a Senior Front-End Developer, World-Class UX/UI designer and an Expert in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS and ...


## Mandatory technologies
- HTML5
- CSS3
- Vanilla JavaScript only
- Bootstrap 5 and Bootstrap Icons
- Vite
- Supabase Auth, Database and Storage
- No React
- No Vue
- No Angular
- No TypeScript
- No server-side framework

## Architecture
- Every screen must have its own HTML file in the project root.
- Every page must have a dedicated controller file in src/pages.
- Reusable UI goes in src/components.
- Supabase access must be isolated in src/services.
- Shared helpers go in src/utils.
- Do not put all logic in one file.
- Do not use inline onclick handlers.
- Use ES modules and async/await.

## Security
- Never expose a Supabase service_role key in frontend code.
- Use only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
- RLS policies are the source of truth for authorization.
- UI visibility is not considered security.
- Users may modify or delete only their own campsites, photos and favorites.
- Admin actions must be checked through database role and RLS policies.

## Database migrations
- Never edit an already-applied migration.
- Every schema change must be a new file in supabase/migrations.
- Do not create database tables manually in the Supabase dashboard.
- Keep migrations committed to Git.

## UI and UX
- Use Bootstrap responsive grid and utility classes.
- Use Bootstrap Icons.
- Support mobile screens from 375px width upward.
- Display loading, empty, validation and error states.
- All forms must have client-side validation.
- Keep text and UI labels in Bulgarian.
- Keep source code comments and technical documentation in English.

## Campsite workflow
- A normal user creates a campsite with review_status = pending.
- Only an admin may publish a campsite.
- Public visitors see only published campsites.
- A user editing a published campsite must return it to pending status.
- Photos are uploaded to the campsite-images bucket.
- Images must be stored under userId/campsiteId/fileName.

## Quality checks
Before considering a task complete:
1. Run npm run dev.
2. Verify the relevant user flow in the browser.
3. Run npm run build.
4. Check git diff.
5. Keep changes focused on the current task only.
