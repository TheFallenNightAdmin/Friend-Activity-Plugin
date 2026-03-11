# 🎵 MusicMenu

> A floating music player plugin for BetterDiscord. Search and play YouTube and SoundCloud tracks directly inside Discord — no external apps, no switching windows.

**by pagoni meow** • v1.0.0 • No dependencies required

---

## What Is It?

MusicMenu adds a sleek draggable music panel to Discord. Type a search term or paste a URL, hit play, and your music starts right inside your client. Supports a queue system so you can line up multiple tracks and cycle through them while you chat.

---

## Features

### 🎬 YouTube Playback
- Paste any YouTube URL or video ID to load it instantly
- Or just type a search term — MusicMenu finds the first result automatically
- Full embedded player with native YouTube controls
- No API key required

### 🔊 SoundCloud Playback
- Paste any public SoundCloud track URL to load it in the official SoundCloud widget
- Or search by name — MusicMenu finds the first matching track
- Autoplay on load

### 📋 Queue System
- Every search adds a track to your queue
- Click any queued track to jump to it
- ⏮ ⏭ buttons to cycle through the queue
- ✕ button on each track to remove it individually

### 🎚️ Volume Control
- Slider controls YouTube playback volume
- Setting saves between Discord restarts

### 🪟 Floating Draggable Panel
- Drag anywhere on screen by the header
- Position saves and restores automatically
- Collapse to just the title bar with the − button
- Hide/show with the music note toggle button in the sidebar

---

## Installation

1. Install [BetterDiscord](https://betterdiscord.app) if you haven't already
2. Download [`MusicMenu.plugin.js`](./MusicMenu.plugin.js)
3. Drop it into your BetterDiscord plugins folder:

| OS | Path |
|----|------|
| Windows | `%AppData%\BetterDiscord\plugins\` |
| macOS | `~/Library/Application Support/BetterDiscord/plugins/` |
| Linux | `~/.config/BetterDiscord/plugins/` |

4. Open Discord → Settings → Plugins → enable **MusicMenu**
5. The panel appears in the bottom-right corner. A music note icon is added to the left sidebar to toggle it.

---

## Usage

### Playing a YouTube track
```
1. Click the YouTube tab
2. Paste a URL like https://www.youtube.com/watch?v=dQw4w9WgXcQ
   OR type a search term like:  lofi hip hop
3. Hit Enter or click ▶
```

### Playing a SoundCloud track
```
1. Click the SoundCloud tab
2. Paste a URL like https://soundcloud.com/artist/trackname
   OR type a search term like:  phonk mix
3. Hit Enter or click ▶
```

### Queue controls

| Button | Action |
|--------|--------|
| ⏮ | Previous track in queue |
| ▶ / ⏸ | Play / Pause (YouTube only) |
| ⏭ | Next track in queue |
| Track row click | Jump to that track |
| ✕ on track | Remove from queue |

---

## Notes

- **Search scrapes YouTube/SoundCloud directly** — no API keys, but results may occasionally miss for unusual queries. Pasting a direct URL always works.
- **SoundCloud volume** is controlled by the widget's own internal slider, not the MusicMenu volume control (which only affects YouTube).
- **YouTube requires an internet connection** to load the IFrame API on first use. After that it's cached by Electron.
- The panel **does not persist your queue** between Discord restarts — it resets when Discord closes.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Panel doesn't appear | Make sure the plugin is enabled. Click the music note icon in the left sidebar. |
| YouTube player shows a blank box | Wait a second for the YouTube IFrame API to load, then search again. |
| Search returns no results | Try pasting a direct URL instead of searching by name. |
| SoundCloud track won't play | Make sure the track is public. Private tracks can't be embedded. |
| Panel went off-screen | Settings → Plugins → MusicMenu → Reset Panel Position. |

---

## Disclaimer

This plugin embeds YouTube and SoundCloud content using their official public embed/widget APIs. It does not download, redistribute, or circumvent any DRM. Use in accordance with YouTube's and SoundCloud's respective terms of service.

---

*MusicMenu v1.0.0 — by pagoni meow*
