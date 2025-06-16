// HTML要素の取得
const apiKeyInput = document.getElementById('api-key-input');
const modelUrlInput = document.getElementById('model-url-input'); // index.htmlに追加したID
const saveSettingsButton = document.getElementById('save-settings-button'); // ID変更
const clearSettingsButton = document.getElementById('clear-settings-button'); // ID変更
const settingsStatus = document.getElementById('settings-status'); // ID変更
const apiKeySetup = document.getElementById('api-key-setup');
const chatArea = document.getElementById('chat-area');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

let currentApiKey = null;
let currentModelUrl = null; // 新しく追加: 現在使用するモデルURL

// --- 初期処理: ページのロード時に設定をチェック ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings(); // 関数名を変更
});

// --- 設定（APIキーとモデルURL）の保存・読み込み・クリア処理 ---

function loadSettings() { // 関数名を変更
    const storedKey = localStorage.getItem('gApiKey');
    const storedModelUrl = localStorage.getItem('gModelUrl'); // 新しく追加: ローカルストレージのキー名も変更

    if (storedKey && storedModelUrl) { // モデルURLのチェックを追加
        currentApiKey = storedKey;
        currentModelUrl = storedModelUrl;
        settingsStatus.textContent = 'Key & URL saved.'; // 簡略化されたテキスト
        apiKeySetup.style.display = 'none'; // キー入力エリアを非表示に
        chatArea.style.display = 'block';    // チャットエリアを表示
    } else {
        settingsStatus.textContent = 'Enter Key & URL.'; // 簡略化されたテキスト
        apiKeySetup.style.display = 'block'; // キー入力エリアを表示
        chatArea.style.display = 'none';     // チャットエリアを非表示
    }
}

saveSettingsButton.addEventListener('click', () => { // ID変更
    const key = apiKeyInput.value.trim();
    const modelUrl = modelUrlInput.value.trim(); // 新しく追加: モデルURLの取得

    if (key && modelUrl) { // モデルURLの入力もチェック
        localStorage.setItem('gApiKey', key);
        localStorage.setItem('gModelUrl', modelUrl); // 新しく追加: モデルURLをローカルストレージに保存
        apiKeyInput.value = ''; // 入力フィールドをクリア
        modelUrlInput.value = ''; // 新しく追加: モデルURL入力フィールドをクリア
        loadSettings(); // 保存された設定を再ロードし、UIを更新
        alert('Settings saved.'); // 簡略化されたテキスト
    } else {
        alert('Please enter both Key & URL.'); // 簡略化されたテキスト
    }
});

clearSettingsButton.addEventListener('click', () => { // ID変更
    localStorage.removeItem('gApiKey');
    localStorage.removeItem('gModelUrl'); // 新しく追加: モデルURLも削除
    currentApiKey = null;
    currentModelUrl = null; // 新しく追加: モデルURLもクリア
    loadSettings(); // UIを更新
    alert('Settings cleared.'); // 簡略化されたテキスト
});

// --- チャットロジック ---

// メッセージをチャットログに追加する関数
function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
    } else {
        messageDiv.classList.add('ai-message');
    }
    messageDiv.textContent = message;

    const wrapperDiv = document.createElement('div'); // メッセージを左右に配置するためのラッパー
    wrapperDiv.appendChild(messageDiv);
    chatLog.appendChild(wrapperDiv);

    chatLog.scrollTop = chatLog.scrollHeight; // スクロールを一番下へ
}

// ユーザーのメッセージ送信処理
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    if (!currentApiKey || !currentModelUrl) { // APIキーとモデルURLの両方をチェック
        alert('Key & URL not saved. Please save settings first.'); // 簡略化されたテキスト
        return;
    }

    appendMessage('user', message);
    userInput.value = ''; // 入力フィールドをクリア
    sendButton.disabled = true; // 送信ボタンを無効化 (二重送信防止)
    userInput.disabled = true;  // 入力フィールドも無効化

    try {
        // モデルURLとAPIキーを結合してリクエストURLを作成
        const requestUrl = `${currentModelUrl}?key=${currentApiKey}`; // API_ENDPOINTは不要になりました

        const response = await fetch(requestUrl, { // 動的に生成されたURLを使用
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: message }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData); // エラーメッセージを統一
            alert(`API Error: ${errorData.error.message || response.statusText}`); // 簡略化されたテキスト
            appendMessage('ai', `Error: ${errorData.error.message || response.statusText}`); // 簡略化されたテキスト
            return;
        }

        const data = await response.json();
        const aiResponse = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

        if (aiResponse) {
            appendMessage('ai', aiResponse);
        } else {
            appendMessage('ai', 'No response from AI.'); // 簡略化されたテキスト
            console.warn('No content received:', data);
        }

    } catch (error) {
        console.error('Network or other error:', error); // 簡略化されたテキスト
        appendMessage('ai', 'Network error. Check internet connection.'); // 簡略化されたテキスト
    } finally {
        sendButton.disabled = false; // 送信ボタンを有効化
        userInput.disabled = false;  // 入力フィールドを有効化
        userInput.focus();           // 入力フィールドにフォーカス
    }
}