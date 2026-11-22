/**
 * 至多 `limit` 个并发地处理 `items`；任一项失败后不再领新任务，
 * 等在路上的做完再抛出第一个错误——它们的结果（锚点）照常保留。
 */
export async function eachLimit<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  let failure: { error: unknown } | null = null;
  const worker = async () => {
    while (!failure && next < items.length) {
      const item = items[next++]!;
      try {
        await work(item);
      } catch (error) {
        failure ??= { error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (failure) throw (failure as { error: unknown }).error;
}
