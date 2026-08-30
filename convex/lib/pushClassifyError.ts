// web-push (convex/pushSend.ts) が投げるエラーを分類する。node("use node")境界の外に
// 出しておくことで、実際にHTTP送信することなくこの分岐だけを単体テストできる。
//
// 404/410はプッシュサービスが「このsubscriptionはもう存在しない」と返す標準的な
// レスポンスで、購読を削除してよい合図。それ以外は一時的な失敗として扱い、
// 購読は残したまま次回のcronで再試行させる(例外は投げない: convex/ai.ts と同じ
// 「外部API失敗はコアループを止めない」思想)。
export function classifyPushSendError(error: unknown): 'stale' | 'failed' {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode
  return statusCode === 404 || statusCode === 410 ? 'stale' : 'failed'
}
