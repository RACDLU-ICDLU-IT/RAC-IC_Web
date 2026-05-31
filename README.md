# Interact Club Management Portal

A comprehensive and modern club management web application for the Interact Club. Built with a robust, reliable, and high-performance stack.

## Technology Stack

- **Frontend Framework:** React 19 (TypeScript) with Vite
- **Styling:** Tailwind CSS v4
- **Backend & Auth:** Supabase (Database, Storage & Authentication)
- **Media Uploads:** Cloudinary (seamless browser-based unsigned image uploads)

## Features

- **Dashboard:** At-a-glance club news, event reminders, and core updates.
- **Form Builder:** Dynamic administrative form generator with support for customizable public submission fields, custom page guides, and responses exporter.
- **Member Directory:** Profile management, customizable avatar/logo uploads, and seamless administrator configuration.
- **Board Gallery & Projects:** Highlight club achievements, gallery photos (ordered via creation date), and active project initiatives.

---

## Setup & Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd interact-club
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to create your local environment file:
```bash
cp .env.example .env.local
```

Fill in the required credentials in `.env.local`:
- `VITE_SUPABASE_URL` — Your Supabase project API URL.
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anonymous API key.
- `VITE_CLOUDINARY_CLOUD_NAME` — Your Cloudinary cloud name.
- `VITE_CLOUDINARY_UPLOAD_PRESET` — Your unsigned Cloudinary upload preset.

### 4. Running the Development Server
Start the local Vite server:
```bash
npm run dev
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).
