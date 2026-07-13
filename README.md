# CampAtlas

## Live Demo
https://campatlas.netlify.app

## 1. Project Overview
CampAtlas is a multi-page web application for discovering and managing campsites. Public visitors can browse published campsites, while authenticated users can register/login, create campsite submissions, upload photos, add favorites, and leave reviews. Administrators review pending submissions and approve or reject them.

## 2. Short Description
The platform supports the full campsite lifecycle:
- Discover published campsites
- Authenticate users (register/login)
- Create and manage campsite submissions
- Upload and manage campsite photos
- Mark campsites as favorites
- Leave campsite reviews
- Review and moderate submissions through an admin panel

## 3. Main Features
- Public campsites listing
- Campsite details page
- User registration and login
- User profile page
- My campsites section
- Create campsite flow
- Edit pending/rejected campsite flow
- Upload campsite photos
- Favorites
- Reviews
- Admin approval panel
- Supabase RLS-protected database access

## 4. Tech Stack
- HTML
- CSS
- Vanilla JavaScript
- Bootstrap 5
- Bootstrap Icons
- Vite
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase RLS
- Git and GitHub

## 5. Project Structure
- `src/pages` : Page-level controllers for each HTML page.
- `src/services` : Data-access layer for Supabase Auth, Database, and Storage operations.
- `src/utils` : Shared utilities and authentication guards.
- `src/styles` : Shared application styles.
- `supabase/migrations` : Versioned SQL migrations and RLS policy definitions.

## 6. Supabase Setup
CampAtlas uses Supabase for:
- Authentication (user registration/login/session)
- PostgreSQL database (application data)
- Storage bucket: `campsite-images`
- Row Level Security (RLS) policies for access control

All schema changes and policies are committed as SQL migrations under `supabase/migrations`.

## 7. Environment Variables
Create a local `.env` file (example):

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 8. Local Setup
```bash
npm install
npm run dev
npm run build
```

## 9. Development Server
Recommended fixed local URL for development:

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Then open:
- http://127.0.0.1:5173

## 10. User Roles
- Regular authenticated users can create campsites.
- New campsites are created with `pending` review status.
- Admin users can approve (`published`) or reject (`rejected`) submissions.
- Only published campsites are publicly visible.

## 11. Demo Flow
1. User registers or logs in.
2. User creates a new campsite submission.
3. Campsite is saved as `pending`.
4. Admin reviews and approves the campsite.
5. Approved campsite appears in the public listing.
6. Users can open details, favorite the campsite, and leave a review.

## 12. Database Tables
- `profiles`
- `user_roles`
- `campsites`
- `campsite_photos`
- `favorites`
- `reviews`

## 13. Security Notes
- Административни ключове не се използват във frontend кода.
- RLS is enabled and used for authorization.
- The app uses only the public/anon key in the client.
- Users cannot set `owner_id` or `review_status` manually from the UI.

## 14. Deployment
The project is deployed on Netlify:

https://campatlas.netlify.app

Environment variables must be configured in the hosting platform.

## 15. Author
Angel Goranchev
