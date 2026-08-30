# Tech Stack

> Status: Draft / 初版
>
> 本ドキュメントは、PDCA GACHA のハッカソンMVPにおける技術選定を定義する。
>
> 技術選定では、以下を最優先する。
>
> 1. 制限時間内に完成させられること
> 2. 実装・デバッグ速度が速いこと
> 3. 初回UX・PDCAループ・ガチャ体験を阻害しないこと
> 4. MVP後に拡張しやすいこと
> 5. 可能な限り低コストで運用できること

---

# 1. 全体構成

MVPでは以下の構成を採用する。

```text
PWA
  ↓
React + Vite + TypeScript
  ↓
Convex
  ├─ Database
  ├─ Query / Mutation
  ├─ Server-side Action
  └─ AI API呼び出し
  ↓
External Services
  ├─ Clerk / Google OAuth
  └─ LLM API
```

ホスティングは Vercel を第一候補とする。

---

# 2. 採用技術一覧

| 領域 | 採用技術 | 状態 |
|---|---|---|
| Application | PWA | 採用 |
| Frontend | React | 採用 |
| Build Tool | Vite | 採用 |
| Language | TypeScript | 採用 |
| Backend / Database | Convex | 採用 |
| Authentication | Clerk | 採用 |
| Login Provider | Google OAuth | 採用 |
| AI | LLM API | 採用 |
| AI Call | Convex Action経由 | 採用 |
| Hosting | Vercel | 第一候補 |
| CSS | Tailwind CSS | 採用 |
| UI Components | shadcn/ui | 必要箇所のみ |
| Animation | Motion系ライブラリ | 採用候補 |
| Guest Storage | localStorage | 採用 |
| Client State | React + Convex | 採用 |
| Additional State Store | Zustand | 必要になった場合のみ |
| Lint | ESLint | 採用 |
| Format | Prettier | 採用 |
| CI/CD | Vercel + GitHub連携 | 採用 |
| Push Notification | web-push (VAPID) + Convex Cron | At-Riskトリガーのみ採用(MVP完了後) |

---

# 3. Application Type

## 3.1 PWA

PDCA GACHA は PWA として実装する。

### 採用理由

本プロダクトは、

- 毎日少しだけ開く
- スマートフォンで利用する
- 継続的にアクセスする
- 将来的に通知を利用する
- ホーム画面から素早く起動する

といった利用形態を想定している。

一方、ハッカソンではネイティブアプリよりもWeb技術の方が、

- 実装速度
- デバッグ速度
- デプロイ速度
- デモの容易さ

で有利である。

そのため、

> **Webの開発速度と、スマホアプリに近い体験を両立する**

手段としてPWAを採用する。

---

# 4. Frontend

## 4.1 React

Frontend FrameworkとしてReactを採用する。

### 主な用途

- Goal画面
- PLAN / DO / CHECK / ACT
- PDCA完了演出
- ガチャ
- コレクション
- Player Lv
- ストリーク
- 履歴表示

---

## 4.2 Vite

Build ToolとしてViteを採用する。

### 採用理由

- 開発サーバー起動が速い
- Reactとの構成が単純
- ハッカソンで余計なFramework機能を抱えなくてよい
- PWA対応を追加しやすい
- デプロイしやすい

本プロダクトではServer Side Renderingを必須としないため、
Next.js等のフルスタックFrameworkは採用しない。

---

# 5. Language

## TypeScript

Frontend・BackendロジックともにTypeScript中心で統一する。

### 採用理由

- Reactとの相性
- Convexとの相性
- 型によるデータ不整合防止
- Frontend / Backend間で型の考え方を揃えやすい
- ハッカソン中のリファクタリングがしやすい

---

# 6. Backend / Database

## 6.1 Convex

BackendおよびDatabaseとしてConvexを採用する。

### 採用理由

最優先理由は、

> **完成速度**

である。

今回必要となるBackend機能は、

- User
- Goal
- PDCA Cycle
- Streak
- Player XP / Lv
- Character
- Inventory
- Character Fragment
- Gacha
- Mission
- AI用履歴

などであり、複雑な独自インフラを必要としない。

Convexを利用することで、
Frontendと近いTypeScript開発体験のままBackendを構築する。

---

## 6.2 Convexで担当する処理

### Query

例：

```text
Goal一覧取得
Player情報取得
PDCA履歴取得
所持キャラ一覧取得
コレクション取得
ストリーク取得
```

### Mutation

例：

```text
Goal作成
PLAN保存
DO結果保存
CHECK保存
ACT保存
Player XP更新
Inventory更新
```

### Server-side処理

例：

```text
ガチャ抽選
Player Lv判定
ストリーク更新
リカバリー判定
AI PLAN生成
```

ゲームに関わる重要処理は可能な限りクライアントだけで完結させない。

---

# 7. Authentication

## 7.1 Clerk

認証プロバイダとしてClerkを採用する。

Login Providerは、

> **Google OAuthのみ**

をMVPの対象とする。

メールアドレス + パスワード認証等はMVPでは実装しない。

---

## 7.2 認証UX

PDCA GACHAでは、

> **価値体験より前にログインを要求しない**

ことを重視する。

初回フロー：

```text
未ログイン
↓
Goal作成
↓
最初のPDCA
↓
ガチャ
↓
初回価値体験完了
↓
「この記録を保存する」
↓
Google Login
↓
Convexへ同期
```

---

# 8. Guest Mode

## 8.1 方針

初回PDCA・ガチャまでは認証なしで利用可能とする。

MVPではゲストデータを、

> **localStorage**

へ保存する。

---

## 8.2 Guest保存対象

最低限：

```text
Goal
進行中PLAN
DO状態
CHECK
ACT
初回PDCA結果
初回ガチャ結果
```

---

## 8.3 Login後

Googleログイン完了後、

```text
localStorage
↓
Convex User Data
```

へデータを同期する。

同期成功後、
ローカルの一時データを削除または同期済みとして扱う。

---

## 8.4 localStorage採用理由

MVPでGuest状態として保持するデータ量は小さい。

そのためIndexedDB等は利用せず、
実装コストの低いlocalStorageを採用する。

将来的に、

- オフライン利用
- 大量履歴
- 画像
- 複雑な同期

が必要になった場合はIndexedDB等を検討する。

---

# 9. AI

## 9.1 AIの役割

AIはプロダクトの主役ではない。

ユーザーがPDCAを軽く回せるようにする補助機能として利用する。

主な用途：

1. Goalから初回PLAN候補を生成
2. CHECK / ACTから次回PLAN候補を生成
3. 任意メモを次回PLAN生成に利用
4. 将来的な振り返り支援

---

## 9.2 AI呼び出し構成

FrontendからLLM APIを直接呼び出さない。

```text
React
↓
Convex Action
↓
LLM API
```

とする。

### 理由

- API Keyをクライアントに公開しない
- PromptをBackend側で管理できる
- 出力チェックを行える
- AI障害時のfallbackを実装できる
- 呼び出し制御を一元化できる

---

## 9.3 AI出力

長い自然文ではなく、
短いStructured Outputを基本とする。

例：

```json
{
  "nextPlan": "英単語を5個復習する",
  "message": "前回より少し軽めにしました"
}
```

---

## 9.4 AIに渡す情報

必要最低限に限定する。

例：

```text
Goal
今回のPLAN
DO結果
CHECK
CHECK詳細
ACT
直近数回のPDCA履歴
```

履歴を無制限に送信しない。

---

## 9.5 AI Fallback

AI APIが失敗してもPDCAフローを止めない。

例：

```text
CHECK:
重かった

ACT:
軽くする

↓

Rule-based:
「次回は前回より軽めにしましょう」
```

AIはUX改善機能であり、
アプリ動作の必須依存にはしない。

---

# 10. Styling

## 10.1 Tailwind CSS

CSS設計にはTailwind CSSを採用する。

### 採用理由

- UI構築が速い
- レスポンシブ対応がしやすい
- ハッカソン中のUI修正が容易
- デザイン調整をコンポーネント単位で行いやすい

---

# 11. UI Components

## shadcn/ui

必要箇所のみ使用する。

想定用途：

- Dialog
- Drawer
- Button
- Card
- Tabs
- Progress
- Toast
- Form関連

アプリ全体をUIライブラリの見た目に依存させず、
PDCA GACHA独自のゲームUIを優先する。

---

# 12. Animation

## 12.1 方針

ガチャ・PDCA COMPLETE・Player Lv UPでは、
アニメーションを重要な体験要素として扱う。

候補：

> Motion系Reactアニメーションライブラリ

---

## 12.2 主な利用箇所

- PDCA COMPLETE
- ガチャ開始
- レアリティ演出
- キャラクター出現
- Player Lv UP
- ストリーク達成
- コレクション追加

---

## 12.3 原則

通常のPLAN / DO / CHECK / ACT操作では、
過度なアニメーションを避ける。

目的は、

> **日常操作は速く、報酬体験だけ気持ちよくする**

ことである。

---

# 13. Client State

## 13.1 基本方針

MVPでは、

> **React State + Convex**

を基本とする。

---

## 13.2 Zustand

以下のような複雑な一時状態が必要になった場合のみ追加する。

例：

- PDCA Wizard全体の状態
- 複雑なガチャ演出状態
- Guest / Login同期状態

最初から導入しない。

---

# 14. PWA

## 14.1 必須要素

MVPで最低限、

- Manifest
- App Icon
- Install可能な構成
- Smartphone responsive UI

を実装する。

---

## 14.2 Offline

完全オフライン動作はMVP必須としない。

ただし進行中PDCAについては、
可能であればGuestと同様にローカル状態を利用して、
画面リロードによる消失を防ぐ。

---

# 15. Push Notification

## 15.1 将来的な重要度

通知は継続プロダクトとの相性が非常に高い。

例：

```text
「今日はまだ1周していません」

「ストリークが危機です」

「今日は5分だけでもどう？」
```

---

## 15.2 MVP方針(2026-08時点更新)

MVP期間中は、

> **余裕があれば実装**

としていた。

理由：

- ブラウザ差
- OS差
- Permission UX
- PWA環境差

による実装・検証コストが高いため。

通知より、

> PDCA → ガチャ

のコアループ完成を優先していた。

MVP完了後、上記のうち「ストリークAt-Risk」トリガー1種類のみに絞って実装済み
(docs/technical-design.md §100.5)。iPhone/Android/PC全対応。
ガチャ権利リマインド・日次無活動リマインド・マイルストーン祝福等の
他トリガーは引き続きOut of Scope。

---

# 16. Hosting

## Vercel

Frontend Hostingの第一候補としてVercelを利用する。

### 採用理由

- Viteアプリのデプロイが容易
- GitHub連携
- Preview Deploy
- HTTPS
- PWA公開が容易
- ハッカソンでデプロイ作業を短縮できる

---

# 17. Asset Management

MVPのキャラクター画像等は、
まず静的アセットとしてFrontendから配信する。

例：

```text
/public
  /characters
    r_001.webp
    r_002.webp
    sr_001.webp
    ssr_001.webp
```

MVP段階では、
キャラクター画像アップロード等の管理画面は実装しない。

将来的にキャラ追加頻度が増えた場合は、
外部Storageへの移行を検討する。

---

# 18. Gacha Implementation

## 18.1 抽選場所

ガチャ抽選はFrontendではなく、
Convex側で行う。

```text
Frontend
↓
Gacha Request
↓
Convex
↓
Random Draw
↓
Inventory Update
↓
Result
```

---

## 18.2 理由

- クライアント改ざん対策
- Inventoryとの更新をまとめやすい
- 排出率をFrontendへ直接依存させない
- 将来の確定枠 / 天井へ拡張しやすい

---

# 19. Streak Implementation

ストリーク判定はBackend側のデータを正とする。

基本情報：

```text
lastCompletedDate
currentStreak
recoveryStatus
lastRecoveryDate
```

ユーザーのタイムゾーンを考慮して日付判定する。

具体的な日時処理は technical-design で定義する。

---

# 20. Data Ownership

## 20.1 Login後

Convexを正とする。

## 20.2 Guest

localStorageを正とする。

## 20.3 Login移行時

Guest DataをConvexへマージする。

同一データが重複登録されないよう、
一意なGuest Session ID等の導入を検討する。

---

# 21. Testing

MVPでは過剰なテストコード作成を避けるが、
壊れるとデモに直結する箇所はテスト対象とする。

優先対象：

1. Player XP計算
2. Player Lv判定
3. Gacha抽選
4. 重複キャラ処理
5. Streak判定
6. Recovery判定
7. PDCA成立判定

UI全体の網羅的E2EテストはMVP必須としない。

---

# 22. Code Quality

採用：

```text
ESLint
Prettier
TypeScript strict mode
```

ハッカソン中でも最低限、
型エラー・Lintエラーによる事故を減らす。

---

# 23. CI / CD

MVPでは複雑なCI Pipelineを構築しない。

基本：

```text
GitHub
↓
Pull / Push
↓
Vercel Preview / Deploy
```

必要に応じてGitHub Actionsで、

```text
npm run lint
npm run typecheck
npm run build
```

程度を追加する。

ただしCI構築自体に時間を使いすぎない。

---

# 24. Environment Variables

最低限、

```text
Convex Deployment
Clerk Keys
LLM API Key
```

を環境変数で管理する。

SecretはRepositoryへCommitしない。

LLM API KeyはFrontend環境変数へ配置せず、
Convex側のみからアクセスする。

---

# 25. Cost Policy

ハッカソンMVPでは、

> **可能な限り無料枠内で運用する**

ことを目指す。

主な構成：

```text
React / Vite
→ 無料

Convex
→ 無料枠利用

Clerk
→ 無料枠利用

Vercel
→ 無料枠利用

LLM API
→ 使用量に応じた少額課金
```

AI呼び出しは短い入出力に限定し、
不要な呼び出しを行わない。

---

# 26. MVP Architecture

```text
┌─────────────────────────────┐
│          User / PWA         │
│        Smartphone/Web       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│    React + Vite + TS        │
│                             │
│ PLAN / DO / CHECK / ACT     │
│ Gacha / Collection / Lv     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           Convex            │
│                             │
│ Query / Mutation / Action   │
│ Database                    │
│ Gacha                       │
│ Streak                      │
│ Player XP / Level           │
└───────┬─────────────┬───────┘
        │             │
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│    Clerk     │ │   LLM API    │
│ Google OAuth │ │ PLAN Generate│
└──────────────┘ └──────────────┘
```

---

# 27. 採用しなかった / 今回使わない候補

## Supabase

技術的には適しているが、
今回の開発環境上の都合から採用しない。

---

## Firebase

実装速度は高いが、
今回のデータ構造・チームの選択としてConvexを優先する。

---

## Native App / Flutter

継続アプリとの相性は良いが、
ハッカソンにおけるWebの開発・デプロイ速度を優先してPWAを採用する。

---

## Next.js

今回Server Side Rendering等を必要としないため、
より軽量なReact + Vite構成を採用する。

---

## Dedicated Backend Server

Go / Node.js等による独自Backend Serverも候補だが、

> **完成速度**

を最優先し、
MVPではConvexへ寄せる。

---

# 28. MVPで優先する技術タスク

## Priority 1

- React + Vite初期構築
- TypeScript
- Convex接続
- Goal CRUD
- PDCA Cycle保存
- Guest Mode
- Google Login
- Player XP
- ガチャ
- Inventory
- Character Collection

## Priority 2

- AI PLAN生成
- Streak
- Recovery
- Player Lv
- PWA install
- Animation

## Priority 3

- Notification
- Character Lv
- Advanced Analytics
- Advanced Offline
- Complex CI

---

# 29. 未確定事項

以下は今後の technical-design / 実装時に確定する。

## AI

- 使用する具体的なLLM Provider
- 使用モデル
- Structured Output形式
- Token上限
- Timeout
- Retry

## PWA

- Service Worker詳細
- Cache戦略
- Push Notification
- Offline範囲

## Convex

- Schema
- Index
- Action / Mutation分離
- Guest Merge方式

## Authentication

- Guest → Login時のマージ仕様
- Logout後の挙動
- Account Delete

## Hosting

- Vercel最終採用
- Production Domain
- Preview Environment

## Animation

- 採用ライブラリ
- ガチャ演出仕様

---

# 30. 技術選定の判断基準

技術を追加・変更する場合は以下を確認する。

1. MVPの完成速度が上がるか
2. コアループ実装に必要か
3. チームが短時間で扱えるか
4. デバッグしやすいか
5. 無料または低コストか
6. デモ時に安定するか
7. 将来的な拡張を阻害しないか
8. 技術そのものが目的になっていないか

---

# 31. 最終方針

PDCA GACHA のMVPでは、

> **高度な技術構成を作ることより、PDCAを回したくなる体験を完成させること**

を優先する。

そのため、

```text
React + Vite + PWA
        ↓
      Convex
        ↓
Clerk      LLM API
```

という比較的シンプルな構成で、
FrontendからBackendまでTypeScript中心で高速に開発する。

技術選定によって開発時間を消費するのではなく、

> PLAN → DO → CHECK → ACT → ガチャ

というコアループの完成度へ開発リソースを集中させる。
