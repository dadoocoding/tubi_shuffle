export const tubiConfig = {
  hostnames: ["tubitv.com", "www.tubitv.com"],
  videoSelectors: ["video"],
  playButtonSelectors: [
    "button[aria-label='Play']",
    "button[title='Play']",
    "[data-testid='play-button']",
    ".web-player-icon-play"
  ],
  completionThresholdSeconds: 3
};
