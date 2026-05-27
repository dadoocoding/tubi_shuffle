import type { Channel, ChannelItem } from "../shared/types";
import { createId } from "./id";

export function createChannel(name: string): Channel {
  const now = new Date().toISOString();
  return {
    id: createId("channel"),
    name: name.trim() || "Untitled Channel",
    items: [],
    createdAt: now,
    updatedAt: now
  };
}

export function renameChannel(channel: Channel, name: string): Channel {
  return {
    ...channel,
    name: name.trim() || channel.name,
    updatedAt: new Date().toISOString()
  };
}

export function addItemToChannel(channel: Channel, item: ChannelItem): Channel {
  return {
    ...channel,
    items: [...channel.items, item],
    updatedAt: new Date().toISOString()
  };
}

export function removeItemFromChannel(channel: Channel, itemId: string): Channel {
  return {
    ...channel,
    items: channel.items.filter((item) => item.id !== itemId),
    updatedAt: new Date().toISOString()
  };
}
