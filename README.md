# Accessa

An AI-powered web accessibility auditing tool that scans websites for WCAG violations, generates visual fixes, and provides actionable reports, all in one interface.

---

## What It Does

- **Automated WCAG scanning** using Axe-core across multiple pages
- **AI accessibility analysis** with violation grouping, severity scoring, and fix recommendations
- **Visual side-by-side comparison** — see the original screenshot next to an AI-modified version with fixes applied
- **Color blindness simulator** — preview your site through different vision filters
- **Mobile responsive preview** — see how your site renders at real device viewports
- **Interactive next steps** — a checklist of prioritized fixes organized by WCAG principle

---

## Tech Stack

**Frontend**
- React 19 + Vite
- React Router

**Backend**
- Node.js + Express
- Playwright (screenshot capture + responsive previews)
- Axe-core (automated WCAG scanning)

**AI**
- Google Gemini (visual WCAG fixes)
- OpenAI `gpt-image-1` (AI image editing for side-by-side view)
- Anthropic Claude (friendly titles, mobile issue details)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Chromium-compatible browser (Playwright installs this automatically)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/Accessa.git
cd Accessa
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

### 4. Set up environment variables

Create a `server/.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PORT=4000
```

### 5. Install Playwright browsers

```bash
cd server
npx playwright install chromium
```

### 6. Run the app

In one terminal, start the backend:

```bash
cd server
node index.js
```

In another terminal, start the frontend:

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
Accessa/
├── src/
│   ├── pages/
│   │   └── Complete.jsx       # Main results page
│   ├── components/            # Reusable UI components
│   ├── api/                   # Frontend API helpers
│   └── styles/
├── server/
│   ├── index.js               # Express server + all API endpoints
│   ├── openaiImageEdit.js     # OpenAI image editing helper
│   ├── routes/
│   │   └── analyze.js
│   └── .env                   # API keys (not committed)
├── public/
└── vite.config.js
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wcag-check-stream` | Streams live WCAG scan results |
| GET | `/api/wcag-visual-stream` | Streams visual segment analysis |
| POST | `/api/ai/image-edit` | AI-powered screenshot editing (OpenAI) |
| POST | `/api/wcag-visual` | Gemini visual accessibility fixes |
| POST | `/api/ai-modify-html` | AI HTML/CSS fix suggestions |
| GET | `/api/mobile-preview` | Responsive screenshot at device viewport |

---

## Notes

- API keys are **never** exposed to the browser — all AI calls are proxied through the Express backend
- The OpenAI image editor (`gpt-image-1`) always returns images at 1024×1024; the frontend automatically resizes them to match the original screenshot dimensions
- Session storage is used to cache AI-generated images and avoid redundant API calls
