// HTML要素の取得
const apiKeyInput = document.getElementById('api-key-input');
const modelUrlInput = document.getElementById('model-url-input');
const saveSettingsButton = document.getElementById('save-settings-button');
const clearSettingsButton = document.getElementById('clear-settings-button');
const settingsStatus = document.getElementById('settings-status');
const apiKeySetup = document.getElementById('api-key-setup');
const chatArea = document.getElementById('chat-area'); 
// const chatLog = document.getElementById('chat-log'); // ★この行は削除されていること！★
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
        chatArea.style.display = 'flex'; 
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

changeSettingsButton.addEventListener('click', () => {
    apiKeySetup.style.display = 'block';
    chatArea.style.display = 'none';
    apiKeyInput.value = currentApiKey || '';
    modelUrlInput.value = currentModelUrl || '';
    settingsStatus.textContent = 'Change Key & URL.';
});

function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (sender === 'user') {
        const escapedMessage = message.replace(/&/g, '&amp;')
                                   .replace(/</g, '&lt;')
                                   .replace(/>/g, '&gt;')
                                   .replace(/"/g, '&quot;')
                                   .replace(/'/g, '&#039;');
        messageDiv.innerHTML = escapedMessage.replace(/\n/g, '<br>');
    } else {
        // ★★★ここを最重要確認★★★ marked.parse()が使われているか
        messageDiv.innerHTML = marked.parse(message); 
    }

    const wrapperDiv = document.createElement('div'); 
    wrapperDiv.classList.add('message-wrapper');
    
    if (sender === 'user') {
        wrapperDiv.classList.add('user-message');
    } else {
        wrapperDiv.classList.add('ai-message');
    }

    wrapperDiv.appendChild(messageDiv);
    
    const inputArea = chatArea.querySelector('.input-area');
    chatArea.insertBefore(wrapperDiv, inputArea);

    chatArea.scrollTop = chatArea.scrollHeight;
}

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