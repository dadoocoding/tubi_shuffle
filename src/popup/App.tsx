import { Download, Edit3, FileText, Info, Play, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { MessageType, type MessageResponse } from "../shared/messages";
import type { AppSettings, Channel } from "../shared/types";
import { createChannel, addItemToChannel, removeItemFromChannel, renameChannel } from "../services/channelService";
import { createExportFileName, deserializeChannels, serializeChannels } from "../services/playlistPortability";
import { storage } from "../services/storage";
import { createTubiChannelItem } from "../services/tubiUrl";

function sendRuntimeMessage<T>(message: unknown): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage(message);
}

export function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [newChannelName, setNewChannelName] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [editingName, setEditingName] = useState("");
  const [status, setStatus] = useState("Ready");
  const [settings, setSettings] = useState<AppSettings>({
    autoplay: true,
    avoidBackToBackSeries: true,
    shufflePlayback: true
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId),
    [channels, selectedChannelId]
  );

  useEffect(() => {
    void storage.getChannels().then((storedChannels) => {
      setChannels(storedChannels);
      setSelectedChannelId(storedChannels[0]?.id);
      setEditingName(storedChannels[0]?.name ?? "");
    });
    void storage.getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    setEditingName(selectedChannel?.name ?? "");
  }, [selectedChannel?.id]);

  async function persistChannel(channel: Channel) {
    const nextChannels = await storage.saveChannel(channel);
    setChannels(nextChannels);
    setSelectedChannelId(channel.id);
  }

  async function handleCreateChannel() {
    const channel = createChannel(newChannelName);
    await persistChannel(channel);
    setNewChannelName("");
    setStatus(`Created ${channel.name}`);
  }

  async function handleRenameChannel() {
    if (!selectedChannel) return;
    const channel = renameChannel(selectedChannel, editingName);
    await persistChannel(channel);
    setStatus(`Saved ${channel.name}`);
  }

  async function handleDeleteChannel(channelId: string) {
    const nextChannels = await storage.deleteChannel(channelId);
    setChannels(nextChannels);
    setSelectedChannelId(nextChannels[0]?.id);
    setStatus("Channel deleted");
  }

  async function handleAddUrl() {
    if (!selectedChannel) return;
    try {
      const item = createTubiChannelItem(urlInput, titleInput);
      await persistChannel(addItemToChannel(selectedChannel, item));
      setUrlInput("");
      setTitleInput("");
      setStatus(`Added ${item.title}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add URL");
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!selectedChannel) return;
    await persistChannel(removeItemFromChannel(selectedChannel, itemId));
    setStatus("Removed item");
  }

  async function handleStartChannel() {
    if (!selectedChannel) return;
    const response = await sendRuntimeMessage({
      type: MessageType.StartChannel,
      channel: selectedChannel
    });
    setStatus(response.ok ? `Started ${selectedChannel.name}` : response.error ?? "Could not start channel");
  }

  function handleExportChannel() {
    if (!selectedChannel) return;
    const blob = new Blob([serializeChannels([selectedChannel])], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = createExportFileName(selectedChannel);
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${selectedChannel.name}`);
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const importedChannels = deserializeChannels(await file.text());
      const nextChannels = [...channels, ...importedChannels];
      await storage.setChannels(nextChannels);
      setChannels(nextChannels);
      setSelectedChannelId(importedChannels[0]?.id ?? nextChannels[0]?.id);
      setStatus(`Imported ${importedChannels.length} playlist${importedChannels.length === 1 ? "" : "s"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import playlist");
    }
  }

  function handleOpenPrivacyPolicy() {
    void chrome.tabs.create({ url: chrome.runtime.getURL("privacy.html") });
  }

  async function handleShuffleToggle(enabled: boolean) {
    const nextSettings = {
      ...settings,
      shufflePlayback: enabled
    };
    setSettings(nextSettings);
    await storage.setSettings(nextSettings);
    setStatus(enabled ? "Shuffle enabled" : "Shuffle disabled");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Tubi Shuffle TV</h1>
          <p>{status}</p>
        </div>
        <button className="icon-button primary" onClick={handleStartChannel} disabled={!selectedChannel?.items.length}>
          <Play size={17} />
          <span>Start</span>
        </button>
      </header>

      <section className="channel-create">
        <input
          value={newChannelName}
          onChange={(event) => setNewChannelName(event.target.value)}
          placeholder="New channel name"
        />
        <button className="icon-button" onClick={handleCreateChannel}>
          <Plus size={16} />
          <span>Create</span>
        </button>
      </section>

      <section className="playlist-actions">
        <button className="icon-button" onClick={() => importInputRef.current?.click()}>
          <Upload size={16} />
          <span>Import</span>
        </button>
        <button className="icon-button" onClick={handleExportChannel} disabled={!selectedChannel}>
          <Download size={16} />
          <span>Export</span>
        </button>
        <input
          ref={importInputRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
        />
      </section>

      <section className="settings-row" aria-label="Playback settings">
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={settings.shufflePlayback}
            onChange={(event) => void handleShuffleToggle(event.target.checked)}
          />
          <span className="toggle-track" aria-hidden="true">
            <span className="toggle-thumb" />
          </span>
          <span>Shuffle playback</span>
        </label>
      </section>

      <section className="channel-tabs" aria-label="Channels">
        {channels.map((channel) => (
          <button
            key={channel.id}
            className={channel.id === selectedChannelId ? "tab active" : "tab"}
            onClick={() => setSelectedChannelId(channel.id)}
          >
            {channel.name}
          </button>
        ))}
      </section>

      {selectedChannel ? (
        <section className="editor">
          <div className="rename-row">
            <Edit3 size={16} />
            <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            <button className="square-button" onClick={handleRenameChannel} title="Save channel name">
              <Save size={16} />
            </button>
            <button className="square-button danger" onClick={() => handleDeleteChannel(selectedChannel.id)} title="Delete channel">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="url-form">
            <input
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://tubitv.com/..."
            />
            <input
              value={titleInput}
              onChange={(event) => setTitleInput(event.target.value)}
              placeholder="Display title optional"
            />
            <button className="icon-button" onClick={handleAddUrl}>
              <Plus size={16} />
              <span>Add URL</span>
            </button>
          </div>

          <div className="item-list">
            {selectedChannel.items.length === 0 ? (
              <p className="empty">Add Tubi show or movie URLs to build this channel.</p>
            ) : (
              selectedChannel.items.map((item) => (
                <article className="item-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.kind === "series" ? "Series" : "Movie"}</span>
                  </div>
                  <button className="square-button" onClick={() => handleRemoveItem(item.id)} title="Remove item">
                    <X size={16} />
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="empty-state">Create a channel to get started.</section>
      )}

      <section className="about-panel" aria-labelledby="about-title">
        <div className="about-title">
          <Info size={16} />
          <h2 id="about-title">About</h2>
        </div>
        <p>
          Tubi Shuffle TV creates local pseudo-TV channels from Tubi URLs you choose. It stores channels,
          playlist imports, queue state, and episode progress only in this browser.
        </p>
        <p>
          Playback stays on official Tubi pages. The extension does not block ads, skip ads, restream video,
          download content, inject ads, or send your playlists to a remote server.
        </p>
        <button className="privacy-button" onClick={handleOpenPrivacyPolicy}>
          <FileText size={15} />
          <span>Privacy Policy</span>
        </button>
      </section>
    </main>
  );
}
