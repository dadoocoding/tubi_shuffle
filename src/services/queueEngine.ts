import type { Channel, ChannelItem, EpisodeProgress, QueueEntry } from "../shared/types";
import { createId } from "./id";

export interface QueueEngineOptions {
  avoidBackToBackSeries: boolean;
  lastSeriesId?: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function itemSeriesKey(item: ChannelItem): string | undefined {
  return item.kind === "series" ? item.seriesId ?? item.id : undefined;
}

export function pickNextQueueEntry(
  channel: Channel,
  progress: EpisodeProgress,
  options: QueueEngineOptions
): QueueEntry | undefined {
  if (channel.items.length === 0) return undefined;

  const candidates = shuffle(channel.items);
  const preferred = candidates.find((item) => {
    const seriesKey = itemSeriesKey(item);
    return !options.avoidBackToBackSeries || !seriesKey || seriesKey !== options.lastSeriesId;
  });

  const item = preferred ?? candidates[0];
  const seriesId = itemSeriesKey(item);
  const episodeIndex = seriesId ? progress[seriesId]?.nextEpisodeIndex ?? 0 : undefined;

  return {
    id: createId("queue"),
    channelId: channel.id,
    itemId: item.id,
    kind: item.kind,
    title: item.title,
    url: item.url,
    seriesId,
    episodeIndex
  };
}

export function recordQueueEntryCompleted(
  entry: QueueEntry,
  progress: EpisodeProgress,
  completedAt = new Date().toISOString()
): EpisodeProgress {
  if (!entry.seriesId) return progress;

  const current = progress[entry.seriesId]?.nextEpisodeIndex ?? 0;
  return {
    ...progress,
    [entry.seriesId]: {
      nextEpisodeIndex: Math.max(current, (entry.episodeIndex ?? current) + 1),
      updatedAt: completedAt
    }
  };
}
