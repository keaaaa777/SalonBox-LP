# SalonBox LP Uploader

`salonbox/` の静的ファイルを、S3の `salonbox/` prefixへ公開する専用スクリプトです。ブログのビルドや `blog/` prefixには触れません。

## 前提

- Windows PowerShell
- AWS CLI v2 と、対象バケットへ書き込めるAWS認証設定
- CloudFrontも更新する場合はDistribution ID

AWS認証は既存のAWS CLIプロファイルなどで設定してください。アクセスキーをこのリポジトリに保存しないでください。

## 実行

リポジトリのルート `C:\Git\Salonbox-LP` で実行します。

```powershell
.\lp-uploader\publish-lp.ps1 -Bucket <S3バケット名> -CloudFrontDistributionId <Distribution ID>
```

CloudFrontのキャッシュ更新が不要な場合は、`-CloudFrontDistributionId` を省略できます。AWSプロファイルで既定以外のリージョンを使う場合は `-Region` も指定してください。

実行すると、まずS3へのdry-run結果を表示します。表示された差分を確認し、公開先が正しいことを確かめてから `DEPLOY` と入力してください。キャンセルする場合は `DEPLOY` 以外を入力します。

変更が5ファイル以下なら、dry-runで特定したファイルだけを個別にアップロードし、2回目のS3差分走査を省きます。6ファイル以上の一括変更では、AWS CLIの並列 `sync` を使います。

## 安全動作

- 公開元はこのリポジトリの `salonbox/` に固定
- 公開先prefixは `salonbox/` に固定
- ブログの `blog/` prefixには触れず、ローカルに同名フォルダができても明示的に除外
- `--delete` を使わず、S3上の既存ファイルを削除しない
- `.venv`、`.vscode`、`.git`、`.env`、`docs`、`scratch`、依存関係ファイルを除外
- 実アップロード前にdry-run結果と明示確認を必須化
- 少数変更はdry-runの結果を再利用し、再度のS3一覧取得を省略
- CloudFrontは実際にアップロードしたLPファイルと該当する `index.html` のURLだけ無効化（`/salonbox/blog/` は対象外）

追加の除外が必要な場合は、`publish-lp.ps1` の `--exclude` を追加してください。公開用の `scripts/` フォルダや `images/` はアップロード対象です。
