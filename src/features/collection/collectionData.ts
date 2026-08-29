import type { CollectionEntry } from '../../../convex/characters'

// フロントエンドが先にデプロイされ、Convex の listCollection が旧版を返す短い
// 切替期間でもコレクション画面を表示できるようにする。旧版には eventNames が
// 含まれないため、イベント情報なしとして扱う。
export function normalizeCollectionEntries(collection: CollectionEntry[]): CollectionEntry[] {
  return collection.map((entry) => ({
    ...entry,
    eventNames: Array.isArray(entry.eventNames) ? entry.eventNames : [],
  }))
}
