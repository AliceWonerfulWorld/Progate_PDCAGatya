#!/usr/bin/env node
/**
 * PreToolUse hook: Edit / Write の内容にデザイントークン違反があれば書き込みを止める。
 *
 * 「AGENTS.md に書いたのに読まれない」を防ぐための最後の砦。
 * ドキュメントを読んでいなくても、書こうとした瞬間に落ちるので忘れようがない。
 *
 * exit 2 + stderr で Claude に理由が渡り、自己修正できる。
 * 検査ロジックは scripts/check-design-tokens.mjs と共有している（二重実装しない）。
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

let payload
try {
  payload = JSON.parse(readStdin() || '{}')
} catch {
  process.exit(0) // 解釈できない入力でブロックしない
}

const input = payload.tool_input ?? {}
const filePath = input.file_path
if (!filePath) process.exit(0)

// 書き込まれようとしている「新しい内容」を取り出す。
// Edit は new_string、Write は content。MultiEdit は edits[] を連結。
let content = input.content ?? input.new_string ?? ''
if (!content && Array.isArray(input.edits)) {
  content = input.edits.map((e) => e.new_string ?? '').join('\n')
}
if (!content) process.exit(0)

const result = spawnSync(
  process.execPath,
  [join(projectRoot, 'scripts', 'check-design-tokens.mjs'), '--stdin', filePath],
  { input: content, cwd: projectRoot, encoding: 'utf8' },
)

if (result.status === 1) {
  process.stderr.write(
    (result.stderr || '') +
      '\nこの書き込みはデザイントークン規約に反するため中断しました。' +
      '\nトークン定義: src/index.css の @theme / 方針: docs/ui-spec.md §36\n',
  )
  process.exit(2) // 2 = ツール実行をブロックし、stderr を Claude へ返す
}

process.exit(0)
