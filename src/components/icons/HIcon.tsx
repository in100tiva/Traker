import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertSquareIcon,
  Analytics01Icon,
  Archive02Icon,
  ArchiveRestoreIcon,
  ArrowDown01Icon,
  ArrowDownRight01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  Book01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  CommandIcon,
  CompassIcon,
  Delete02Icon,
  Download01Icon,
  DragDropVerticalIcon,
  DropletIcon,
  Fire03Icon,
  Home01Icon,
  Idea01Icon,
  Image01Icon,
  KeyboardIcon,
  LaptopIcon,
  Medal01Icon,
  Menu01Icon,
  MinusSignIcon,
  Moon02Icon,
  MusicNote01Icon,
  Note01Icon,
  Notification03Icon,
  NotificationOff03Icon,
  PauseIcon,
  PencilEdit02Icon,
  PlayIcon,
  PlusSignIcon,
  RunningShoesIcon,
  Search01Icon,
  Settings01Icon,
  Share01Icon,
  SparklesIcon,
  Sun03Icon,
  Target02Icon,
  Tick02Icon,
  Upload01Icon,
  User02Icon,
  Yoga01Icon,
} from "@hugeicons/core-free-icons";

/**
 * Single source of truth for icons across the app.
 *
 * Backed by Hugeicons free tier (5,100+ stroke-rounded icons, MIT license).
 * Each `IconName` token maps to one Hugeicons export so call-sites stay stable
 * across icon-library migrations.
 */

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
  | "moon"
  | "trending-up"
  | "trending-down"
  | "lightbulb"
  | "medal"
  | "keyboard"
  | "user"
  | "compass"
  | "alert";

const ICON_MAP: Record<IconName, typeof RunningShoesIcon> = {
  shoe: RunningShoesIcon,
  laptop: LaptopIcon,
  book: Book01Icon,
  drop: DropletIcon,
  lotus: Yoga01Icon,
  music: MusicNote01Icon,
  check: Tick02Icon,
  "check-circle": CheckmarkCircle01Icon,
  plus: PlusSignIcon,
  minus: MinusSignIcon,
  search: Search01Icon,
  settings: Settings01Icon,
  calendar: Calendar03Icon,
  share: Share01Icon,
  note: Note01Icon,
  image: Image01Icon,
  home: Home01Icon,
  chart: Analytics01Icon,
  flame: Fire03Icon,
  "chevron-down": ArrowDown01Icon,
  "chevron-right": ArrowRight01Icon,
  "chevron-left": ArrowLeft01Icon,
  bell: Notification03Icon,
  "bell-off": NotificationOff03Icon,
  trophy: Award01Icon,
  archive: Archive02Icon,
  "archive-restore": ArchiveRestoreIcon,
  pause: PauseIcon,
  play: PlayIcon,
  pencil: PencilEdit02Icon,
  trash: Delete02Icon,
  grip: DragDropVerticalIcon,
  x: Cancel01Icon,
  download: Download01Icon,
  upload: Upload01Icon,
  menu: Menu01Icon,
  command: CommandIcon,
  target: Target02Icon,
  sparkles: SparklesIcon,
  sun: Sun03Icon,
  moon: Moon02Icon,
  "trending-up": ArrowUpRight01Icon,
  "trending-down": ArrowDownRight01Icon,
  lightbulb: Idea01Icon,
  medal: Medal01Icon,
  keyboard: KeyboardIcon,
  user: User02Icon,
  compass: CompassIcon,
  alert: AlertSquareIcon,
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /**
   * Hugeicons doesn't expose a single fill; pass an explicit string to override
   * the renderer's default. Most consumers leave this as `currentColor`.
   */
  fill?: string;
  strokeWidth?: number;
  className?: string;
}

export function HIcon({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.75,
  className,
}: Props) {
  const icon = ICON_MAP[name];
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
    />
  );
}
