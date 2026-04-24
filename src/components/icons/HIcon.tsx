import type { CSSProperties } from "react";

export type IconName =
  | "shoe"
  | "laptop"
  | "book"
  | "drop"
  | "lotus"
  | "music"
  | "check"
  | "check-circle"
  | "plus"
  | "minus"
  | "search"
  | "settings"
  | "calendar"
  | "share"
  | "note"
  | "image"
  | "home"
  | "chart"
  | "flame"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "bell"
  | "bell-off"
  | "trophy"
  | "archive"
  | "archive-restore"
  | "pause"
  | "play"
  | "pencil"
  | "trash"
  | "grip"
  | "x"
  | "download"
  | "upload"
  | "menu"
  | "command"
  | "target"
  | "sparkles"
  | "sun"
  | "moon";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
}

export function HIcon({
  name,
  size = 20,
  color = "currentColor",
  fill = "none",
  strokeWidth = 1.75,
  className,
}: Props) {
  const s: CSSProperties = {
    width: size,
    height: size,
    display: "block",
    flexShrink: 0,
  };
  const sw = strokeWidth;
  const common = {
    style: s,
    viewBox: "0 0 24 24",
    fill,
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "shoe":
      return (
        <svg {...common}>
          <path d="M2 16c0-1 .5-2 1.5-2.5L7 12l2-5 4 1 2 3 5 1.5c1.5.5 2 1.5 2 3v1.5c0 1-.5 1.5-1.5 1.5H3.5C2.5 17.5 2 17 2 16z" />
          <path d="M11 8l1 2M7 12l1.5-1" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="11" rx="1.5" />
          <path d="M2 19h20M9 16l-1 3M15 16l1 3" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 4.5v14A1.5 1.5 0 0 0 5.5 20H20V4.5A1.5 1.5 0 0 0 18.5 3H5.5A1.5 1.5 0 0 0 4 4.5z" />
          <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H20M8 7h8M8 11h6" />
        </svg>
      );
    case "drop":
      return (
        <svg {...common}>
          <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
          <path d="M9 14a3 3 0 0 0 3 3" />
        </svg>
      );
    case "lotus":
      return (
        <svg {...common}>
          <path d="M12 6v12M12 18c-4 0-7-2-8-4 2-1 4-1 6 .5M12 18c4 0 7-2 8-4-2-1-4-1-6 .5" />
          <path d="M12 18c-3 0-5-3-5-6 2 0 3.5 1 5 3 1.5-2 3-3 5-3 0 3-2 6-5 6z" />
        </svg>
      );
    case "music":
      return (
        <svg {...common}>
          <path d="M9 18V6l10-2v12" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} strokeWidth={sw + 0.25}>
          <path d="M4 12l5 5L20 6" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="10" />
          <path
            d="M7 12l3.5 3.5L17 9"
            stroke="rgb(10, 10, 10)"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "minus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <path d="M12 3v13M7 8l5-5 5 5" />
          <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
          <path d="M14 3v6h6M8 13h8M8 17h5" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20h16M7 16V10M12 16V5M17 16v-8" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5M12 22a6 6 0 0 0 6-6c0-3-3-5-3-5s-1 3-3 3-2-3-2-3-4 2-4 5a6 6 0 0 0 6 6z" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg {...common}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8zM10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "bell-off":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 10 0M21 16s-3-1-3-8c0-.3 0-.6-.05-.9M3 16s3-1 3-8M10 21a2 2 0 0 0 4 0M3 3l18 18" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 4h10v6a5 5 0 0 1-10 0V4zM7 7H4v2a3 3 0 0 0 3 3M17 7h3v2a3 3 0 0 1-3 3M10 15h4v3h-4zM8 21h8" />
        </svg>
      );
    case "archive":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="5" rx="1.5" />
          <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M9 13h6" />
        </svg>
      );
    case "archive-restore":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="5" rx="1.5" />
          <path d="M5 8v11a1 1 0 0 0 1 1h5M19 8v4M12 19l3-3 3 3M15 22v-6" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common}>
          <rect x="7" y="5" width="3" height="14" rx="1" />
          <rect x="14" y="5" width="3" height="14" rx="1" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor">
          <path d="M7 4.5v15a1 1 0 0 0 1.5.87l12-7.5a1 1 0 0 0 0-1.74l-12-7.5A1 1 0 0 0 7 4.5z" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M4 20h4l11-11-4-4L4 16v4zM14 6l4 4" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v7M14 11v7" />
        </svg>
      );
    case "grip":
      return (
        <svg {...common}>
          <circle cx="9" cy="6" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="18" r="1" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v13M7 12l5 5 5-5M5 21h14" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 21V8M7 12l5-5 5 5M5 3h14" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "command":
      return (
        <svg {...common}>
          <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3z" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" fill={color} />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    default:
      return (
        <div
          style={{ ...s, background: color, opacity: 0.2, borderRadius: 4 }}
        />
      );
  }
}
