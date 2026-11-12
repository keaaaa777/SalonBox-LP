# SalonBox LP

## VS Codeでローカル表示

リポジトリのルート `C:\Git\Salonbox-LP` をVS Codeで開き、実行とデバッグから **SalonBox LP (ローカル)** を選んで `F5` を押します。VS Codeが同梱のPython仮想環境でローカルHTTPサーバーを起動し、Edgeで `http://127.0.0.1:8080/` を開きます。

サーバーを止めるときは、VS Codeのターミナルで `SalonBox LP: ローカルサーバー` タスクを終了してください。

## 手動で起動

```powershell
cd C:\Git\Salonbox-LP\salonbox
.\.venv\Scripts\python.exe -m http.server 8080 --bind 127.0.0.1
```

ブラウザーで <http://127.0.0.1:8080/> を開きます。終了は `Ctrl+C` です。
