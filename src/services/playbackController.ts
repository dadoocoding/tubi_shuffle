import { logger } from "../shared/logger";
import type { Channel, PlaybackSession, QueueEntry } from "../shared/types";
import { pickNextQueueEntry, recordQueueEntryCompleted } from "./queueEngine";
import { storage } from "./storage";

const scope = "background/playback";

async function openOrNavigatePlaybackTab(entry: QueueEntry, existingTabId?: number): Promise<number> {
  if (existingTabId) {
    try {
      await chrome.tabs.update(existingTabId, { url: entry.url, active: true });
      logger.info(scope, "Navigated existing playback tab", { tabId: existingTabId, entry });
      return existingTabId;
    } catch (error) {
      logger.warn(scope, "Existing playback tab unavailable; opening a new tab", error);
    }
  }

  const tab = await chrome.tabs.create({ url: entry.url, active: true });
  if (!tab.id) throw new Error("Chrome did not return a tab id.");
  logger.info(scope, "Opened playback tab", { tabId: tab.id, entry });
  return tab.id;
}

export async function startChannel(channel: Channel): Promise<PlaybackSession> {
  const progress = await storage.getEpisodeProgress();
  const settings = await storage.getSettings();
  const entry = pickNextQueueEntry(channel, progress, {
    avoidBackToBackSeries: settings.avoidBackToBackSeries,
    shufflePlayback: settings.shufflePlayback,
    playedItemIds: []
  });

  if (!entry) throw new Error("Channel has no playable items.");

  const tabId = await openOrNavigatePlaybackTab(entry);
  const now = new Date().toISOString();
  const session: PlaybackSession = {
    channelId: channel.id,
    tabId,
    activeEntry: entry,
    lastSeriesId: entry.seriesId,
    playedItemIds: [],
    startedAt: now,
    updatedAt: now
  };
  await storage.setPlaybackSession(session);
  return session;
}

export async function advanceChannel(channel: Channel): Promise<PlaybackSession | undefined> {
  const session = await storage.getPlaybackSession();
  if (!session?.activeEntry || session.channelId !== channel.id) {
    logger.warn(scope, "No active session to advance for channel", channel.id);
    return undefined;
  }

  const progress = recordQueueEntryCompleted(session.activeEntry, await storage.getEpisodeProgress());
  await storage.setEpisodeProgress(progress);

  const validItemIds = new Set(channel.items.map((item) => item.id));
  const completedItemIds = [...(session.playedItemIds ?? []), session.activeEntry.itemId].filter((itemId) =>
    validItemIds.has(itemId)
  );
  const playedItemIdsForNextPick = completedItemIds.length >= channel.items.length ? [] : completedItemIds;

  const settings = await storage.getSettings();
  const nextEntry = pickNextQueueEntry(channel, progress, {
    avoidBackToBackSeries: settings.avoidBackToBackSeries,
    shufflePlayback: settings.shufflePlayback,
    lastSeriesId: session.lastSeriesId,
    playedItemIds: playedItemIdsForNextPick
  });

  if (!nextEntry) {
    await storage.clearPlaybackSession();
    return undefined;
  }

  const tabId = await openOrNavigatePlaybackTab(nextEntry, session.tabId);
  const nextSession: PlaybackSession = {
    ...session,
    tabId,
    activeEntry: nextEntry,
    lastSeriesId: nextEntry.seriesId,
    playedItemIds: playedItemIdsForNextPick,
    updatedAt: new Date().toISOString()
  };
  await storage.setPlaybackSession(nextSession);
  return nextSession;
}
