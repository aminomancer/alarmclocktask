import figures from "figures";
import isUnicodeSupported from "is-unicode-supported";

export const useEmojis = isUnicodeSupported();
export const icons = useEmojis
  ? {
      emoji: true,
      settings: "🔧",
      install: "🔌",
      username: "👤",
      password: "🔑",
      url: "🔗",
      command: "💻",
      args: "📝",
      device: "🎧",
      volume: "🔊",
      time: "⏰",
      days: "📆",
      save: "💾",
      exit: "🚪",
      delete: "💣",
      update: "🔄",
      lock: "🔐",
      pointer: "▶️",
      cross: " ❌ ",
      spacer: "  ",
    }
  : {
      lock: figures.warning,
      pointer: figures.pointer,
      cross: figures.cross,
      spacer: " ",
    };
