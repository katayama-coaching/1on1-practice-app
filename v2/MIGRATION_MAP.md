# V2 移植マップ

このファイルは、既存本体のどこを残し、V2のどこを移すかを対応で見るためのメモです。

## 既存本体で残す領域

### 認証・会員状態

- `index.html`
  - `boot()`
  - `doLogin()`
  - `initApp()`
  - `isAuthorized()`

### 課金

- `index.html`
  - `startCheckout()`
  - `openPortal()`
- API
  - `/api/stripe/checkout`
  - `/api/stripe/portal`
  - `/api/stripe/session`

### 外部記録

- `/api/sheets/add`

### AI会話

- `/api/chat`
  - `action=chat`
  - `action=feedback`

## V2から移す領域

### 体験全体の軸

- `v2/index.html`
  - ホーム
  - 基礎講座
  - ケース練習
  - 面談前AIコーチ
  - ふり返り
  - ダッシュボード

### 学習データ

- `v2/data.js`
  - `courseSessions`
  - `scenarios`

### 学習ロジック

- `v2/app.js`
  - `renderCourseSidebar()`
  - `renderCourse()`
  - `renderScenario()`
  - `evaluateReply()`
  - `sendCoachMessage()`
  - `buildCoachSummary()`
  - `renderPrepOutput()`
  - `renderReviewHistory()`
  - `renderHomeOverview()`
  - `renderMetrics()`

### デザイン基準

- `v2/styles.css`

## 先に移さないもの

次は、最初の移植では見送ります。

- 面談前AIコーチのAPI化
- 法人管理画面
- 部署別レポート
- SSO
- 企業ごとの評価軸カスタマイズ

理由:
- ここを先にやると、完成より前に設計が重くなるため
- まずは個人学習体験を一本通す方が価値が高いため

## 本体で最初にやる差し替え

### Step 1

既存 `index.html` の中で、学習エリアの中身を V2 ベースへ差し替える。

残すもの:
- ログインゲート
- トライアル表示
- 課金表示

差し替えるもの:
- ログイン後に見える各セクション
- ナビゲーションの文言
- 学習導線

### Step 2

既存のローカル状態と V2 の状態を揃える。

基準にする状態:
- `currentCourseId`
- `completedCourses`
- `currentScenarioId`
- `practiceLogs`
- `reviews`
- `prepMemo`

追加で持たせる状態:
- `coachMessages`
- `coachSummary`
- `coachPhase`

### Step 3

ケース練習だけ既存 `api/chat.js` と接続する。

整理方針:
- 部下役ロールプレイは API
- 面談前AIコーチは当面ローカル
- 面談後フィードバックは API

## ひとことで言うと

- 認証と課金は既存本体を使う
- 学習体験は V2 に入れ替える
- API利用は必要最小限に絞る

この形が、いちばん事故が少なく、売れる形へ近づけやすいです。
