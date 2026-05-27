# Tubi Shuffle TV

A local-only Chrome Manifest V3 extension that creates personalized pseudo-TV channels from official Tubi pages.

The extension orchestrates tab navigation and playback state. It does not bypass, block, skip, modify, restream, download, or inject ads. All playback happens on Tubi.

## Local Development

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Build the extension:

   ```powershell
   npm run build
   ```

3. Load it in Chrome:

   - Open `chrome://extensions`
   - Enable Developer mode
   - Select **Load unpacked**
   - Choose the generated `dist` folder

4. Open the popup, create a channel, paste Tubi movie/show URLs, then press **Start Channel**.

## Publishing Notes

- Extension icons live in `public/icons`.
- The privacy policy is in `PRIVACY_POLICY.md`.
- Before submitting to the Chrome Web Store, review the privacy policy and listing copy to make sure they still match the extension's actual behavior.

## Architecture

- `src/popup`: React + TypeScript channel editor.
- `src/background`: MV3 service worker and playback orchestration.
- `src/content`: Tubi page observer and HTML5 video event bridge.
- `src/services`: storage, channel, queue, playback, and Tubi-specific URL logic.
- `src/shared`: cross-context types, constants, and message contracts.

## Current MVP Notes

The first pass accepts Tubi URLs manually. Movies are queued as one-off entries. Show URLs are represented as series items with persisted progression slots, ready for a future Tubi catalog resolver that can expand a show page into ordered episode URLs.
