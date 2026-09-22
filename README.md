<div align="center">

# 🎓 MaroNotes

### **The Modern Platform for Academic Excellence & Curated Study Materials**

Elevate your academic journey with structured study notes, high-yield lectures, and seamless document viewing in a clean, distraction-free environment.

---

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout%20Ready-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)

[Explore Curriculum](#-features) • [Quick Start](#-quick-start) • [Environment Config](#-environment-configuration) • [Architecture](#-architecture--database)

</div>

<br />

---

## ⚡ Highlights

<table>
  <tr>
    <td width="50%">
      <h3 align="center">📚 Structured Academic Progression</h3>
      <p>Organize comprehensive curricula by academic year and semester. Group notes into sequential modules with high-yield summaries and direct syllabus alignment.</p>
    </td>
    <td width="50%">
      <h3 align="center">📄 High-Performance PDF Reader</h3>
      <p>Built with <code>react-pdf</code> and a dedicated secure streaming proxy. Supports single-page and scroll modes, responsive zoom, and instant full-screen presentation.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3 align="center">💳 Stripe Monitization & Access Control</h3>
      <p>Zero-friction Stripe Checkout integration. Students can preview introductory materials for free and unlock complete document packs in 1-click.</p>
    </td>
    <td width="50%">
      <h3 align="center">🛡️ Administrative Suite</h3>
      <p>Role-Based Access Control (RBAC) powered by Supabase. Upload course PDFs, set pricing, reorder notes, and manage content in real-time.</p>
    </td>
  </tr>
</table>

---

## 🌟 Key Features

- **Free Previews & Instant Unlocks**: Let students preview before purchase. Full documents automatically unlock upon completed checkout sessions.
- **Cross-Device Precision**: Tailored responsiveness for mobile devices, tablets (portrait/landscape), and desktop displays.
- **Secure File Delivery**: Server-side proxy (`/api/proxy-pdf`) generates short-lived signed URLs directly from private Supabase Storage buckets.
- **Fluid Micro-Interactions**: Animated with modern transitions, frosted-glass header treatments, and responsive navigation controls.
- **Student Reviews & Community Feedback**: Interactive feedback mechanism to highlight student testimonials and course satisfaction ratings.

---

## 🏗️ Architecture & Database

```
├── client/ (Vite + React 18)
│   ├── src/pages/          # YearSelection, Modules, ModuleDetails, ModuleViewer
│   ├── src/components/     # Layout, Nav, Reviews, Admin Modals
│   └── src/lib/            # Supabase Client, Auth Helpers, Storage Management
│
├── server.ts               # Express API + Vite Middleware
│   ├── /api/proxy-pdf             # Binary PDF Streaming & CORS Handler
│   └── /api/create-checkout-session # Stripe Checkout Session Generator
│
└── supabase/
    ├── tables/             # profiles, modules, notes, purchases, reviews
    └── storage/            # 'modules' bucket (previews & full documents)
```

### Database Schema Overview

```sql
-- Profiles & Roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modules
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes & PDF Files
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) DEFAULT 0.00,
  file_path TEXT,
  preview_file_path TEXT,
  order_index INTEGER DEFAULT 0
);

-- Purchases & Entitlements
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  note_id UUID REFERENCES notes(id),
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/maronotes.git
cd maronotes
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Stripe Configuration (Server-Side)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to preview the application.

---

## 📦 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Boots local full-stack server using `tsx` on port `3000` |
| `npm run build` | Compiles client assets and bundles server to `dist/server.cjs` |
| `npm run start` | Runs the compiled production distribution |
| `npm run lint` | Runs TypeScript compiler checks across the entire codebase |

---

## 🔒 Security & Best Practices

- **Zero Client-Side Secrets**: All Stripe secret keys remain strictly server-side behind Express endpoints.
- **Signed Storage Access**: PDF files are never exposed via public bucket URLs; time-limited signed tokens are generated on demand.
- **Row-Level Security (RLS)**: Enforce database access controls directly inside Supabase PostgreSQL policies.

---

<div align="center">
  <sub>Crafted for modern universities, academies, and lifelong learners.</sub>
</div>
