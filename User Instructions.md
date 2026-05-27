# Tubi Shuffle TV User Instructions

Tubi Shuffle TV is a Chrome extension that lets you create local pseudo-TV channels from Tubi show and movie URLs.

Playback stays on official Tubi pages. The extension does not block ads, skip ads, download video, restream video, or inject ads.

## Install From Source

1. Download or clone this repository.

2. Open a terminal in the project folder.

3. Install dependencies:

   ```powershell
   npm.cmd install
   ```

4. Build the extension:

   ```powershell
   npm.cmd run build
   ```

5. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

6. Turn on **Developer mode**.

7. Click **Load unpacked**.

8. Select the generated `dist` folder.

## Create a Channel

1. Click the Tubi Shuffle TV extension icon.
2. Enter a channel name.
3. Click **Create**.
4. Paste official Tubi show or movie URLs.
5. Click **Add URL** for each item.
6. Click **Start** to begin playback.

## Import and Export Playlists

- Click **Export** to save the selected channel as a JSON playlist file.
- Click **Import** to load a playlist file shared by someone else.

Imported playlists are added as new local channels and do not overwrite your existing channels.

## Privacy

Tubi Shuffle TV stores channel and playback state locally in your browser. It does not send your playlists, settings, or playback state to a remote server.

You can read the full privacy policy from the extension popup by clicking **Privacy Policy**.

## Troubleshooting

- If Chrome does not show the newest changes, go to `chrome://extensions` and click **Reload** on Tubi Shuffle TV.
- If playback does not start automatically, Chrome or Tubi may require one user interaction before video playback can begin.
- If a Tubi page changes its layout, playback detection or the play-button click behavior may need an extension update.
