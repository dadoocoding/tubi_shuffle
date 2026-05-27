import type { ChannelItem, ContentKind } from "../shared/types";
import { createId } from "./id";

function normalizeUrl(input: string): URL {
  const url = new URL(input.trim());
  if (!["tubitv.com", "www.tubitv.com"].includes(url.hostname)) {
    throw new Error("Only Tubi URLs are supported in this MVP.");
  }
  return url;
}

export function inferTubiKind(url: URL): ContentKind {
  const pathname = url.pathname.toLowerCase();
  if (pathname.includes("/series/") || pathname.includes("/tv-shows/")) {
    return "series";
  }
  return "movie";
}

export function getTubiItemId(url: URL): string {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.at(-1)?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || url.hostname;
}

export function createTubiChannelItem(inputUrl: string, title?: string): ChannelItem {
  const url = normalizeUrl(inputUrl);
  const kind = inferTubiKind(url);
  const tubiId = getTubiItemId(url);
  return {
    id: createId("item"),
    kind,
    title: title?.trim() || decodeURIComponent(tubiId).replaceAll("-", " "),
    url: url.toString(),
    source: "tubi",
    seriesId: kind === "series" ? tubiId : undefined
  };
}
