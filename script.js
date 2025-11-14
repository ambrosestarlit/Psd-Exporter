// PSD Layer Exporter - Main Script
// by Ambrose Starlit

class PsdLayerExporter {
    constructor() {
        this.psdFile = null;
        this.psdData = null;
        this.layers = [];
        this.selectedLayers = new Set();
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // UI Elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        
        this.layersSection = document.getElementById('layersSection');
        this.layersContainer = document.getElementById('layersContainer');
        this.exportSection = document.getElementById('exportSection');
        
        this.selectAllBtn = document.getElementById('selectAllBtn');
        this.deselectAllBtn = document.getElementById('deselectAllBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.exportListBtn = document.getElementById('exportListBtn');
        
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        this.resultSection = document.getElementById('resultSection');
        this.resultList = document.getElementById('resultList');
        this.completeSound = document.getElementById('completeSound');
    }

    attachEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.fileInput.files = e.dataTransfer.files;
                this.handleFileSelect({ target: this.fileInput });
            }
        });
        
        // Button events
        this.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.deselectAllBtn.addEventListener('click', () => this.deselectAll());
        this.exportBtn.addEventListener('click', () => this.startExport());
        this.exportListBtn.addEventListener('click', () => this.exportLayerList());
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith('.psd')) {
            this.showMessage('PSDファイルを選択してください');
            return;
        }

        this.psdFile = file;
        this.showProgress(0, 'PSDファイルを読み込み中...');
        
        try {
            // ファイル情報を表示
            this.fileName.textContent = file.name;
            this.fileSize.textContent = this.formatFileSize(file.size);
            this.fileInfo.style.display = 'flex';
            
            // PSDファイルを読み込み
            const arrayBuffer = await file.arrayBuffer();
            this.psdData = await window.AG_PSD.readPsd(new Uint8Array(arrayBuffer));
            
            this.canvasWidth = this.psdData.width;
            this.canvasHeight = this.psdData.height;
            
            console.log('PSD loaded:', this.psdData);
            
            // レイヤーを解析
            this.parseLayers();
            
            // UIを表示
            this.layersSection.style.display = 'block';
            this.exportSection.style.display = 'block';
            this.progressSection.style.display = 'none';
            
            this.showMessage(`PSDファイルを読み込みました (${this.canvasWidth}×${this.canvasHeight}px)`);
            
        } catch (error) {
            console.error('PSD読み込みエラー:', error);
            this.showMessage('PSDファイルの読み込みに失敗しました: ' + error.message);
            this.progressSection.style.display = 'none';
        }
    }

    parseLayers() {
        this.layers = [];
        this.selectedLayers.clear();
        let layerNumber = 0;
        
        const parseLayerRecursive = (layer, depth = 0) => {
            if (layer.children && layer.children.length > 0) {
                // フォルダ
                this.layers.push({
                    name: layer.name || 'グループ',
                    isFolder: true,
                    depth: depth,
                    number: 0
                });
                
                // 子レイヤーを再帰的に処理（逆順）
                for (let i = layer.children.length - 1; i >= 0; i--) {
                    parseLayerRecursive(layer.children[i], depth + 1);
                }
            } else {
                // 通常レイヤー
                if (layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0) {
                    layerNumber++;
                    this.layers.push({
                        name: layer.name || `レイヤー${layerNumber}`,
                        isFolder: false,
                        depth: depth,
                        number: layerNumber,
                        layer: layer
                    });
                }
            }
        };
        
        // ルートレイヤーを処理（逆順）
        if (this.psdData.children) {
            for (let i = this.psdData.children.length - 1; i >= 0; i--) {
                parseLayerRecursive(this.psdData.children[i]);
            }
        }
        
        this.renderLayers();
    }

    renderLayers() {
        this.layersContainer.innerHTML = '';
        
        this.layers.forEach((layerInfo, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item' + (layerInfo.isFolder ? ' folder' : '');
            layerItem.style.paddingLeft = `${15 + layerInfo.depth * 25}px`;
            
            if (layerInfo.isFolder) {
                // フォルダ
                layerItem.innerHTML = `
                    <span class="layer-icon">📁</span>
                    <span class="layer-name">${this.escapeHtml(layerInfo.name)}</span>
                `;
            } else {
                // 通常レイヤー
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'layer-checkbox';
                checkbox.dataset.index = index;
                checkbox.addEventListener('change', (e) => this.handleLayerSelect(e));
                
                const icon = document.createElement('span');
                icon.className = 'layer-icon';
                icon.textContent = '🖼️';
                
                const name = document.createElement('span');
                name.className = 'layer-name';
                name.textContent = layerInfo.name;
                
                const number = document.createElement('span');
                number.className = 'layer-number';
                number.textContent = `#${String(layerInfo.number).padStart(3, '0')}`;
                
                layerItem.appendChild(checkbox);
                layerItem.appendChild(icon);
                layerItem.appendChild(name);
                layerItem.appendChild(number);
                
                layerItem.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            }
            
            this.layersContainer.appendChild(layerItem);
        });
    }

    handleLayerSelect(event) {
        const index = parseInt(event.target.dataset.index);
        const layerInfo = this.layers[index];
        
        if (event.target.checked) {
            this.selectedLayers.add(index);
            event.target.closest('.layer-item').classList.add('selected');
        } else {
            this.selectedLayers.delete(index);
            event.target.closest('.layer-item').classList.remove('selected');
        }
        
        this.exportBtn.disabled = this.selectedLayers.size === 0;
    }

    selectAll() {
        this.layers.forEach((layerInfo, index) => {
            if (!layerInfo.isFolder) {
                this.selectedLayers.add(index);
            }
        });
        this.updateSelection();
    }

    deselectAll() {
        this.selectedLayers.clear();
        this.updateSelection();
    }

    updateSelection() {
        const checkboxes = this.layersContainer.querySelectorAll('.layer-checkbox');
        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            checkbox.checked = this.selectedLayers.has(index);
            const item = checkbox.closest('.layer-item');
            if (checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        this.exportBtn.disabled = this.selectedLayers.size === 0;
    }

    async startExport() {
        const exportMode = document.querySelector('input[name="exportMode"]:checked').value;
        
        this.resultSection.style.display = 'none';
        this.progressSection.style.display = 'block';
        
        try {
            if (exportMode === 'individual') {
                await this.exportIndividual();
            } else {
                await this.exportMerged();
            }
            
            // 完了音を再生
            try {
                await this.completeSound.play();
            } catch (e) {
                console.log('音声再生エラー:', e);
            }
            
        } catch (error) {
            console.error('書き出しエラー:', error);
            this.showMessage('書き出し中にエラーが発生しました: ' + error.message);
        } finally {
            this.progressSection.style.display = 'none';
        }
    }

    async exportIndividual() {
        const selectedIndices = Array.from(this.selectedLayers);
        const total = selectedIndices.length;
        const results = [];
        
        for (let i = 0; i < total; i++) {
            const index = selectedIndices[i];
            const layerInfo = this.layers[index];
            
            this.showProgress((i / total) * 100, `${i + 1}/${total} レイヤーを書き出し中...`);
            
            try {
                const canvas = await this.renderLayerToCanvas(layerInfo.layer);
                const blob = await this.canvasToBlob(canvas);
                const filename = `${String(layerInfo.number).padStart(3, '0')}：${layerInfo.name}.png`;
                
                results.push({ filename, blob });
                
            } catch (error) {
                console.error(`レイヤー ${layerInfo.name} の書き出しエラー:`, error);
            }
        }
        
        this.showProgress(100, '書き出し完了！');
        
        // ZIPファイルにまとめる
        if (results.length > 1) {
            await this.createZipAndDownload(results);
        } else if (results.length === 1) {
            this.downloadFile(results[0].blob, results[0].filename);
        }
        
        this.showResults(results);
    }

    async exportMerged() {
        this.showProgress(0, '統合画像を作成中...');
        
        const selectedIndices = Array.from(this.selectedLayers).sort((a, b) => {
            return this.layers[b].number - this.layers[a].number;
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
        const ctx = canvas.getContext('2d');
        
        const total = selectedIndices.length;
        for (let i = 0; i < total; i++) {
            const index = selectedIndices[i];
            const layerInfo = this.layers[index];
            
            this.showProgress((i / total) * 100, `${i + 1}/${total} レイヤーを合成中...`);
            
            try {
                const layerCanvas = await this.renderLayerToCanvas(layerInfo.layer, false);
                const layer = layerInfo.layer;
                
                // レイヤーの位置を取得
                const x = layer.left || 0;
                const y = layer.top || 0;
                
                ctx.drawImage(layerCanvas, x, y);
                
            } catch (error) {
                console.error(`レイヤー ${layerInfo.name} の合成エラー:`, error);
            }
        }
        
        this.showProgress(100, '統合完了！');
        
        const blob = await this.canvasToBlob(canvas);
        const filename = `${this.psdFile.name.replace('.psd', '')}_merged.png`;
        
        this.downloadFile(blob, filename);
        this.showResults([{ filename, blob }]);
    }

    async renderLayerToCanvas(layer, useFullCanvas = true) {
        const canvas = document.createElement('canvas');
        
        if (useFullCanvas) {
            // フルキャンバスサイズで書き出し
            canvas.width = this.canvasWidth;
            canvas.height = this.canvasHeight;
            const ctx = canvas.getContext('2d');
            
            const x = layer.left || 0;
            const y = layer.top || 0;
            
            if (layer.canvas) {
                ctx.drawImage(layer.canvas, x, y);
            }
        } else {
            // レイヤーサイズのみ
            if (layer.canvas) {
                canvas.width = layer.canvas.width;
                canvas.height = layer.canvas.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(layer.canvas, 0, 0);
            }
        }
        
        return canvas;
    }

    canvasToBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    }

    async createZipAndDownload(results) {
        const zip = new JSZip();
        
        results.forEach(result => {
            zip.file(result.filename, result.blob);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `${this.psdFile.name.replace('.psd', '')}_layers.zip`;
        
        this.downloadFile(zipBlob, zipFilename);
    }

    downloadFile(blob, filename) {
        saveAs(blob, filename);
    }

    exportLayerList() {
        let text = `PSDファイル: ${this.psdFile.name}\n`;
        text += `サイズ: ${this.canvasWidth}×${this.canvasHeight}px\n`;
        text += `レイヤー数: ${this.layers.filter(l => !l.isFolder).length}\n\n`;
        text += '--- レイヤー一覧 ---\n\n';
        
        this.layers.forEach(layerInfo => {
            const indent = '  '.repeat(layerInfo.depth);
            if (layerInfo.isFolder) {
                text += `${indent}[📁] ${layerInfo.name}\n`;
            } else {
                text += `${indent}${String(layerInfo.number).padStart(3, '0')}：${layerInfo.name}\n`;
            }
        });
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const filename = `${this.psdFile.name.replace('.psd', '')}.layers.txt`;
        this.downloadFile(blob, filename);
    }

    showResults(results) {
        this.resultSection.style.display = 'block';
        this.resultList.innerHTML = '';
        
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            const name = document.createElement('span');
            name.className = 'result-name';
            name.textContent = result.filename;
            
            item.appendChild(name);
            this.resultList.appendChild(item);
        });
    }

    showProgress(percent, text) {
        this.progressSection.style.display = 'block';
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    showMessage(message) {
        console.log(message);
        // 必要に応じてトースト通知などを実装
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new PsdLayerExporter();
});
