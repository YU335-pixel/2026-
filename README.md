# カイポケ スケジュール自動化ツール

カイポケ（介護事業所向け管理システム）の「スケジュール変更」「スタッフ訪問スケジュール組み」を
ローカルPC上でブラウザ自動化（Playwright）するCLIツールです。カイポケに公開APIがないため、
実際のログイン画面・操作画面をブラウザ経由で自動操作します。

## ご利用にあたっての注意

- **利用規約:** カイポケの利用規約が自動化アクセス（RPA/スクレイピング）を禁止していないか、
  事前にご確認ください。規約違反はアカウント停止等のリスクがあります。
- **個人情報:** 取り扱うデータ（利用者名・スタッフ名・訪問記録等）は要配慮個人情報に該当します。
  `logs/`, `runs/`, `.auth/` 以下のファイルや、失敗時に保存されるスクリーンショット/トレースは
  すべて `.gitignore` 対象ですが、これらを外部へ共有・アップロードしないでください。
- 本リポジトリをリモート（GitHub等）にpushする場合は、`.gitignore` が上記ディレクトリを
  確実に除外できているか事前に確認してください。

## セットアップ

```bash
npm install
cp .env.example .env
# .env を開き、KAIPOKE_CORP_ID / KAIPOKE_USER_ID / KAIPOKE_PASSWORD を設定
```

## セレクタについて

ログイン・スケジュール一覧・訪問編集ポップアップの実際のセレクタは、`playwright codegen` で
記録した内容をもとに以下のファイルへ反映済みです（[docs/RECORDING_WORKFLOWS.md](docs/RECORDING_WORKFLOWS.md)
に記録手順を残しています。カイポケ側の画面が変わった場合は同じ手順で再取得してください）:

- `src/auth.js`（ログイン）
- `src/navigation.js`（レセプト→訪問看護→職員絞り込み→週送り）
- `src/operations/scheduleTable.js`（訪問予定の検索）
- `src/operations/visitPopup.js`（訪問編集ポップアップの時刻・スタッフ操作）

なお `src/navigation.js` 内の「訪問看護/2860991096」はこの事業所固有のリンク文言です。
別の事業所で使う場合は実際の画面のリンク文言に置き換えてください。

## 使い方

入力ファイルは `config/examples/` 以下のサンプルを参考に、`runs/` 配下に実データで作成してください
（`runs/` は `.gitignore` 対象です）。

### スケジュール変更

```bash
node scripts/change-schedule.js runs/my-changes.json --dry-run   # まずdry-runで検証
node scripts/change-schedule.js runs/my-changes.json              # 変更ごとに確認しながら実行
```

### スタッフ訪問スケジュール組み

```bash
node scripts/assign-staff.js runs/my-assignments.json --dry-run
node scripts/assign-staff.js runs/my-assignments.json
```

### 曜日ごとの訪問パターンから1ヶ月分をまとめて生成する

毎週だいたい同じ利用者・時間・担当スタッフのパターンが決まっている場合、
`config/examples/weekly-pattern.example.json` を参考に曜日ごとのルールを1度書いておけば、
指定した期間の日付ごとの割当リストを自動生成できます（ブラウザは操作しない、ローカルの
ファイル変換のみです）。

```bash
node scripts/generate-assignments.js config/weekly-pattern.json \
  --from 2026-08-01 --to 2026-08-31 \
  --out runs/2026-08-assignments.json
```

生成されたファイルは**必ず開いて内容を確認し、イレギュラー（スタッフの休み・利用者都合など）が
ある日を手直ししてから**、通常通り実行してください:

```bash
node scripts/assign-staff.js runs/2026-08-assignments.json --dry-run
node scripts/assign-staff.js runs/2026-08-assignments.json
```

生成された各項目は安全のため `replaceExistingStaff: false` になっています。既に別のスタッフが
割り当たっている枠にパターン通り強制上書きしたい場合は、該当項目を `true` に変更してください。

### 共通オプション

| オプション | 内容 |
|---|---|
| `--dry-run` | 対象の検索・フォーム入力までを行い、保存はしない |
| `--yes` | 変更ごとの確認プロンプトをスキップする（個別のdry-run検証を済ませてから使用推奨） |
| `--headless` | ブラウザを表示せず実行する（デフォルトは表示あり） |
| `--continue-on-error` | 1件の失敗（対象なし/複数マッチ等）で停止せず、次の項目へ進む（デフォルトは停止） |

## 推奨する検証の流れ

1. `--dry-run` で1件だけの入力ファイルを実行し、ログイン→検索→フォーム入力までが
   意図通り動くことを確認する
2. 低リスクな実データ1件を対象に `--dry-run` なしで実行し、カイポケ画面上で実際に
   変更が反映されることを目視確認する
3. 上記が確認できてから、複数件の入力ファイルや `--yes` によるバッチ実行に移行する

## ログ・診断情報

- `logs/<日時>.jsonl`: 実行ごとの構造化ログ（認証情報は自動的に伏せ字化されます）
- `logs/diagnostics/`: 失敗時のPlaywrightトレース、dry-run時のスクリーンショット
