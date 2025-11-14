# PSD Layer Exporter 🎨

**by Ambrose Starlit**

ブラウザで動作するPSDレイヤー書き出しツールです。

## 特徴

- 📁 **PSDファイルの読み込み** - ドラッグ&ドロップまたはファイル選択
- 📋 **階層構造表示** - フォルダとレイヤーを階層的に表示
- ✨ **個別書き出し** - 選択したレイヤーをキャンバスサイズで個別に書き出し
- 🖼️ **統合書き出し** - 選択したレイヤーを統合して1枚の画像に
- 📄 **レイヤー一覧出力** - テキストファイルでレイヤー構造を保存
- 🎨 **チョコレート/ビスケットテーマ** - 温かみのあるUIデザイン

## 使い方

1. **PSDファイルをアップロード**
   - アップロードエリアをクリック、またはPSDファイルをドラッグ&ドロップ

2. **レイヤーを選択**
   - 書き出したいレイヤーにチェックを入れる
   - 「すべて選択」「選択解除」ボタンで一括操作可能

3. **書き出しモードを選択**
   - **個別書き出し**: 各レイヤーを個別のPNG画像として書き出し
   - **統合書き出し**: 選択レイヤーを1枚に統合して書き出し

4. **書き出し開始**
   - 「書き出し開始」ボタンをクリック
   - 自動的にダウンロードが開始されます

## 技術スタック

- **PSD解析**: [@webtoon/psd](https://www.npmjs.com/package/@webtoon/psd)
- **ZIP生成**: [JSZip](https://stuk.github.io/jszip/)
- **ファイル保存**: [FileSaver.js](https://github.com/eligrey/FileSaver.js/)
- **デザイン**: Pure CSS (チョコレート/ビスケットテーマ)

## 対応ブラウザ

- Chrome / Edge (推奨)
- Firefox
- Safari

## ライセンス

© 2025 Ambrose Starlit

## クレジット

Developed with ❤️ by Ambrose Starlit

VTuber & Software Developer
