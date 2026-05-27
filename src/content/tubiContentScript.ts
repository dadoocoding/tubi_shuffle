import type { PlaybackMetadata } from "../shared/types";

const MessageType = {
  PlaybackMetadata: "PLAYBACK_METADATA",
  PlaybackEnded: "PLAYBACK_ENDED",
  PlaybackReady: "PLAYBACK_READY",
  RequestAutoplay: "REQUEST_AUTOPLAY",
  AutoplayAttempted: "AUTOPLAY_ATTEMPTED"
} as const;

type ContentScriptMessage =
  | { type: typeof MessageType.PlaybackMetadata; metadata: PlaybackMetadata }
  | { type: typeof MessageType.PlaybackEnded; metadata: PlaybackMetadata }
  | { type: typeof MessageType.PlaybackReady; metadata: PlaybackMetadata }
  | { type: typeof MessageType.RequestAutoplay }
  | { type: typeof MessageType.AutoplayAttempted; success: boolean; reason?: string };

const logger = {
  debug: (message: string, data?: unknown) => console.debug(`[Tubi Shuffle TV] content/tubi: ${message}`, data),
  info: (message: string, data?: unknown) => console.info(`[Tubi Shuffle TV] content/tubi: ${message}`, data),
  warn: (message: string, data?: unknown) => console.warn(`[Tubi Shuffle TV] content/tubi: ${message}`, data)
};

const tubiConfig = {
  videoSelectors: ["video"],
  playButtonSelectors: [
    "button[aria-label*='play' i]",
    "button[aria-label*='resume' i]",
    "button[title*='play' i]",
    "button[title*='resume' i]",
    "a[aria-label*='play' i]",
    "a[aria-label*='watch' i]",
    "[role='button'][aria-label*='play' i]",
    "[role='button'][aria-label*='watch' i]",
    "[data-testid*='play' i]",
    "[data-testid*='watch' i]",
    ".web-player-icon-play"
  ],
  completionThresholdSeconds: 3,
  autoplayRetryCount: 8,
  autoplayRetryDelayMs: 900
};

const scope = "content/tubi";
let activeVideo: HTMLVideoElement | undefined;
let observer: MutationObserver | undefined;
let completionSentForSrc: string | undefined;
let autoplayRetryTimer: number | undefined;
let autoplayAttempts = 0;
let playbackReadySentForUrl: string | undefined;

function getMetadata(video?: HTMLVideoElement): PlaybackMetadata {
  return {
    url: window.location.href,
    title: document.title,
    detectedAt: new Date().toISOString(),
    duration: Number.isFinite(video?.duration) ? video?.duration : undefined,
    currentTime: Number.isFinite(video?.currentTime) ? video?.currentTime : undefined
  };
}

function sendMessage(message: ContentScriptMessage): void {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      logger.warn("Message failed", chrome.runtime.lastError.message);
      return;
    }
    logger.debug("Message response", response);
  });
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function looksLikePlayControl(element: HTMLElement): boolean {
  const label = [
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("data-testid"),
    element.textContent
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(skip|next|trailer|mute|unmute|pause)/.test(label)) return false;
  return /(play|resume|watch now|start watching|continue watching)/.test(label);
}

function findPlayControl(): HTMLElement | undefined {
  for (const selector of tubiConfig.playButtonSelectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && isElementVisible(element) && looksLikePlayControl(element)) return element;
  }

  const controls = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button'], [tabindex]")
  );
  return controls.find((element) => isElementVisible(element) && looksLikePlayControl(element));
}

function notifyPlaybackReady(reason: string): void {
  if (playbackReadySentForUrl === window.location.href) return;
  playbackReadySentForUrl = window.location.href;
  logger.info(`Playback page appears ready: ${reason}`, getMetadata(activeVideo));
  sendMessage({ type: MessageType.PlaybackReady, metadata: getMetadata(activeVideo) });
}

function isNearEnd(video: HTMLVideoElement): boolean {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
  return video.duration - video.currentTime <= tubiConfig.completionThresholdSeconds;
}

function onVideoEnded(video: HTMLVideoElement): void {
  const srcKey = video.currentSrc || window.location.href;
  if (completionSentForSrc === srcKey) return;
  completionSentForSrc = srcKey;
  logger.info("Video completion detected", getMetadata(video));
  sendMessage({ type: MessageType.PlaybackEnded, metadata: getMetadata(video) });
}

function attachVideo(video: HTMLVideoElement): void {
  if (activeVideo === video) return;

  activeVideo?.removeEventListener("ended", activeVideoEnded);
  activeVideo?.removeEventListener("timeupdate", activeVideoTimeUpdate);

  activeVideo = video;
  completionSentForSrc = undefined;
  video.addEventListener("ended", activeVideoEnded);
  video.addEventListener("timeupdate", activeVideoTimeUpdate);
  video.addEventListener("loadedmetadata", () => {
    logger.info("Video metadata loaded", getMetadata(video));
    notifyPlaybackReady("video metadata loaded");
  });

  logger.info("Attached to Tubi video element", getMetadata(video));
  sendMessage({ type: MessageType.PlaybackMetadata, metadata: getMetadata(video) });
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    notifyPlaybackReady("video already has metadata");
  }
  scheduleAutoplayAttempt("video attached");
}

function activeVideoEnded(): void {
  if (activeVideo) onVideoEnded(activeVideo);
}

function activeVideoTimeUpdate(): void {
  if (activeVideo && isNearEnd(activeVideo)) onVideoEnded(activeVideo);
}

function findVideo(): HTMLVideoElement | undefined {
  for (const selector of tubiConfig.videoSelectors) {
    const video = document.querySelector<HTMLVideoElement>(selector);
    if (video) return video;
  }
  return undefined;
}

async function attemptAutoplay(): Promise<void> {
  const video = activeVideo ?? findVideo();

  if (video && video.paused) {
    try {
      await video.play();
      sendMessage({ type: MessageType.AutoplayAttempted, success: true });
      return;
    } catch (error) {
      logger.warn("Direct video play failed; trying page play controls", error);
    }
  } else if (video && !video.paused) {
    sendMessage({ type: MessageType.AutoplayAttempted, success: true, reason: "Video is already playing." });
    return;
  }

  const button = findPlayControl();

  if (button) {
    button.click();
    logger.info("Clicked detected Tubi play control", {
      label: button.getAttribute("aria-label") ?? button.textContent?.trim()
    });
    sendMessage({ type: MessageType.AutoplayAttempted, success: true, reason: "Clicked detected play control." });
    return;
  }

  sendMessage({ type: MessageType.AutoplayAttempted, success: false, reason: "No playable video or play control found." });
}

function scheduleAutoplayAttempt(reason: string): void {
  if (autoplayRetryTimer) return;
  autoplayAttempts = 0;

  const run = () => {
    autoplayRetryTimer = undefined;
    autoplayAttempts += 1;
    logger.debug(`Autoplay attempt ${autoplayAttempts}: ${reason}`);
    void attemptAutoplay();

    const shouldRetry = autoplayAttempts < tubiConfig.autoplayRetryCount && (!activeVideo || activeVideo.paused);
    if (shouldRetry) {
      autoplayRetryTimer = window.setTimeout(run, tubiConfig.autoplayRetryDelayMs);
    }
  };

  autoplayRetryTimer = window.setTimeout(run, 150);
}

function scanForPlayback(): void {
  const video = findVideo();
  if (video) attachVideo(video);
  if (!video && findPlayControl()) {
    notifyPlaybackReady("play control found");
  }
}

chrome.runtime.onMessage.addListener((message: ContentScriptMessage) => {
  if (message.type === MessageType.RequestAutoplay) {
    scheduleAutoplayAttempt("background requested autoplay");
  }
});

observer = new MutationObserver(scanForPlayback);
observer.observe(document.documentElement, { childList: true, subtree: true });
scanForPlayback();

window.addEventListener("pagehide", () => {
  observer?.disconnect();
  if (autoplayRetryTimer) window.clearTimeout(autoplayRetryTimer);
  logger.debug("Disconnected page observer");
});
