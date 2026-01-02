# SortMyMix

Sort your Spotify playlists by **BPM** and **harmonic key** using the **Camelot Wheel** for perfect DJ-style mixing.

![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vuestic UI](https://img.shields.io/badge/Vuestic_UI-1.10-154EC1)

## Features

- **BPM Sorting** - Organize tracks by tempo for smooth energy transitions
- **Harmonic Mixing** - Use the Camelot Wheel for seamless key-matched transitions
- **Smart Preview** - See before/after comparison with harmonic score analysis
- **Direct Spotify Integration** - Sort existing playlists without creating duplicates

## How It Works

1. **Connect** your Spotify account
2. **Select** a playlist to sort
3. **Preview** the optimized order with BPM and key info
4. **Apply** the sort to update your Spotify playlist

### Sorting Algorithm

Tracks are sorted using a two-pass algorithm:
1. **Primary Sort**: Group tracks by BPM ranges (5 BPM buckets)
2. **Secondary Sort**: Within each BPM group, sort by Camelot wheel position
3. **Optimization**: Smooth transitions between BPM groups using harmonic compatibility

## Setup

### Prerequisites

- Node.js 18+
- A Spotify Developer account

### Spotify App Configuration

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:5173/SortMyMix/callback` as a Redirect URI (for development)
4. Add `https://YOUR_USERNAME.github.io/SortMyMix/callback` as a Redirect URI (for production)
5. Copy your **Client ID**

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/SortMyMix/callback
```

For production, you can also set the redirect URI:
```env
VITE_SPOTIFY_REDIRECT_URI=https://YOUR_USERNAME.github.io/SortMyMix/callback
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is configured for GitHub Pages deployment:

1. Push to the `main` branch
2. The GitHub Action will automatically build and deploy
3. Access at `https://YOUR_USERNAME.github.io/SortMyMix/`

### Manual Deployment

```bash
npm run build
# Deploy the `dist` folder to your hosting
```

## Tech Stack

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Vuestic UI** component library
- **Pinia** for state management
- **Vue Router** for navigation
- **Vite** for blazing fast builds

## The Camelot Wheel

The Camelot Wheel is a harmonic mixing system used by professional DJs:

- **Numbers (1-12)**: Represent musical keys
- **Letters (A/B)**: A = Minor keys, B = Major keys
- **Compatible mixes**:
  - Same position (e.g., 8B → 8B)
  - Adjacent numbers (e.g., 8B → 7B or 9B)
  - Same number, different letter (e.g., 8B → 8A)

## License

ISC
