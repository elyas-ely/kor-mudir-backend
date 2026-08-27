/**
 * Keyset (cursor) pagination page. `nextCursor` is null once there are no more rows —
 * the client stops paging on that, never on `data.length < limit`. `total` is kept
 * alongside the cursor (a separate COUNT(*), not derived from the cursor walk) purely
 * for UI count pills; pagination correctness never depends on it.
 */
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}
