import { mount } from "nsh";
import { Vault } from "stoatmd/native";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { restoreLocale } from "../ui/i18n";

// 回归夹具：真实 Vault 里放一张 240×160 的红色 PNG，笔记用相对路径引用它。
// 注意 PNG 必须是完整文件：截断的 PNG 头部仍能读出 240×160，但解不出像素，会被画成黑块。
const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAPAAAACgCAIAAAC9uXYyAAABxElEQVR4nO3SQQkAMAzAwAqrfxUTMxODQTg4AXlkzi5kzPcCeMjQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUkxNCmGJsXQpBiaFEOTYmhSDE2KoUm5s3FDqmIwTFcAAAAASUVORK5CYII="), ch => ch.charCodeAt(0));
const vault = Vault.createCache();
vault.createBytes("pic.png", png);
vault.createBytes("note.md", new TextEncoder().encode("# 图片测试\n\n![红图](pic.png)\n\n正文。\n"));
void restoreLocale().then(() => {
  mount(() => <MobileShell library={mobileLibrary(vault)} nativeChrome={false} />);
});
