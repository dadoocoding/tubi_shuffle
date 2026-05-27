import { logger } from "../shared/logger";
import { MessageType, type ExtensionMessage, type MessageResponse } from "../shared/messages";
import { advanceChannel, startChannel } from "../services/playbackController";
import { storage } from "../services/storage";

const scope = "background";

async function getActiveChannel() {
  const session = await storage.getPlaybackSession();
  if (!session) return undefined;
  const channels = await storage.getChannels();
  return channels.find((channel) => channel.id === session.channelId);
}

chrome.runtime.onInstalled.addListener(() => {
  logger.info(scope, "Installed");
});

chrome.runtime.onStartup.addListener(async () => {
  const session = await storage.getPlaybackSession();
  logger.info(scope, "Service worker startup", session);
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  logger.debug(scope, "Received message", { message, sender });

  void (async () => {
    try {
      if (message.type === MessageType.StartChannel) {
        const session = await startChannel(message.channel);
        sendResponse({ ok: true, data: session } satisfies MessageResponse);
        return;
      }

      if (message.type === MessageType.StopChannel) {
        await storage.clearPlaybackSession();
        sendResponse({ ok: true } satisfies MessageResponse);
        return;
      }

      if (message.type === MessageType.PlaybackReady) {
        const settings = await storage.getSettings();
        const session = await storage.getPlaybackSession();
        const senderTabId = sender.tab?.id;
        const isPlaybackTab = senderTabId !== undefined && session?.tabId === senderTabId;
        if (settings.autoplay && isPlaybackTab) {
          await chrome.tabs.sendMessage(senderTabId, { type: MessageType.RequestAutoplay });
        }
        sendResponse({ ok: true } satisfies MessageResponse);
        return;
      }

      if (message.type === MessageType.PlaybackMetadata) {
        logger.info(scope, "Playback metadata", message.metadata);
        sendResponse({ ok: true } satisfies MessageResponse);
        return;
      }

      if (message.type === MessageType.PlaybackEnded) {
        logger.info(scope, "Playback ended; advancing channel", message.metadata);
        const channel = await getActiveChannel();
        if (!channel) {
          logger.warn(scope, "No active channel found while handling playback completion");
          sendResponse({ ok: false, error: "No active channel found." } satisfies MessageResponse);
          return;
        }

        const session = await advanceChannel(channel);
        sendResponse({ ok: true, data: session } satisfies MessageResponse);
        return;
      }

      sendResponse({ ok: false, error: "Unhandled message type." } satisfies MessageResponse);
    } catch (error) {
      logger.error(scope, "Message handler failed", error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      } satisfies MessageResponse);
    }
  })();

  return true;
});
