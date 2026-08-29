const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'ログイン状態を確認して、もう一度お試しください。',
  USER_NOT_FOUND: '準備が整うまで、もう一度お試しください。',
  GOAL_NOT_FOUND: 'Goalが見つかりませんでした。',
  GOAL_ARCHIVED: 'このGoalはアーカイブされています。',
  GOAL_FORBIDDEN: 'このGoalを操作できません。',
  PDCA_NOT_FOUND: 'PDCAが見つかりませんでした。',
  PDCA_INVALID_STATUS: 'このPDCAは現在の手順では進められません。画面を更新して確認してください。',
  PDCA_ALREADY_COMPLETED: 'このPDCAはすでに完了しています。',
  PDCA_FORBIDDEN: 'このPDCAを操作できません。',
  GACHA_NO_DRAW_AVAILABLE: 'ガチャを引ける回数がありません。',
  GACHA_NO_ACTIVE_CHARACTER: 'ただいまガチャを準備しています。時間をおいてもう一度お試しください。',
  RECOVERY_NOT_AVAILABLE: '今回はリカバリーを利用できません。',
  CHARACTER_NOT_OWNED: 'まだ出会っていないキャラクターです。',
  GUEST_INVALID_DATA: '保存した記録を読み込めませんでした。',
  GUEST_ALREADY_MIGRATED: 'この記録はすでに保存されています。',
  AI_GENERATION_FAILED: '提案を作れませんでした。自分でPLANを決めることもできます。',
  VALIDATION_ERROR: '入力内容を確認してください。',
  NETWORK_ERROR: '通信できませんでした。接続を確認して、もう一度お試しください。',
}

export function userFacingError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  const code = Object.keys(ERROR_MESSAGES).find((candidate) => message.includes(candidate))
  return code ? ERROR_MESSAGES[code] : fallback
}
