// @ts-nocheck
export interface TelegramChannelItem {
  id: string;
  name: string;
  type: "channel" | "group";
  memberCount: number;
  isIncluded: boolean;
  linkedDate: string;
  botStatus: "admin" | "member" | "pending";
}

export const DEFAULT_TELEGRAM_CHANNELS: TelegramChannelItem[] = [];

// In-memory storage for Telegram channels
let inMemoryTelegramChannels: TelegramChannelItem[] = [];

// Cleanup legacy localStorage
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("mansa_telegram_channels");
    localStorage.removeItem("whop_telegram_channels");
    localStorage.removeItem("business_telegram_channels");
    localStorage.removeItem("business_discord_servers");
  } catch {}
}

export function getStoredTelegramChannels(): TelegramChannelItem[] {
  return inMemoryTelegramChannels;
}

export function saveStoredTelegramChannels(channels: TelegramChannelItem[]): void {
  inMemoryTelegramChannels = Array.isArray(channels) ? channels : [];
}

export function addStoredTelegramChannel(channel: TelegramChannelItem): TelegramChannelItem[] {
  const current = getStoredTelegramChannels();
  const filtered = current.filter((c) => c.id !== channel.id && c.name !== channel.name);
  const updated = [channel, ...filtered];
  saveStoredTelegramChannels(updated);
  return updated;
}
