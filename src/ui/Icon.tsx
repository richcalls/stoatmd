import { Image } from "nsh";

import book from "../../assets/icons/book.svg";
import cloud from "../../assets/icons/cloud.svg";
import code from "../../assets/icons/code.svg";
import eye from "../../assets/icons/eye.svg";
import folder from "../../assets/icons/folder.svg";
import gear from "../../assets/icons/gear.svg";
import lightbulb from "../../assets/icons/lightbulb.svg";
import listPane from "../../assets/icons/list-pane.svg";
import magnifyingGlass from "../../assets/icons/magnifying-glass.svg";
import notebook from "../../assets/icons/notebook.svg";
import pencil from "../../assets/icons/pencil.svg";
import plus from "../../assets/icons/plus.svg";
import sidebar from "../../assets/icons/sidebar.svg";
import split from "../../assets/icons/split.svg";
import textT from "../../assets/icons/text-t.svg";

/**
 * Phosphor Regular SVG（`assets/icons/`，fill `#000` + `tintColor`）。
 * 约定见 docs/ui-v1/DESIGN-NOTES.md 与 docs/superpowers/plans/2026-10-29-stoatmd-mac-v1.md。
 */
export type IconName =
  | "notebook"
  | "folder"
  | "book"
  | "pencil"
  | "lightbulb"
  | "magnifying-glass"
  | "plus"
  | "cloud"
  | "gear"
  | "text-t"
  | "code"
  | "split"
  | "eye"
  | "sidebar"
  | "list-pane";

const MAP = {
  notebook,
  folder,
  book,
  pencil,
  lightbulb,
  "magnifying-glass": magnifyingGlass,
  plus,
  cloud,
  gear,
  "text-t": textT,
  code,
  split,
  eye,
  sidebar,
  "list-pane": listPane,
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
