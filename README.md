# Octav — Pure Sound Music App 🎵

> A premium, high-fidelity streaming web app built with React 19, Tailwind CSS v4, Web Audio API, and GSAP animations. Engineered with Apple iOS liquid glass aesthetics and custom studio tools for musicians.

---

## ✨ Features

- **Crystal Clear Audio Streams:** Full-length 320kbps AAC streams resolved dynamically with zero snippet resets.
- **Studio 5-Band Equalizer & IEM Presets:** Real-time Web Audio API `BiquadFilterNode` chain (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz) with SVG Bézier curve visualizer and audiophile presets (*Flat / IEM Reference, Rock & Metal, Vocal & Acoustic, Late Night Warm*).
- **Musician Practice Studio:** Interactive guitar chord charts with slash chords, half-step/capo transpose (`-6` to `+6`), sub-frame A-B looper, and pitch-preserving speed changer (`0.5x` - `1.25x`).
- **Dynamic Personalized Home Feed:** Interactive music genre filter capsules (`All`, `Indo Hits`, `Rock`, `Acoustic`), conversational greetings, and localized catalogs.
- **Top 50 Ranked Charts:** Real-time Indonesian Top 50 and Global Top 50 editorial charts.
- **Smart Queue & Infinite Auto-Play:** Context-aware genre affinity engine that replenishes upcoming tracks dynamically without repeating session songs.
- **Synced Lyrics & Story Cards:** Real-time synced lyrics from LRCLIB with 9:16 exportable story cards for social sharing.
- **Octav Rewind Stats:** Session listening time and top played track analytics.
- **Cloud & Local Sync:** Seamless Supabase cloud backup for playlists, liked tracks, and custom profile avatars with instant guest mode fallback.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/keenan-afk/octav-music-app.git
   cd octav-music-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase project credentials in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4
- **Motion & Interactions:** GSAP 3, `@gsap/react`
- **Icons:** Lucide React
- **Audio Engine:** HTML5 Audio, Web Audio API (BiquadFilter, Analyser, Convolver)
- **Backend / Auth:** Supabase Auth & Cloud Database
- **Metadata & Lyrics:** iTunes Search API, LRCLIB Synced Lyrics

---

## 🔒 Security Note

Vital files (such as `.env`, secret tokens, and build caches) are strictly ignored in `.gitignore`. Never commit API secret keys or service credentials.

---

## 📄 License

MIT License. Crafted with precision for music lovers and audio creators.
