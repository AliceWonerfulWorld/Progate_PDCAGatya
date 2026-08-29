#!/usr/bin/env node
/**
 * デザイントークンの直書き検出 (issue #97)
 *
 * 「ドキュメントに書いたが読まれない」を防ぐための機構。
 * 以下2箇所から同じロジックを呼ぶことで、AI・人間どちらの経路でも引っかかる:
 *   1. Claude Code の PreToolUse hook (.claude/settings.json) → 書く前に止める
 *   2. npm run lint:tokens → CI・手作業のどちらでも効く
 *
 * 使い方:
 *   node scripts/check-design-tokens.mjs              # src/ 全体
 *   node scripts/check-design-tokens.mjs <file...>    # 指定ファイル
 *   node scripts/check-design-tokens.mjs --stdin <path>  # 標準入力の内容を検査
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

// トークン定義そのものを持つファイルは対象外。
// (コメント中に旧クラス名や oklch 値が出てくるため)
const EXCLUDED = new Set(['src/index.css'])

const PALETTES =
  'emerald|amber|violet|slate|stone|rose|sky|red|green|blue|indigo|teal|gray|zinc|neutral|orange|yellow|fuchsia|pink|cyan|lime'
const PREFIXES =
  'bg|text|border|ring|outline|fill|stroke|from|to|via|divide|placeholder|caret|accent|decoration|shadow'

/** 直書きパレット -> 推奨トークンの手がかり */
const TOKEN_HINT = {
  emerald: 'primary 系 (bg-primary / text-primary-strong など)',
  slate: 'surface / text / border 系 (bg-surface-subtle / text-text-muted など)',
  stone: 'background 系 (bg-background)',
  rose: 'attention 系 (At Risk) または choice-warn 系',
  sky: 'rarity-sr 系 または choice-info 系',
  amber: 'rarity-ssr 系 または notice 系 (オフライン等の告知)',
  violet: 'reward 系 (ガチャ・チケット)',
}

const RULES = [
  {
    id: 'raw-palette',
    // 例: bg-emerald-700 / text-slate-500 / fill-amber-400
    re: new RegExp(`\\b(${PREFIXES})-(${PALETTES})-(\\d{2,3})\\b`, 'g'),
    message(m) {
      const [full, , palette] = m
      const hint = TOKEN_HINT[palette] ?? 'src/index.css の @theme を参照'
      return `${full} は直書きのパレット色です。トークンを使ってください → ${hint}`
    },
  },
  {
    id: 'raw-duration',
    // 例: duration-150。値が焼き込まれ prefers-reduced-motion が効かなくなる。
    re: /\bduration-\d+\b/g,
    message(m) {
      return `${m[0]} は値を焼き込むため prefers-reduced-motion が効きません。duration-(--duration-fast) 形式にしてください（instant/fast/normal/slow/reward）`
    },
  },
]

/** transition-* があるのに duration トークンが無い行を検出する */
const TRANSITION_RE = /\btransition-(colors|transform|all|opacity|shadow)\b/
const HAS_DURATION_TOKEN_RE = /duration-\(--duration-/

function checkContent(content, displayPath) {
  const findings = []
  const lines = content.split('\n')

  lines.forEach((line, i) => {
    const lineNo = i + 1

    // コメント行はスキップ（説明のために旧クラス名を書くことがあるため）
    const trimmed = line.trim()
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('<!--') ||
      trimmed.startsWith('{/*') // JSXコメント
    ) {
      return
    }

    for (const rule of RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(line)) !== null) {
        findings.push({ path: displayPath, line: lineNo, rule: rule.id, message: rule.message(m) })
      }
    }

    if (TRANSITION_RE.test(line) && !HAS_DURATION_TOKEN_RE.test(line)) {
      findings.push({
        path: displayPath,
        line: lineNo,
        rule: 'transition-without-token',
        message:
          'transition-* に duration トークンがありません。Tailwind 既定値にフォールバックし prefers-reduced-motion の対象外になります → duration-(--duration-fast) ease-standard を付けてください',
      })
    }
  })

  return findings
}

function isTarget(path) {
  const ext = extname(path)
  if (!['.tsx', '.ts', '.jsx', '.js', '.css'].includes(ext)) return false
  const rel = relative(process.cwd(), path).replace(/\\/g, '/')
  if (EXCLUDED.has(rel)) return false
  // src/ 配下のみ（docs / e2e / scripts は対象外）
  return rel.startsWith('src/')
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function main() {
  const args = process.argv.slice(2)
  let findings = []

  if (args[0] === '--stdin') {
    // hook 経路: まだディスクに書かれていない内容を検査する
    const path = args[1] ?? 'unknown'
    if (!isTarget(path)) process.exit(0)
    const content = readFileSync(0, 'utf8')
    findings = checkContent(content, relative(process.cwd(), path))
  } else {
    const files = (args.length ? args : walk('src')).filter(isTarget)
    for (const f of files) {
      findings = findings.concat(checkContent(readFileSync(f, 'utf8'), relative(process.cwd(), f)))
    }
  }

  if (findings.length === 0) process.exit(0)

  console.error('\nデザイントークン違反が見つかりました (docs/ui-spec.md §36):\n')
  for (const f of findings) {
    console.error(`  ${f.path}:${f.line}`)
    console.error(`    ${f.message}\n`)
  }
  console.error(`計 ${findings.length} 件。定義は src/index.css の @theme を参照してください。\n`)
  process.exit(1)
}

main()
