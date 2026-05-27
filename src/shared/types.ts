export type ContentKind = "movie" | "series";

export interface ChannelItem {
  id: string;
  kind: ContentKind;
  title: string;
  url: string;
  source: "tubi";
  seriesId?: string;
}

export interface Channel {
  id: string;
  name: string;
  items: ChannelItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeProgress {
  [seriesId: string]: {
    nextEpisodeIndex: number;
    updatedAt: string;
  };
}

export interface QueueEntry {
  id: string;
  channelId: string;
  itemId: string;
  kind: ContentKind;
  title: string;
  url: string;
  seriesId?: string;
  episodeIndex?: number;
}

export interface PlaybackSession {
  channelId: string;
  tabId?: number;
  activeEntry?: QueueEntry;
  lastSeriesId?: string;
  startedAt: string;
  updatedAt: string;
}

export interface PlaybackMetadata {
  url: string;
  title: string;
  detectedAt: string;
  duration?: number;
  currentTime?: number;
}

export interface AppSettings {
  autoplay: boolean;
  avoidBackToBackSeries: boolean;
}
