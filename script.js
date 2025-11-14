// PSD Layer Exporter - Main JavaScript
// by Ambrose Starlit

let psdData = null;
let psdFile = null;
let layers = [];
let selectedLayers = new Set();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    const fileSelectBtn = document.getElementById('fileSelectBtn');
    const psdFileInput = document.getElementById('psdFileInput');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const exportBtn = document.getElementById('exportBtn');
    const exportListBtn = document.getElementById('exportListBtn');

    fileSelectBtn.addEventListener('click', () => {
        psdFileInput.click();
    });

    psdFileInput.addEventListener('change', handleFileSelect);
    selectAllBtn.addEventListener('click', selectAllLayers);
    deselectAllBtn.addEventListener('click', deselectAllLayers);
    exportBtn.addEventListener('click', startExport);
    exportListBtn.addEventListener('click', exportLayerListText);
}

// ファイル選択処理
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    psdFile = file;
    document.getElementById('fileNameDisplay').textContent = `${file.name} (${formatFileSize(file.size)})`;

    showProgress(0, 'PSDファイルを読み込み中...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // ag-psdライブラリを使用
        psdData = agPsd.readPsd(new Uint8Array(arrayBuffer));
        
        console.log('PSD読み込み完了:', psdData);
        
        // レイヤーを解析
        parseLayers();
        
        // UI表示
        document.getElementById('layerListArea').style.display = 'block';
        document.getElementById('exportArea').style.display = 'block';
        hideProgress();
        
    } catch (error) {
        console.error('PSD読み込みエラー:', error);
        alert('PSDファイルの読み込みに失敗しました: ' + error.message);
        hideProgress();
    }
}

// レイヤー解析
function parseLayers() {
    layers = [];
    selectedLayers.clear();
    let layerNumber = 0;

    function parseLayerRecursive(layer, depth = 0) {
        if (layer.children && layer.children.length > 0) {
            // フォルダ
            layers.push({
                name: layer.name || 'グループ',
                isFolder: true,
                depth: depth,
                number: 0,
                layer: null
            });

            // 子レイヤーを逆順で処理
            for (let i = layer.children.length - 1; i >= 0; i--) {
                parseLayerRecursive(layer.children[i], depth + 1);
            }
        } else {
            // 通常レイヤー
            if (layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0) {
                layerNumber++;
                layers.push({
                    name: layer.name || `レイヤー${layerNumber}`,
                    isFolder: false,
                    depth: depth,
                    number: layerNumber,
                    layer: layer
                });
            }
        }
    }

    // ルートレイヤーを逆順で処理
    if (psdData.children) {
        for (let i = psdData.children.length - 1; i >= 0; i--) {
            parseLayerRecursive(psdData.children[i], 0);
        }
    }

    renderLayerList();
}

// レイヤーリスト表示
function renderLayerList() {
    const layerList = document.getElementById('layerList');
    layerList.innerHTML = '';

    layers.forEach((layerInfo, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        layerDiv.style.paddingLeft = `${10 + layerInfo.depth * 20}px`;

        if (layerInfo.isFolder) {
            // フォルダ
            layerDiv.classList.add('folder');
            layerDiv.innerHTML = `<span>📁 ${escapeHtml(layerInfo.name)}</span>`;
        } else {
            // 通常レイヤー
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.index = index;
            checkbox.addEventListener('change', handleLayerCheckbox);

            const number = document.createElement('span');
            number.className = 'layer-number';
            number.textContent = String(layerInfo.number).padStart(3, '0');

            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = layerInfo.name;

            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(number);
            layerDiv.appendChild(name);

            layerDiv.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    // プレビュー表示
                    showPreview(layerInfo);
                    
                    // チェックボックストグル
                    checkbox.checked = !checkbox.checked;
                    handleLayerCheckbox({ target: checkbox });
                }
            });
        }

        layerList.appendChild(layerDiv);
    });
}

// プレビュー表示
function showPreview(layerInfo) {
    const previewCanvas = document.getElementById('previewCanvas');
    const previewInfo = document.getElementById('previewInfo');
    const previewPlaceholder = document.getElementById('previewPlaceholder');

    // プレースホルダーを非表示
    previewPlaceholder.style.display = 'none';

    // レイヤーをキャンバスに描画
    const canvas = renderLayerToCanvas(layerInfo.layer, true);
    
    // プレビューキャンバスに転送
    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvas, 0, 0);

    // 表示
    previewCanvas.classList.add('show');
    previewInfo.classList.add('show');
    previewInfo.textContent = `${layerInfo.name} (${canvas.width}×${canvas.height}px)`;
}

// レイヤーチェックボックス処理
function handleLayerCheckbox(event) {
    const index = parseInt(event.target.dataset.index);
    const layerItem = event.target.closest('.layer-item');

    if (event.target.checked) {
        selectedLayers.add(index);
        layerItem.classList.add('selected');
    } else {
        selectedLayers.delete(index);
        layerItem.classList.remove('selected');
    }

    document.getElementById('exportBtn').disabled = selectedLayers.size === 0;
}

// すべて選択
function selectAllLayers() {
    layers.forEach((layerInfo, index) => {
        if (!layerInfo.isFolder) {
            selectedLayers.add(index);
        }
    });
    updateLayerSelection();
}

// 選択解除
function deselectAllLayers() {
    selectedLayers.clear();
    updateLayerSelection();
}

// レイヤー選択状態更新
function updateLayerSelection() {
    const checkboxes = document.querySelectorAll('.layer-item input[type="checkbox"]');
    checkboxes.forEach(cb => {
        const index = parseInt(cb.dataset.index);
        cb.checked = selectedLayers.has(index);
        
        const item = cb.closest('.layer-item');
        if (cb.checked) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    document.getElementById('exportBtn').disabled = selectedLayers.size === 0;
}

// 書き出し開始
async function startExport() {
    const exportMode = document.querySelector('input[name="exportMode"]:checked').value;

    try {
        if (exportMode === 'individual') {
            await exportIndividual();
        } else {
            await exportMerged();
        }
        alert('書き出しが完了しました！');
    } catch (error) {
        console.error('書き出しエラー:', error);
        alert('書き出し中にエラーが発生しました: ' + error.message);
    } finally {
        hideProgress();
    }
}

// 個別書き出し
async function exportIndividual() {
    const selectedIndices = Array.from(selectedLayers);
    const total = selectedIndices.length;
    const files = [];

    for (let i = 0; i < total; i++) {
        const index = selectedIndices[i];
        const layerInfo = layers[index];
        
        showProgress((i / total) * 100, `${i + 1}/${total} レイヤーを書き出し中...`);

        try {
            const canvas = renderLayerToCanvas(layerInfo.layer, true);
            const blob = await canvasToBlob(canvas);
            const filename = `${String(layerInfo.number).padStart(3, '0')}：${sanitizeFilename(layerInfo.name)}.png`;
            
            files.push({ filename, blob });
        } catch (error) {
            console.error(`レイヤー ${layerInfo.name} の書き出しエラー:`, error);
        }
    }

    showProgress(100, 'ZIPファイルを作成中...');

    // ZIPにまとめてダウンロード
    if (files.length > 1) {
        const zip = new JSZip();
        files.forEach(file => {
            zip.file(file.filename, file.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `${psdFile.name.replace('.psd', '')}_layers.zip`;
        saveAs(zipBlob, zipFilename);
    } else if (files.length === 1) {
        saveAs(files[0].blob, files[0].filename);
    }
}

// 統合書き出し
async function exportMerged() {
    showProgress(0, '統合画像を作成中...');

    // 番号の大きい順（下層から）にソート
    const selectedIndices = Array.from(selectedLayers).sort((a, b) => {
        return layers[b].number - layers[a].number;
    });

    const canvas = document.createElement('canvas');
    canvas.width = psdData.width;
    canvas.height = psdData.height;
    const ctx = canvas.getContext('2d');

    const total = selectedIndices.length;
    for (let i = 0; i < total; i++) {
        const index = selectedIndices[i];
        const layerInfo = layers[index];
        
        showProgress((i / total) * 100, `${i + 1}/${total} レイヤーを合成中...`);

        try {
            const layer = layerInfo.layer;
            const layerCanvas = renderLayerToCanvas(layer, false);
            
            const x = layer.left || 0;
            const y = layer.top || 0;
            
            ctx.drawImage(layerCanvas, x, y);
        } catch (error) {
            console.error(`レイヤー ${layerInfo.name} の合成エラー:`, error);
        }
    }

    showProgress(100, '保存中...');

    const blob = await canvasToBlob(canvas);
    const filename = `${psdFile.name.replace('.psd', '')}_merged.png`;
    saveAs(blob, filename);
}

// レイヤーをキャンバスに描画
function renderLayerToCanvas(layer, fullCanvas = true) {
    const canvas = document.createElement('canvas');

    if (fullCanvas) {
        // PSD全体のサイズで書き出し
        canvas.width = psdData.width;
        canvas.height = psdData.height;
        const ctx = canvas.getContext('2d');
        
        const x = layer.left || 0;
        const y = layer.top || 0;
        
        if (layer.canvas) {
            ctx.drawImage(layer.canvas, x, y);
        }
    } else {
        // レイヤーサイズのみ
        canvas.width = layer.canvas.width;
        canvas.height = layer.canvas.height;
        const ctx = canvas.getContext('2d');
        
        if (layer.canvas) {
            ctx.drawImage(layer.canvas, 0, 0);
        }
    }

    return canvas;
}

// キャンバスをBlobに変換
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob(blob => resolve(blob), 'image/png');
    });
}

// レイヤー一覧テキスト書き出し
function exportLayerListText() {
    let text = `PSDファイル: ${psdFile.name}\n`;
    text += `サイズ: ${psdData.width}×${psdData.height}px\n`;
    text += `レイヤー数: ${layers.filter(l => !l.isFolder).length}\n\n`;
    text += '--- レイヤー一覧 ---\n\n';

    layers.forEach(layerInfo => {
        const indent = '  '.repeat(layerInfo.depth);
        if (layerInfo.isFolder) {
            text += `${indent}[📁] ${layerInfo.name}\n`;
        } else {
            text += `${indent}${String(layerInfo.number).padStart(3, '0')}：${layerInfo.name}\n`;
        }
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const filename = `${psdFile.name.replace('.psd', '')}.layers.txt`;
    saveAs(blob, filename);
}

// プログレス表示
function showProgress(percent, text) {
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    progressArea.style.display = 'block';
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text;
}

// プログレス非表示
function hideProgress() {
    document.getElementById('progressArea').style.display = 'none';
}

// ユーティリティ関数
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
