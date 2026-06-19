# 1on1 Coaching App

このフォルダは、単体HTML版を既存アプリへ組み込みやすい形に分けたものです。

## ファイル構成

- `index.html`
  - 画面のマークアップです。
- `styles.css`
  - 見た目の定義です。
- `data.js`
  - 10回講座の内容とケース練習シナリオです。
- `app.js`
  - 画面遷移、保存、分析、表示更新のロジックです。

## 既存アプリへ組み込む時の考え方

### まず移植しやすい順

1. `data.js`
   - 既存アプリのデータ層へ入れやすいです。
2. `styles.css`
   - 既存デザインに合わせて必要なクラスだけ移植できます。
3. `index.html`
   - 既存のテンプレートやコンポーネントへ分解する元になります。
4. `app.js`
   - 既存の状態管理やAPI呼び出しに合わせて置き換える対象です。

### React / Next.js に寄せる時の分け方

- `index.html` のタブごとにコンポーネント化
  - `OverviewSection`
  - `CourseSection`
  - `PracticeSection`
  - `PrepSection`
  - `ReviewSection`
  - `DashboardSection`
- `data.js` はそのまま `lib/` や `data/` に移せます。
- `app.js` の役割は以下へ分割できます。
  - 状態管理: `useState` / `useReducer`
  - 保存: `localStorage` ラッパー
  - 分析: AI API 呼び出し、または暫定ルール関数
  - 表示更新: 各コンポーネントの props

## 今の版の位置づけ

- 画面体験と情報設計を固めるためのプロトタイプです。
- 返答分析はルールベースです。
- 本番化する時は `app.js` の `evaluateReply()` を AI API に差し替える想定です。

## 次にやるとよいこと

1. 既存アプリのフレームワークに合わせてコンポーネント分割する
2. `evaluateReply()` を AI 応答へ置き換える
3. 本番用の保存先を `localStorage` からDBへ変える
4. 受講者別・管理者別の閲覧範囲を設計する
