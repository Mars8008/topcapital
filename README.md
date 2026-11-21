# TOP CAPITAL LLC — website + admin panel

Node.js (Express) + MongoDB. The public website is static HTML whose content
(services, projects, about, testimonials, team, FAQ, contact info) is managed
from the admin panel at **`/admin`**.

## Structure

```
public/                 website (served as-is)
  *.html                pages — each contains only its own <main> content
  partials/             shared header.html / footer.html
  js/include.js         inserts partials → renders CMS content → loads theme scripts
  js/cms.js             fills [data-cms] / [data-bind] elements from /api/site
  admin/                admin panel (index.html, admin.js, admin.css)
server/
  index.js              Express app (API + static files + /media images)
  models/               Service, Project, Settings, Message, Media, User
  routes/public.js      GET /api/site, /api/services/:slug, /api/projects/:slug, POST /api/messages
  routes/admin.js       authenticated CRUD for the admin panel
  routes/auth.js        login / logout / change password
  seed.js               fills an empty database with the original site content
```

## Setup

1. Install Node.js 20.12+ and create a MongoDB database
   (free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).
2. Configure:
   ```bash
   cp .env.example .env      # then fill in MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD
   npm install
   # (first start on an empty database loads the original services/projects/FAQ automatically)
   npm start                 # http://localhost:3000  — admin at /admin
   ```
3. Log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`, then change the password
   from **Нууц үг солих**.

## Admin panel

| Section | What it manages |
|---|---|
| Үйлчилгээ | add / edit / hide / delete / reorder services and their detail pages |
| Төслүүд | add / edit / hide / delete / reorder projects, image gallery |
| Бидний тухай | intro text & images (home + about), highlights |
| Сэтгэгдэл / Баг / FAQ | testimonials, team members, FAQ (grouped into tabs by category) |
| Холбоо барих | phone, email, address, hours, social links, Google Maps embed |
| Ирсэн мессеж | contact & quote-form submissions |

Uploaded images are stored in MongoDB and served from `/media/<id>`.

## Adding content hooks to a page

```html
<div class="row g-4" data-cms="services-grid" data-limit="3"></div>
<span data-bind="contact.phone"></span>
<img data-bind-src="about.image1">
```

Renderers are listed in `public/js/cms.js` (`RENDERERS`).

## Deployment (Vercel)

`vercel.json` serves `public/` as static files and routes `/api/*` and `/media/*`
to the serverless function in `api/index.js` (the same Express app).

1. In MongoDB Atlas → Network Access, allow `0.0.0.0/0` (Vercel has no fixed IPs).
2. In Vercel → Project → Settings → Environment Variables add, for Production and Preview:
   `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`.
3. Push. Each branch gets a preview URL; merging into `main` updates the live site.

Image uploads are limited to 4MB (Vercel request body limit is 4.5MB).

## Local development

```bash
npm run dev    # uses .env (MongoDB Atlas), restarts on code changes
npm run demo   # no database needed: temporary in-memory MongoDB, data lost on stop
```
