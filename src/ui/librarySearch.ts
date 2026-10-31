import { cleanup, effect, signal } from "nsh";

type SearchVault = { searchContent: (query: string) => Promise<string[]> };

/** 防抖后台全文搜索；查询、库或目录版本变更后丢弃过期结果。 */
export function librarySearch(
  vault: () => SearchVault | null,
  query: () => string,
  revision: () => unknown,
) {
  const matches = signal<string[]>([]);
  const pending = signal(false);
  const error = signal("");
  effect(() => {
    const v = vault();
    const q = query().trim();
    revision();
    matches.set([]);
    error.set("");
    pending.set(!!v && !!q);
    if (!v || !q) return;
    let active = true;
    const timer = setTimeout(() => {
      void v.searchContent(q).then((paths) => {
        if (active) matches.set(paths);
      }).catch((err) => {
        if (active) error.set(String(err));
      }).finally(() => {
        if (active) pending.set(false);
      });
    }, 200);
    cleanup(() => {
      active = false;
      clearTimeout(timer);
    });
  });
  return { matches, pending, error };
}
