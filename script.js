// HTML要素の取得
const apiKeyInput = document.getElementById('api-key-input');
const modelUrlInput = document.getElementById('model-url-input');
const saveSettingsButton = document.getElementById('save-settings-button');
const clearSettingsButton = document.getElementById('clear-settings-button');
const settingsStatus = document.getElementById('settings-status');
const apiKeySetup = document.getElementById('api-key-setup');
const chatArea = document.getElementById('chat-area');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const changeSettingsButton = document.getElementById('change-settings-button');

let currentApiKey = null;
let currentModelUrl = null;

// --- 初期処理: ページのロード時に設定をチェック ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

// --- 設定（APIキーとモデルURL）の保存・読み込み・クリア処理 ---

function loadSettings() {
    const storedKey = localStorage.getItem('gApiKey');
    const storedModelUrl = localStorage.getItem('gModelUrl');

    if (storedKey && storedModelUrl) {
        currentApiKey = storedKey;
        currentModelUrl = storedModelUrl;
        settingsStatus.textContent = 'Key & URL saved.';
        apiKeySetup.style.display = 'none';
        chatArea.style.display = 'block';
    } else {
        settingsStatus.textContent = 'Enter Key & URL.';
        apiKeySetup.style.display = 'block';
        chatArea.style.display = 'none';
    }
}

saveSettingsButton.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    const modelUrl = modelUrlInput.value.trim();

    if (key && modelUrl) {
        localStorage.setItem('gApiKey', key);
        localStorage.setItem('gModelUrl', modelUrl);
        apiKeyInput.value = '';
        modelUrlInput.value = '';
        loadSettings();
        alert('Settings saved.');
    } else {
        alert('Please enter both Key & URL.');
    }
});

clearSettingsButton.addEventListener('click', () => {
    localStorage.removeItem('gApiKey');
    localStorage.removeItem('gModelUrl');
    currentApiKey = null;
    currentModelUrl = null;
    loadSettings();
    alert('Settings cleared.');
});

// --- 設定変更ボタンのクリックイベント ---
changeSettingsButton.addEventListener('click', () => {
    apiKeySetup.style.display = 'block';
    chatArea.style.display = 'none';
    apiKeyInput.value = currentApiKey || '';
    modelUrlInput.value = currentModelUrl || '';
    settingsStatus.textContent = 'Change Key & URL.';
});

// --- チャットロジック ---

/**
 * Markdown形式のテキストをHTMLに変換する簡易関数
 * 全てのMarkdownを完璧にカバーするものではありませんが、一般的な改行、太字、コードブロックに対応します。
 */
function convertMarkdownToHtml(markdownText) {
    let htmlText = markdownText;

    // コードブロック (```language ... ```)
    htmlText = htmlText.replace(/```(.*?)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
        // HTMLエンティティに変換してから<pre><code>で囲む
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre><code class="language-${lang || ''}">${escapedCode}</code></pre>`;
    });

    // 見出し (### ...) - h3を例に
    htmlText = htmlText.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
    htmlText = htmlText.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
    htmlText = htmlText.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');

    // 太字 (**)
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 改行を <br> に（ただし、既にHTMLタグ内の場合は除く）
    // 段落を考慮し、連続する改行は<p>タグに、単一の改行は<br>に変換
    // これが少し複雑なので、まずはシンプルな改行のみを対応
    // Pタグを考慮した処理
    htmlText = htmlText.split('\n\n').map(p => {
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
    
    // リスト (-, *, +)
    htmlText = htmlText.replace(/^(-|\*|\+)\s+(.*)$/gm, '<li>$2</li>');
    if (htmlText.includes('<li>')) {
        htmlText = `<ul>${htmlText}</ul>`;
        htmlText = htmlText.replace(/<\/ul><li>/g, '<li>'); // <li>がulの外に出てしまうのを修正
    }
    
    return htmlText;
}


// メッセージをチャットログに追加する関数
function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.textContent = message; // ユーザーメッセージは純粋なテキストとして表示
    } else {
        messageDiv.classList.add('ai-message');
        // AIメッセージはMarkdownをHTMLに変換して表示
        messageDiv.innerHTML = convertMarkdownToHtml(message); 
    }

    const wrapperDiv = document.createElement('div');
    wrapperDiv.appendChild(messageDiv);
    chatLog.appendChild(wrapperDiv);

    chatLog.scrollTop = chatLog.scrollHeight;
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

    if (!currentApiKey || !currentModelUrl) {
        alert('Key & URL not saved. Please save settings first.');
        return;
    }

    appendMessage('user', message);
    userInput.value = '';
    sendButton.disabled = true;
    userInput.disabled = true;

    try {
        const requestUrl = `${currentModelUrl}?key=${currentApiKey}`;

        const response = await fetch(requestUrl, {
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
            alert(`API Error: ${errorData.error.message || response.statusText}`);
            appendMessage('ai', `Error: ${errorData.error.message || response.statusText}`);
            return;
        }

        const data = await response.json();
        const aiResponse = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

        if (aiResponse) {
            appendMessage('ai', aiResponse);
        } else {
            appendMessage('ai', 'No response from AI.');
            console.warn('No content received:', data);
        }

    } catch (error) {
        console.error('Network or other error:', error);
        appendMessage('ai', 'Network error. Check internet connection.');
    } finally {
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}