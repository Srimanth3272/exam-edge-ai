# 🚀 ExamEdge AI — Fully Automated Current Affairs & Exam Preparation Portal

**ExamEdge AI** is a state-of-the-art, fully automated web platform engineered to act as an **AI Senior Paper Setter** for Indian Government Competitive Examinations (UPSC CSE, SSC CGL, Banking PO, RBI Grade B, Railways, Defence NDA/CDS, and State PSCs).

---

## 📌 Pin-to-Pin Architectural Walkthrough

This repository contains a complete fullstack Node.js application (Express backend + Vanilla JS/HTML/CSS frontend) featuring automated RSS scraping, Google Gemini AI generation, concurrency protection, and multi-model failover redundancy.

### 🗂️ Project Directory Structure

```text
├── server.js             # Express backend server & automated daily Cron job
├── updater.js            # RSS scraper & Google Gemini AI generation engine
├── list_models.js        # Diagnostics script to fetch active Gemini API models
├── latest_data.json      # Dynamic storage file containing AI-generated daily study packages
├── index.html            # Premium dark-mode HTML interface
├── app.js                # Frontend logic, tab filtering, and API communication
├── style.css             # Vanilla CSS styling, responsive grid, and animations
├── package.json          # Node.js dependencies and scripts
└── .env                  # Secret environment variables (API keys)
```

---

## 🔍 Deep Dive into Core Components & How It Works

### 1. `server.js` (Backend Server & Job Scheduler)
* **Express Web Server**: Hosts the static frontend files (`index.html`, `app.js`, `style.css`) and serves them to users at port `3000` (or cloud-assigned `process.env.PORT`).
* **`/api/latest-data` Endpoint**: Directly serves the contents of `latest_data.json` to the frontend for lightning-fast page loads without calling external APIs on every refresh.
* **`/api/force-update` Endpoint**: A protected POST route that triggers an immediate manual AI scrape and update.
* **🔒 Concurrency Protection (Mutex Lock)**: Implements an `isUpdating` mutex lock. If an update is already running in the background, any subsequent requests are instantly throttled with a `429 Too Many Requests` status, protecting your Google API quota.
* **⏰ Daily Auto-Update Cron Job**: Utilizes `node-cron` scheduled at `0 7 * * *` (`Asia/Kolkata` timezone). Every morning at exactly **07:00 AM IST**, the server automatically fetches fresh news and regenerates the entire study package.

---

### 2. `updater.js` (Scraping & AI Generation Engine)
* **🚀 Parallel RSS Scraping**: Uses `rss-parser` and `Promise.all` to simultaneously pull live headlines from *The Hindu*, *LiveMint*, and *Times of India* in under 1 second.
* **🤖 AI Senior Paper Setter Prompt**: Formats the scraped news into a highly rigorous prompt for Google Gemini AI, instructing it to generate a complete JSON structure comprising:
  - **Live Ticker Items**: 5–6 punchy one-line breaking news summaries.
  - **Major Topic Cards**: 3–4 detailed exam-oriented topic breakdowns with key facts, examiner perspectives, and exam relevance.
  - **Daily Power Quiz (MCQs)**: 5–6 high-quality practice MCQs with options, correct answers, and detailed explanations.
  - **Mains Corner**: 2 descriptive answer-writing questions with hints.
  - **Revision Summary Table**: 6–8 quick revision table rows.
* **🛡️ Enterprise Multi-Model Failover**: Uses `@google/generative-ai` to ensure 100% uptime. If the primary model (`gemini-2.5-flash`) experiences a temporary `503 High Demand` server spike, `updater.js` automatically catches the error and retries the prompt across a verified chain of active fallback models (`gemini-2.0-flash` ➔ `gemini-2.5-pro` ➔ `gemini-flash-latest`), completely eliminating update failures.

---

### 3. `app.js` & `index.html` (Dynamic Frontend Interface)
* **Premium Dark Mode UI**: Designed with beautiful gradients, glassmorphism, and responsive CSS grids.
* **Flawless Tab Filtering (`filterTab`)**: Dynamically toggles between subject tabs (Polity, Economy, Environment, Awards, Science, etc.). Automatically hides unrelated sections (like MCQs or Mains) when browsing specific subject matter.
* **Intelligent Empty State**: If no major news appeared in a specific category today (e.g., Awards), it displays a beautiful dark-mode message explaining that the AI skipped it to keep preparation focused on high-yield topics.
* **Interactive MCQ Quiz**: Allows aspirants to click options, get immediate color-coded feedback (green/red), and read detailed explanations.
* **PDF Download**: Implements `window.print()` with custom print stylesheets for aspirants to download daily notes as clean PDFs.

---

## 🚀 How to Run Locally

### Prerequisites
* Node.js (v18 or higher)
* A Google Gemini API Key

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Srimanth3272/exam-edge-ai.git
   cd exam-edge-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create your `.env` file**:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
   PORT=3000
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open in Browser**:
   Navigate to `http://localhost:3000`.

---

## 🌐 Global Deployment (Render / Railway)

This application is 100% production-ready for deployment on cloud platforms like **Render.com** or **Railway.app**.

1. Connect your GitHub repository to Render/Railway.
2. Set the build command to `npm install` and start command to `npm start`.
3. Add your `GEMINI_API_KEY` in the platform's Environment Variables section.
4. Deploy! (Use UptimeRobot to ping your live URL every 10 minutes if using a free tier to ensure the 7:00 AM daily cron job runs perfectly).

---
*Engineered with complete AI resilience and automation for Indian Exam Aspirants.*
