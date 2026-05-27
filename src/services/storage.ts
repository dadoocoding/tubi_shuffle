import { STORAGE_KEYS } from "../shared/constants";
import type { AppSettings, Channel, EpisodeProgress, PlaybackSession } from "../shared/types";

const defaultSettings: AppSettings = {
  autoplay: true,
  avoidBackToBackSeries: true
};

async function getValue<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

async function setValue<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export const storage = {
  getChannels(): Promise<Channel[]> {
    return getValue<Channel[]>(STORAGE_KEYS.channels, []);
  },

  setChannels(channels: Channel[]): Promise<void> {
    return setValue(STORAGE_KEYS.channels, channels);
  },

  async saveChannel(channel: Channel): Promise<Channel[]> {
    const channels = await storage.getChannels();
    const existingIndex = channels.findIndex((item) => item.id === channel.id);
    const nextChannels =
      existingIndex >= 0
        ? channels.map((item) => (item.id === channel.id ? channel : item))
        : [...channels, channel];
    await storage.setChannels(nextChannels);
    return nextChannels;
  },

  async deleteChannel(channelId: string): Promise<Channel[]> {
    const channels = await storage.getChannels();
    const nextChannels = channels.filter((channel) => channel.id !== channelId);
    await storage.setChannels(nextChannels);
    return nextChannels;
  },

  getEpisodeProgress(): Promise<EpisodeProgress> {
    return getValue<EpisodeProgress>(STORAGE_KEYS.episodeProgress, {});
  },

  setEpisodeProgress(progress: EpisodeProgress): Promise<void> {
    return setValue(STORAGE_KEYS.episodeProgress, progress);
  },

  getPlaybackSession(): Promise<PlaybackSession | undefined> {
    return getValue<PlaybackSession | undefined>(STORAGE_KEYS.playbackSession, undefined);
  },

  setPlaybackSession(session: PlaybackSession): Promise<void> {
    return setValue(STORAGE_KEYS.playbackSession, session);
  },

  async clearPlaybackSession(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.playbackSession);
  },

  getSettings(): Promise<AppSettings> {
    return getValue<AppSettings>(STORAGE_KEYS.settings, defaultSettings);
  },

  setSettings(settings: AppSettings): Promise<void> {
    return setValue(STORAGE_KEYS.settings, settings);
  }
};
