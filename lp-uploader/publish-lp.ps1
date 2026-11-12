[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$')]
    [string]$Bucket,

    [string]$CloudFrontDistributionId,
    [string]$Region = 'ap-northeast-1'
)

$ErrorActionPreference = 'Stop'
$prefix = 'salonbox'
$sourcePath = (Resolve-Path (Join-Path $PSScriptRoot '..\salonbox')).Path
$sourceRoot = [IO.Path]::GetFullPath($sourcePath).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$destination = "s3://$Bucket/$prefix/"
$singleFileCopyThreshold = 5

if (-not (Test-Path (Join-Path $sourcePath 'index.html') -PathType Leaf)) {
    throw "公開元に index.html がありません: $sourcePath"
}

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw 'AWS CLI が見つかりません。AWS CLI v2 をインストールしてから再実行してください。'
}

Write-Host ''
Write-Host 'SalonBox LP 公開プレビュー' -ForegroundColor Cyan
Write-Host "公開元: $sourcePath"
Write-Host "公開先: $destination"
Write-Host '処理: 追加・更新のみ（S3側のファイル削除は行いません）'
Write-Host ''

$syncArgs = @(
    's3', 'sync', $sourcePath, $destination,
    '--region', $Region,
    '--exclude', '.venv/*',
    '--exclude', '.vscode/*',
    '--exclude', '.git/*',
    '--exclude', '.env*',
    '--exclude', 'blog/*',
    '--exclude', '**/blog/*',
    '--exclude', 'docs/*',
    '--exclude', '**/docs/*',
    '--exclude', 'scratch/*',
    '--exclude', '**/scratch/*',
    '--exclude', 'package*.json',
    '--exclude', 'README.md',
    '--exclude', '*.pyc',
    '--exclude', '**/__pycache__/*',
    '--no-progress',
    '--dryrun'
)

$preview = @(& aws @syncArgs 2>&1)
if ($LASTEXITCODE -ne 0) {
    $preview | ForEach-Object { Write-Host $_ }
    throw "S3の差分確認に失敗しました (aws exit code: $LASTEXITCODE)"
}

$preview | ForEach-Object { Write-Host $_ }
$uploads = @($preview | Where-Object { $_ -match '^\(dryrun\) upload:' })
if ($uploads.Count -eq 0) {
    Write-Host 'アップロード対象はありません。'
    exit 0
}

# Invalidate only the uploaded LP objects. For index.html objects, also clear
# the corresponding directory URL used by static hosting. Never invalidate
# /salonbox/* because Blog is published below /salonbox/blog/.
$invalidationPathSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
$destinationPattern = ' to ' + [regex]::Escape($destination) + '(?<key>.+)$'
foreach ($line in $uploads) {
    if ($line -notmatch $destinationPattern) {
        throw "差分行からアップロード先キーを読み取れません: $line"
    }

    $relativeKey = $Matches['key'].Replace('\', '/')
    if ($relativeKey -match '(^|/)blog(/|$)') {
        throw "Blog配下へのアップロード候補を検出したため中止します: $relativeKey"
    }
    $encodedKey = (($relativeKey.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/')
    $objectPath = "/$prefix/$encodedKey"
    [void]$invalidationPathSet.Add($objectPath)

    if ($objectPath -match '^/salonbox/blog(?:/|$)') {
        throw "Blog配下のCloudFrontパスを検出したため中止します: $objectPath"
    }

    if ([IO.Path]::GetFileName($relativeKey) -ieq 'index.html') {
        $parentSegments = $relativeKey.Split('/')
        if ($parentSegments.Count -gt 1) {
            $parent = (($parentSegments[0..($parentSegments.Count - 2)] | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/')
            $directoryPath = "/$prefix/$parent"
        } else {
            $directoryPath = "/$prefix"
        }
        [void]$invalidationPathSet.Add($directoryPath)
        [void]$invalidationPathSet.Add("$directoryPath/")
    }
}
$invalidationPaths = @($invalidationPathSet | Sort-Object)

Write-Host ''
Write-Host "アップロード対象: $($uploads.Count) ファイル" -ForegroundColor Yellow
$confirmation = Read-Host "この内容を s3://$Bucket/$prefix/ に反映する場合は DEPLOY と入力"
if ($confirmation -cne 'DEPLOY') {
    Write-Host 'キャンセルしました。S3は変更していません。'
    exit 0
}

$uploadedCount = 0
if ($uploads.Count -le $singleFileCopyThreshold) {
    Write-Host "変更ファイルを個別アップロードします（$($uploads.Count) 件。S3の再差分走査を省略）。"
    foreach ($line in $uploads) {
        if ($line -notmatch ('^\(dryrun\) upload:\s*(?<source>.+?)\s+to\s+(?<target>' + [regex]::Escape($destination) + '.+)$')) {
            throw "差分行を安全に解釈できないため中止します: $line"
        }
        $file = [IO.Path]::GetFullPath($Matches['source'])
        $target = $Matches['target']
        if (-not $file.StartsWith($sourceRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "公開元フォルダ外のファイルを検出したため中止します: $file"
        }
        if (-not $target.StartsWith($destination, [StringComparison]::Ordinal)) {
            throw "LP公開先prefix外のキーを検出したため中止します: $target"
        }
        if ($target -match '/blog(?:/|$)') {
            throw "Blog配下へのアップロードを検出したため中止します: $target"
        }

        & aws s3 cp $file $target --region $Region --no-progress
        if ($LASTEXITCODE -ne 0) {
            throw "S3アップロードに失敗しました: $file (aws exit code: $LASTEXITCODE)"
        }
        $uploadedCount += 1
    }
} else {
    Write-Host "一括変更のため、AWS CLIの並列syncを使用します（$($uploads.Count) 件）。"
    $syncArgs = @($syncArgs | Where-Object { $_ -ne '--dryrun' })
    & aws @syncArgs
    if ($LASTEXITCODE -ne 0) {
        throw "S3アップロードに失敗しました (aws exit code: $LASTEXITCODE)"
    }
    $uploadedCount = $uploads.Count
}

if ($CloudFrontDistributionId) {
    $invalidationArgs = @(
        'cloudfront', 'create-invalidation',
        '--distribution-id', $CloudFrontDistributionId,
        '--paths'
    ) + $invalidationPaths + @('--region', 'us-east-1')
    & aws @invalidationArgs
    if ($LASTEXITCODE -ne 0) {
        throw 'S3への反映は完了しましたが、CloudFrontのキャッシュ無効化に失敗しました。'
    }
    Write-Host "LPの変更パスだけCloudFrontキャッシュを無効化しました ($($invalidationPaths.Count) paths)。" -ForegroundColor Green
} else {
    Write-Warning 'CloudFrontのDistribution IDが未指定のため、キャッシュ無効化は行っていません。'
}

Write-Host "LPの公開が完了しました（$uploadedCount ファイル）。" -ForegroundColor Green
