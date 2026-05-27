import type { Channel, PlaybackMetadata } from "./types";

export const MessageType = {
  StartChannel: "START_CHANNEL",
  StopChannel: "STOP_CHANNEL",
  ChannelStarted: "CHANNEL_STARTED",
  PlaybackMetadata: "PLAYBACK_METADATA",
  PlaybackEnded: "PLAYBACK_ENDED",
  PlaybackReady: "PLAYBACK_READY",
  RequestAutoplay: "REQUEST_AUTOPLAY",
  AutoplayAttempted: "AUTOPLAY_ATTEMPTED"
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export type ExtensionMessage =
  | { type: typeof MessageType.StartChannel; channel: Channel }
  | { type: typeof MessageType.StopChannel }
  | { type: typeof MessageType.ChannelStarted; channelId: string; tabId?: number }
  | { type: typeof MessageType.PlaybackMetadata; metadata: PlaybackMetadata }
  | { type: typeof MessageType.PlaybackEnded; metadata: PlaybackMetadata }
  | { type: typeof MessageType.PlaybackReady; metadata: PlaybackMetadata }
  | { type: typeof MessageType.RequestAutoplay }
  | { type: typeof MessageType.AutoplayAttempted; success: boolean; reason?: string };

export type MessageResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};
