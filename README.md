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

## Google Apps Script 連携設定（給与明細自動反映）

勤怠システムで集計した月次データを、Google Apps Script（GAS）製の Web App を経由して「給与明細」スプレッドシートへ書き込みます。サービスアカウントは不要です。

### 1. スプレッドシートにバインドした Apps Script を作成

1. 対象となるスプレッドシート（テスト用URL：<https://docs.google.com/spreadsheets/d/1DeQdS71jVkWd69u1Yb2xDzxZRgQ02klkIgkLEdZ0JtM/edit>）を開く
2. 上部メニューから **拡張機能 > Apps Script** を開き、スクリプトエディタを起動
3. `Code.gs` に以下のコードを貼り付ける

```javascript
const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN'); // 任意

function doPost(e) {
  const result = handleRequest(e);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action;
    const token = data.token;
    const payload = data.payload || {};

    if (SECRET_TOKEN && token !== SECRET_TOKEN) {
      return { success: false, error: 'invalid token' };
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
    if (!sheet) {
      return { success: false, error: 'シート Sheet1 が見つかりません' };
    }

    if (action === 'test') {
      return { success: true, staffNames: [] };
    }

    const items = payload.items || [];

    if (action === 'preview') {
      const preview = items.map((item) => ({
        staffName: item.staffName,
        fields: item.fields.map((field) => ({
          key: field.key,
          cell: field.cell,
          currentValue: sheet.getRange(field.cell).getDisplayValue(),
          newValue: field.newValue,
        })),
      }));
      return { success: true, preview };
    }

    if (action === 'sync') {
      const results = items.map((item) => {
        try {
          item.fields.forEach((field) => {
            sheet.getRange(field.cell).setValue(field.newValue);
          });
          return { staffName: item.staffName, success: true, updatedCells: item.fields.map((f) => f.cell) };
        } catch (error) {
          return { staffName: item.staffName, success: false, updatedCells: [], error: String(error) };
        }
      });
      return { success: true, results };
    }

    return { success: false, error: 'unsupported action' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

> シート名が `Sheet1` 以外の場合は、`getSheetByName` の引数を変更してください。

### 2. （任意）APIトークンを設定

セキュリティ強化のため、Apps Script の **スクリプトプロパティ** に `SYNC_TOKEN` を設定できます。

1. Apps Script 画面で **歯車アイコン > プロジェクトのプロパティ** を開く
2. **スクリプトのプロパティ** タブで `SYNC_TOKEN` を追加し、任意のランダム文字列を設定
3. `.env.local` と Vercel に同じ値を `GOOGLE_APPS_SCRIPT_WEB_APP_TOKEN` として保存

### 3. Web App としてデプロイ

1. Apps Script 画面右上の **デプロイ > 新しいデプロイ** を選択
2. 種類は **ウェブアプリ**
3. 説明を入力（例：`attendance-sync`）
4. **実行するアプリケーション**: 自分
5. **アクセスできるユーザー**: 「全員（匿名ユーザーを含む）」
6. **デプロイ** をクリックし、表示された URL をコピー（例：`https://script.google.com/macros/s/.../exec`）

### 4. `.env.local` に環境変数を設定

```bash
# Google Apps Script Web App のURL
GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/your-web-app-id/exec

# Apps Script 側で SYNC_TOKEN を設定した場合のみ
GOOGLE_APPS_SCRIPT_WEB_APP_TOKEN=your-optional-secret-token
```

保存後、開発サーバーを再起動してください。

### 5. Vercel にも同じ環境変数を設定

Vercel のダッシュボード > **Settings > Environment Variables** で上記2つのキーを Production / Preview / Development それぞれに登録し、再デプロイします。

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
