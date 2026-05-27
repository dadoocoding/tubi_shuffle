import type { Channel, ChannelItem } from "../shared/types";
import { createId } from "./id";

const EXPORT_FORMAT = "tubi-shuffle-tv.channels";
const EXPORT_VERSION = 1;

interface ChannelExportPayloadV1 {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  channels: Channel[];
}

export type ChannelExportPayload = ChannelExportPayloadV1;

function assertChannelItem(value: unknown): asserts value is ChannelItem {
  if (!value || typeof value !== "object") throw new Error("Invalid playlist item.");
  const item = value as Partial<ChannelItem>;
  if (item.source !== "tubi") throw new Error("Only Tubi playlist items are supported.");
  if (item.kind !== "movie" && item.kind !== "series") throw new Error("Invalid playlist item kind.");
  if (typeof item.title !== "string" || typeof item.url !== "string") {
    throw new Error("Playlist items must include a title and URL.");
  }
  const url = new URL(item.url);
  if (!["tubitv.com", "www.tubitv.com"].includes(url.hostname)) {
    throw new Error("Imported playlists can only contain Tubi URLs.");
  }
}

function assertChannel(value: unknown): asserts value is Channel {
  if (!value || typeof value !== "object") throw new Error("Invalid channel.");
  const channel = value as Partial<Channel>;
  if (typeof channel.name !== "string" || !Array.isArray(channel.items)) {
    throw new Error("Imported channel must include a name and playlist items.");
  }
  channel.items.forEach(assertChannelItem);
}

function parsePayload(json: string): Channel[] {
  const parsed = JSON.parse(json) as unknown;

  if (parsed && typeof parsed === "object" && "format" in parsed) {
    const payload = parsed as Partial<ChannelExportPayloadV1>;
    if (payload.format !== EXPORT_FORMAT || payload.version !== EXPORT_VERSION || !Array.isArray(payload.channels)) {
      throw new Error("Unsupported Tubi Shuffle TV playlist file.");
    }
    payload.channels.forEach(assertChannel);
    return payload.channels;
  }

  assertChannel(parsed);
  return [parsed];
}

function localizeImportedChannel(channel: Channel): Channel {
  const now = new Date().toISOString();
  return {
    ...channel,
    id: createId("channel"),
    name: `${channel.name} (Imported)`,
    createdAt: now,
    updatedAt: now,
    items: channel.items.map((item) => ({
      ...item,
      id: createId("item")
    }))
  };
}

export function createChannelExportPayload(channels: Channel[]): ChannelExportPayload {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    channels
  };
}

export function serializeChannels(channels: Channel[]): string {
  return JSON.stringify(createChannelExportPayload(channels), null, 2);
}

export function deserializeChannels(json: string): Channel[] {
  return parsePayload(json).map(localizeImportedChannel);
}

export function createExportFileName(channel: Channel): string {
  const safeName = channel.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeName || "tubi-channel"}-playlist.json`;
}
