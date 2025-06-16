// ==========================================================
// ** 重要: 以下のAPIキーは、ユーザーが入力するキーです。
// ** ここに直接Gemini APIキーをハードコードしないでください！
// ==========================================================

// Gemini APIのURL（Google AI Studioでモデルを選択して「APIを使用」で確認できます）
// gemini-pro の場合: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key='; // APIキーは後で追加

// HTML要素の取得
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyButton = document.getElementById('save-api-key-button');
const clearApiKeyButton = document.getElementById('clear-api-key-button');
const apiKeyStatus = document.getElementById('api-key-status');
const apiKeySetup = document.getElementById('api-key-setup');
const chatArea = document.getElementById('chat-area');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

let currentApiKey = null; // 現在使用するAPIキー

// === 初期処理: ページのロード時にAPIキーをチェック ===
document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
});

// === APIキーの保存・読み込み・クリア処理 ===

function loadApiKey() {
    const storedKey = localStorage.getItem('geminiApiKey');
    if (storedKey) {
        currentApiKey = storedKey;
        apiKeyStatus.textContent = 'APIキーが保存されています。';
        apiKeySetup.style.display = 'none'; // APIキー入力エリアを非表示に
        chatArea.style.display = 'block';    // チャットエリアを表示
    } else {
        apiKeyStatus.textContent = 'APIキーが保存されていません。';
        apiKeySetup.style.display = 'block'; // APIキー入力エリアを表示
        chatArea.style.display = 'none';     // チャットエリアを非表示
    }
}

saveApiKeyButton.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        apiKeyInput.value = ''; // 入力フィールドをクリア
        loadApiKey(); // 保存されたキーを再ロードし、UIを更新
        alert('APIキーが保存されました。');
    } else {
        alert('APIキーを入力してください。');
    }
});

clearApiKeyButton.addEventListener('click', () => {
    localStorage.removeItem('geminiApiKey');
    currentApiKey = null;
    loadApiKey(); // UIを更新
    alert('APIキーがクリアされました。');
});

// === チャットロジック ===

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

    if (!currentApiKey) {
        alert('APIキーが保存されていません。先にAPIキーを保存してください。');
        return;
    }

    appendMessage('user', message);
    userInput.value = ''; // 入力フィールドをクリア
    sendButton.disabled = true; // 送信ボタンを無効化 (二重送信防止)
    userInput.disabled = true;  // 入力フィールドも無効化

    try {
        const response = await fetch(GEMINI_API_ENDPOINT + currentApiKey, {
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
            console.error('API Error:', errorData);
            alert(`APIエラーが発生しました: ${errorData.error.message || response.statusText}`);
            appendMessage('ai', `エラー: ${errorData.error.message || response.statusText}`);
            return;
        }

        const data = await response.json();
        const aiResponse = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

        if (aiResponse) {
            appendMessage('ai', aiResponse);
        } else {
            appendMessage('ai', 'Geminiからの応答がありませんでした。');
            console.warn('No content received from Gemini:', data);
        }

    } catch (error) {
        console.error('ネットワークまたはその他のエラー:', error);
        appendMessage('ai', '通信エラーが発生しました。インターネット接続を確認してください。');
    } finally {
        sendButton.disabled = false; // 送信ボタンを有効化
        userInput.disabled = false;  // 入力フィールドを有効化
        userInput.focus();           // 入力フィールドにフォーカス
    }
}