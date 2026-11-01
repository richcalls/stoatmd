import { Image } from "nsh";

import arrowLeft from "../../assets/icons/arrow-left.svg";
import arrowsClockwise from "../../assets/icons/arrows-clockwise.svg";
import book from "../../assets/icons/book.svg";
import caretDown from "../../assets/icons/caret-down.svg";
import caretRight from "../../assets/icons/caret-right.svg";
import check from "../../assets/icons/check.svg";
import cloud from "../../assets/icons/cloud.svg";
import clock from "../../assets/icons/clock.svg";
import code from "../../assets/icons/code.svg";
import compose from "../../assets/icons/compose.svg";
import device from "../../assets/icons/device.svg";
import eye from "../../assets/icons/eye.svg";
import fileText from "../../assets/icons/file-text.svg";
import folder from "../../assets/icons/folder.svg";
import folderPlus from "../../assets/icons/folder-plus.svg";
import gear from "../../assets/icons/gear.svg";
import info from "../../assets/icons/info.svg";
import lightbulb from "../../assets/icons/lightbulb.svg";
import more from "../../assets/icons/more.svg";
import listTree from "../../assets/icons/list-tree.svg";
import magnifyingGlass from "../../assets/icons/magnifying-glass.svg";
import notebook from "../../assets/icons/notebook.svg";
import palette from "../../assets/icons/palette.svg";
import pause from "../../assets/icons/pause.svg";
import pencil from "../../assets/icons/pencil.svg";
import play from "../../assets/icons/play.svg";
import plus from "../../assets/icons/plus.svg";
import sidebar from "../../assets/icons/sidebar.svg";
import split from "../../assets/icons/split.svg";
import star from "../../assets/icons/star.svg";
import sun from "../../assets/icons/sun.svg";
import sync from "../../assets/icons/sync.svg";
import textT from "../../assets/icons/text-t.svg";
import x from "../../assets/icons/x.svg";

/**
 * Phosphor Regular SVG（`assets/icons/`，fill `#000` + `tintColor`）。
 * 约定见 docs/ui-v1/DESIGN-NOTES.md 与 docs/superpowers/plans/2026-10-29-stoatmd-mac-v1.md。
 */
export type IconName =
  | "notebook"
  | "arrow-left"
  | "arrows-clockwise"
  | "compose"
  | "device"
  | "folder-plus"
  | "more"
  | "pause"
  | "play"
  | "star"
  | "sun"
  | "folder"
  | "file-text"
  | "book"
  | "pencil"
  | "lightbulb"
  | "magnifying-glass"
  | "plus"
  | "cloud"
  | "gear"
  | "info"
  | "list-tree"
  | "text-t"
  | "clock"
  | "code"
  | "split"
  | "eye"
  | "sidebar"
  | "palette"
  | "sync"
  | "check"
  | "caret-down"
  | "caret-right"
  | "x";

const MAP = {
  notebook,
  "arrow-left": arrowLeft,
  "arrows-clockwise": arrowsClockwise,
  compose,
  device,
  "folder-plus": folderPlus,
  more,
  pause,
  play,
  star,
  sun,
  folder,
  "file-text": fileText,
  book,
  pencil,
  lightbulb,
  "magnifying-glass": magnifyingGlass,
  plus,
  cloud,
  gear,
  info,
  "list-tree": listTree,
  "text-t": textT,
  clock,
  code,
  split,
  eye,
  sidebar,
  palette,
  sync,
  check,
  "caret-down": caretDown,
  "caret-right": caretRight,
  x,
} as const;

export function Icon(props: { name: IconName; color: string; size?: number }) {
  const size = props.size ?? 16;
  return (
    <Image
      src={MAP[props.name]}
      resizeMode="contain"
      style={{ width: size, height: size, tintColor: props.color }}
    />
  );
}
