export type CharacterRarity = 'R' | 'SR' | 'SSR'

export interface CharacterSeedEntry {
  name: string
  rarity: CharacterRarity
  description: string
  imagePath: string
  // 詳細画面でのみ使う3Dモデル(.glb)。省略時は imagePath の2D画像のまま。
  modelPath?: string
  defaultMessage?: string
  // 同じrarity内での抽選重み。省略時は1(均等)。
  weight?: number
  sortOrder: number
  isActive: boolean
}

// 継続エネルギーから生まれた小さな精霊たち（docs/game-design.md 5.1）
export const CHARACTER_SEED_DATA: readonly CharacterSeedEntry[] = [
  {
    name: 'ポチ',
    rarity: 'R',
    description: '最初の一歩を後押ししてくれる、素朴な炎の精霊。',
    imagePath: '/characters/r_001.webp',
    defaultMessage: '今日も1周、始めてみよう。',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'コトリ',
    rarity: 'R',
    description: '小さな達成をいつも見つけてくれる風の精霊。',
    imagePath: '/characters/r_002.webp',
    defaultMessage: 'それだけでも、ちゃんと前進だよ。',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'シズク',
    rarity: 'R',
    description: '積み上げを静かに見守る水の精霊。',
    imagePath: '/characters/r_003.webp',
    defaultMessage: '少しずつでいいんだよ。',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'モコ',
    rarity: 'R',
    description: 'できなかった日も一緒に振り返ってくれる土の精霊。',
    imagePath: '/characters/r_004.webp',
    defaultMessage: '今日はここまで、で大丈夫。',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'ヒバリ',
    rarity: 'R',
    description: '次のPLANを軽やかに提案してくれる精霊。',
    imagePath: '/characters/r_005.webp',
    defaultMessage: '次は少し軽くしてみようか。',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'マメ',
    rarity: 'R',
    description: '小さな継続を数えるのが得意な精霊。',
    imagePath: '/characters/r_006.webp',
    defaultMessage: '積み上げ、ちゃんと増えてるよ。',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'ネム',
    rarity: 'R',
    description: '休むことも継続のうちだと教えてくれる精霊。',
    imagePath: '/characters/r_007.webp',
    defaultMessage: '休むのも、続けるうちだよ。',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'ツム',
    rarity: 'R',
    description: '記録が積み重なるほど元気になる精霊。',
    imagePath: '/characters/r_008.webp',
    defaultMessage: 'また一つ積み上がったね。',
    sortOrder: 8,
    isActive: true,
  },
  {
    name: 'ルミ',
    rarity: 'SR',
    description: '小さな積み重ねが大好きな光の精霊。',
    imagePath: '/characters/sr_001.webp',
    defaultMessage: '今日も一周だけやってみよう。',
    sortOrder: 9,
    isActive: true,
  },
  {
    name: 'ソヨ',
    rarity: 'SR',
    description: '続けるほど輪郭がはっきりしてくる、そよ風の精霊。',
    imagePath: '/characters/sr_002.webp',
    defaultMessage: '続けるほど、私も育っていく気がする。',
    sortOrder: 10,
    isActive: true,
  },
  {
    name: 'フユナ',
    rarity: 'SR',
    description: '止まってしまった継続をそっと再開させてくれる精霊。',
    imagePath: '/characters/sr_003.webp',
    defaultMessage: '止まっても、また始めればいいんだよ。',
    sortOrder: 11,
    isActive: true,
  },
  {
    name: 'カゲロウ',
    rarity: 'SR',
    description: 'タスクの重さを一緒に見極めてくれる精霊。',
    imagePath: '/characters/sr_004.webp',
    defaultMessage: '今日はちょうどいい重さにしよう。',
    sortOrder: 12,
    isActive: true,
  },
  {
    name: 'ヨイヅキ',
    rarity: 'SR',
    description: '一日の終わりに継続を静かに讃えてくれる精霊。',
    imagePath: '/characters/sr_005.webp',
    defaultMessage: '今日も、お疲れさま。',
    sortOrder: 13,
    isActive: true,
  },
  {
    name: 'アカツキ',
    rarity: 'SSR',
    description: '長く続いた継続だけに姿を見せる、夜明けの精霊。',
    imagePath: '/characters/ssr_001.webp',
    // 男性キャラの3Dモデル。差し替えたい場合は下の エイエン と入れ替える。
    modelPath: '/characters/Yusha.glb',
    defaultMessage: 'ここまで積み上げてきたのは、紛れもない事実だよ。',
    sortOrder: 14,
    isActive: true,
  },
  {
    name: 'エイエン',
    rarity: 'SSR',
    description: '継続そのものを象徴する、伝説の精霊。',
    imagePath: '/characters/ssr_002.webp',
    // 女性キャラの3Dモデル。
    modelPath: '/characters/whi.glb',
    defaultMessage: '続けてきた時間は、誰にも奪えない。',
    sortOrder: 15,
    isActive: true,
  },
] as const

export function selectUnseededCharacters(
  existingNames: ReadonlySet<string>,
  seedData: readonly CharacterSeedEntry[] = CHARACTER_SEED_DATA,
): CharacterSeedEntry[] {
  return seedData.filter((character) => !existingNames.has(character.name))
}
