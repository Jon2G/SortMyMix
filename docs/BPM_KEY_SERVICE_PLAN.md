# BPM & Key Service – Logic Plan & Debugging Guide

## 1. Desired Architecture

**Target flow**: Only **3 files** in the chain.

```
SortView.vue
    │
    ▼
bpmKeyService.ts   (orchestration: cache, primary, fallback, Camelot)
    │
    ├──► getSongBpm.ts      (primary source)
    │
    └──► acousticBrainz.ts  (fallback when getSongBpm returns null)
```

| Layer | File | Role |
|-------|------|------|
| 1 | `SortView.vue` | UI, calls bpmKeyService |
| 2 | `bpmKeyService.ts` | Orchestration: cache → getSongBpm → fallback to acousticBrainz → Camelot |
| 3 | `getSongBpm.ts` or `acousticBrainz.ts` | Sources (bpmKeyService calls one or the other per track) |

**Implementation**: Merge `bpmKeySearch.ts` into `bpmKeyService.ts`, remove `bpmKeySearch.ts`. SortView imports only `bpmKeyService`.

---

## 2. Data Flow (Step by Step)

### SortView → bpmKeyService (single service)

1. **SortView** loads playlist tracks from Spotify.
2. Builds `tracksForLookup`: `{ id, name, artists, duration_ms }` per track.
3. Calls `loadBpmKeyForTracks(tracksForLookup, callback)`.
4. Callback receives `(trackId, { features, camelotKey })` and updates `originalTracks` / `sortedTracks`.

### bpmKeyService (all logic in one place)

5. Processes tracks in batches of 3.
6. For each batch:
   - **Cache check**: `getCachedFeatures(trackId)`
     - If `!== undefined` → use cached value, convert to Camelot, call callback.
     - If `=== undefined` → add to `uncached`.
   - For each uncached track:
     - **Primary**: `searchGetSongBpm(artist, searchTitle)`.
     - If result → build features, cache, convert to Camelot, call callback.
     - If null → add to `needFallback`.
   - For `needFallback`:
     - **Fallback**: `getBpmFromAcousticBrainzForTracks(needFallback)`.
     - For each track: cache (if any), convert to Camelot, call callback.

---

## 3. Cache Semantics (bpmCache.ts)

| Return value | Meaning |
|--------------|---------|
| `undefined` | Not in cache – must fetch |
| `null` | Cached “no data” – should not re-fetch |
| `SpotifyAudioFeatures` | Cached data – use it |

**Current bug**: The cache check uses `if (cached != null)`.

- `undefined != null` → false → treated as uncached (correct).
- `null != null` → false → treated as uncached (wrong: re-fetches “no data”).
- `object != null` → true → treated as cached (correct).

**Correct check**: `if (cached !== undefined)` so both `null` and `object` are treated as cached.

---

## 4. Potential Failure Points

### A. GetSongBPM never called

- **Cause**: `VITE_GETSONGBPM_API_KEY` not set.
- **Effect**: `searchGetSongBpm` returns `null` immediately; all tracks go to AcousticBrainz fallback.
- **Check**: DevTools → Network → no requests to `api.getsongbpm.com`.

### B. Cache never used

- **Cause**: Wrong cache check (`cached != null` instead of `cached !== undefined`).
- **Effect**: Cached `null` is re-fetched every time.
- **Check**: Inspect `localStorage['sortmymix:bpm_cache']` after a run.

### C. AcousticBrainz returns nothing

- **Cause**: MusicBrainz has no recording, or AcousticBrainz has no low-level data.
- **Effect**: `features` is `null`; UI shows “no BPM/key”.
- **Check**: DevTools → Network → `musicbrainz.org`, `acousticbrainz.org`.

### D. Callback not firing

- **Cause**: Unhandled error in `getBpmForTracksStreaming` or `getBpmFromAcousticBrainzForTracks`.
- **Effect**: No updates to `originalTracks`; loading never clears.
- **Check**: Add `try/catch` and `console.error` in the streaming flow.

### E. Track ID mismatch

- **Cause**: Different ID format (e.g. Spotify vs. other source).
- **Effect**: Cache misses; possible wrong track updates.
- **Check**: Ensure `tracksForLookup[].id` matches Spotify track IDs.

### F. Artist/title format

- **Cause**: Empty artist, bad title, or wrong `stripTrackTitleForSearch` usage.
- **Effect**: GetSongBPM and MusicBrainz return no results.
- **Check**: Log `artist`, `searchTitle` before each lookup.

---

## 5. Debugging Checklist

1. **Env**
   - [ ] `VITE_GETSONGBPM_API_KEY` set in `.env` / `.env.local`
   - [ ] Dev server restarted after adding env vars

2. **Network**
   - [ ] Requests to `api.getsongbpm.com` (if key set)
   - [ ] Requests to `musicbrainz.org`
   - [ ] Requests to `acousticbrainz.org`

3. **Cache**
   - [ ] `localStorage.getItem('sortmymix:bpm_cache')` after loading a playlist
   - [ ] Cache keys match Spotify track IDs

4. **Callbacks**
   - [ ] `onTrackFeatures` called for each track (add `console.log` in `bpmKeyService`)

5. **Data**
   - [ ] `tracksForLookup` has `id`, `name`, `artists`, `duration_ms`
   - [ ] `artists[0].name` present

---

## 6. Proposed Fixes

### Fix 1: Cache check

**File**: `bpmKeyService.ts` (after merge)

**Change**: Use `cached !== undefined` instead of `cached != null`:

```ts
// Before
if (cached != null) {
  onTrackFeatures(t.id, cached)
} else {
  uncached.push(t)
}

// After
if (cached !== undefined) {
  onTrackFeatures(t.id, cached)
} else {
  uncached.push(t)
}
```

Apply wherever cache is checked.

### Fix 2: Error handling

**File**: `bpmKeyService.ts`

**Change**: Wrap streaming logic in `try/catch` so one failed batch does not block others, and log errors.

### Fix 3: Defensive logging (optional)

**File**: `bpmKeyService.ts`

**Change**: Add optional debug logs (e.g. behind `import.meta.env.DEV`) for:

- Cache hit/miss
- GetSongBPM result (hit/null)
- Fallback usage
- Final `onTrackFeatures` calls

---

## 7. Expected Behavior

| Scenario | GetSongBPM | AcousticBrainz | Result |
|----------|------------|----------------|--------|
| API key set, track in GetSongBPM | ✓ hit | - | BPM + key from GetSongBPM |
| API key set, track not in GetSongBPM | ✗ null | ✓ hit | BPM + key from AcousticBrainz |
| API key set, neither has data | ✗ null | ✗ null | `features: null` |
| No API key | skipped | ✓ hit | BPM + key from AcousticBrainz |
| Cached (object) | - | - | Use cache, no fetch |
| Cached (null) | - | - | Use cache, no fetch (after Fix 1) |

---

## 8. File Reference (Target State)

**Flow (3 files)**:
| # | File | Role |
|---|------|------|
| 1 | `SortView.vue` | UI entry point |
| 2 | `bpmKeyService.ts` | Orchestration: cache, getSongBpm → fallback acousticBrainz, Camelot |
| 3 | `getSongBpm.ts` | Primary source |
| 3 | `acousticBrainz.ts` | Fallback source |

**Supporting** (not in main flow): `bpmCache.ts`, `trackTitle.ts`, `camelot.ts`, `config/getSongBpm.ts`

~~`bpmKeySearch.ts`~~ (removed – logic merged into bpmKeyService)
