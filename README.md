# 小川勤怠

店舗アルバイト向け勤怠管理システム。iPad・スマホで使いやすいPIN打刻システム。

## 機能

- PINコードによる打刻（出勤・退勤・休憩開始・休憩終了）
- 店長・管理者向け管理画面
- スタッフ登録・編集
- 勤務履歴一覧
- 打刻修正（スタッフ選択→日付選択→履歴選択→修正箇所→修正時刻）
- 修正履歴
- 月次集計（勤務日数・総勤務時間・残業時間・基本賃金・時間外賃金・交通費・合計支給額）
- CSV出力（スタッフ・月毎）
- 給与明細出力（PDF印刷対応）
- モバイル対応

## Getting Started

### ローカル開発

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

### ビルド

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリにコードをプッシュ
2. [Vercel](https://vercel.com/new) でリポジトリをインポート
3. ビルド設定は自動で検出されます（vercel.jsonを使用）
4. デプロイ

### 環境変数

データベース連携を使用する場合、`.env.example` を参考に環境変数を設定してください。

## Google Sheets API 連携設定（給与明細自動反映）

勤怠システムで集計した月次データを、既存のGoogleスプレッドシート「給与明細」へ自動反映する機能です。

### 事前準備：Google Cloud での設定

#### 1. Google Cloud プロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを新規作成（または既存プロジェクトを使用）
3. プロジェクトIDをメモしておく

#### 2. Google Sheets API を有効化

1. [APIライブラリ](https://console.cloud.google.com/apis/library) を開く
2. 「Google Sheets API」と検索
3. 「Google Sheets API」を選択 → 「有効にする」をクリック

#### 3. サービスアカウントを作成

1. [IAMと管理 > サービスアカウント](https://console.cloud.google.com/iam-admin/serviceaccounts) を開く
2. 「サービスアカウントを作成」をクリック
3. 以下を入力：
   - サービスアカウント名：`attendance-sheets-sync`
   - サービスアカウントID：自動入力される
   - 説明：`勤怠システムから給与明細スプレッドシートへの連携用`
4. 「作成して続行」をクリック
5. ロールの選択は「基本的な役割」→「閲覧者」を選択（後で変更します）
6. 「完了」をクリック

#### 4. キーを作成（JSON）

1. 作成したサービスアカウントの行をクリック
2. 「キー」タブを開く
3. 「キーを追加」→「新しいキーを作成」を選択
4. タイプは「JSON」を選択
5. 「作成」をクリック
6. JSONファイルが自動ダウンロードされます（`******-******-******.json`）
7. **このファイルは大切に保管してください。紛失した場合は再作成が必要です。**

#### 5. スプレッドシートへの権限付与

1. JSONキーファイルをテキストエディタで開く
2. `client_email` の値をコピー（例：`attendance-sheets-sync@your-project.iam.gserviceaccount.com`）
3. [給与明細スプレッドシート](https://docs.google.com/spreadsheets/d/1DeQdS71jVkWd69u1Yb2xDzxZRgQ02klkIgkLEdZ0JtM/edit) を開く
4. 「共有」ボタンをクリック
5. コピーしたメールアドレスを貼り付け
6. 権限は「編集者」を選択
7. 「完了」をクリック

### 環境変数の設定

1. リポジトリの `.env.local` を開く（ない場合は新規作成）
2. JSONキーファイルの中身を確認し、以下の値を `.env.local` に記入：

```bash
# Google Sheets API（給与明細連携用）
# JSONキーファイル内の "client_email" の値
GOOGLE_SHEETS_CLIENT_EMAIL=attendance-sheets-sync@your-project.iam.gserviceaccount.com

# JSONキーファイル内の "private_key" の値（-----BEGIN PRIVATE KEY----- から -----END PRIVATE KEY-----\n まで）
# 改行は \n に置き換えて1行で記入するか、ダブルクォートで囲んで改行をそのまま入れる
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# スプレッドシートID（URLの /d/ と /edit の間の文字列）
GOOGLE_SHEETS_SPREADSHEET_ID=1DeQdS71jVkWd69u1Yb2xDzxZRgQ02klkIgkLEdZ0JtM

# シート名（デフォルトは Sheet1）
GOOGLE_SHEETS_SHEET_NAME=Sheet1
```

**JSONキーの値の入れ方の詳細：**

JSONキーファイルをテキストエディタで開くと、以下のような構造になっています：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "***",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "attendance-sheets-sync@your-project.iam.gserviceaccount.com",
  ...
}
```

- `private_key` の値を `.env.local` の `GOOGLE_SHEETS_PRIVATE_KEY` に設定
- 改行コード `\n` は必ずエスケープされた状態（`\n`）で保持するか、実際の改行を含める場合はダブルクォート `"` で囲む
- 先頭の `-----BEGIN PRIVATE KEY-----` から末尾の `-----END PRIVATE KEY-----\n` までを含める

### 連携機能の使い方

1. 管理者（細田径弘 / PIN: 9999）でログイン
2. 「月次集計」を開く
3. 反映したい月を選択
4. 「接続テスト」ボタンでスプレッドシートへの接続を確認
5. 「プレビューを表示」ボタンで、反映前の内容を確認
6. 「スプレッドシートへ反映」ボタンで実行
7. 反映履歴がブラウザに保存されます（同一PC・同一ブラウザのみ）

### 反映対象のデータ

- 勤務日数
- 出勤時間（時間換算）
- 残業時間（時間換算）
- 年末年始時間（時間換算）

※ 基本給・時間外賃金・交通費・年末年始手当は、スプレッドシート側の計算式で自動算出されます。

## 技術スタック

- Next.js 16.2.6
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- ESLint

## 開発モード

開発モードではSeedデータ（ダミーデータ）が自動生成され、UI確認が可能です。

## ライセンス

MIT
