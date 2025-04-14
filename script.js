// --- 請將這裡替換成您 Cloudflare Worker 的實際網址 ---
const WORKER_URL = 'YOUR_WORKER_URL_HERE';
// -----------------------------------------------------

const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 發送訊息的函數
async function sendMessage() {
    const messageText = userInput.value.trim(); // 獲取輸入並去除前後空白

    if (!messageText) {
        return; // 如果沒內容，不執行任何操作
    }

    // 1. 在聊天框顯示使用者訊息
    appendMessage(messageText, 'user');

    // 2. 清空輸入框
    userInput.value = '';

    // 3. 顯示 "AI 正在輸入..." 的提示
    const loadingMessageElement = appendMessage('AI 正在思考中...', 'ai loading'); // 使用特殊 class 標記

    try {
        // 4. 發送請求到 Cloudflare Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageText }), // 將使用者訊息包裝成 JSON
        });

        // 5. 移除 "AI 正在輸入..." 的提示
        chatbox.removeChild(loadingMessageElement);

        // 檢查回應狀態
        if (!response.ok) {
            // 如果 Worker 回傳錯誤 (例如 4xx, 5xx)
            const errorData = await response.json().catch(() => ({ reply: `發生錯誤：${response.status} ${response.statusText}` }));
            appendMessage(`抱歉，發生錯誤：${errorData.error || errorData.reply || '未知錯誤'}`, 'ai error');
            console.error('Worker response error:', response.status, response.statusText, errorData);
            return;
        }

        // 6. 解析 Worker 回傳的 JSON 資料
        const data = await response.json();

        // 7. 在聊天框顯示 AI 回覆
        if (data && data.reply) {
            appendMessage(data.reply, 'ai');
        } else {
            appendMessage('抱歉，收到了無法處理的回應。', 'ai error');
            console.error('Invalid response structure from Worker:', data);
        }

    } catch (error) {
        // 移除 "AI 正在輸入..." 的提示 (如果還在的話)
        if (chatbox.contains(loadingMessageElement)) {
             chatbox.removeChild(loadingMessageElement);
        }
        // 處理網路錯誤或其他 fetch 錯誤
        appendMessage('抱歉，無法連接到 AI 服務，請檢查網路連線或稍後再試。', 'ai error');
        console.error('Error sending message:', error);
    }
}

// 將訊息附加到聊天框的輔助函數
function appendMessage(text, senderType) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${senderType}-message`); // 添加基礎和特定類別 (例如 user-message, ai-message)
    if (senderType === 'ai loading') { // 如果是載入中訊息，添加特殊類別
        messageElement.classList.add('loading');
    }
    if (senderType === 'ai error') { // 如果是錯誤訊息
         messageElement.style.backgroundColor = '#ffdddd'; // 用不同背景標示錯誤
         messageElement.style.color = '#d8000c';
    }

    const paragraph = document.createElement('p');
    // 將換行符 \n 轉換為 <br> 標籤以在 HTML 中正確顯示換行
    paragraph.innerHTML = text.replace(/\n/g, '<br>');
    messageElement.appendChild(paragraph);

    chatbox.appendChild(messageElement);

    // 自動滾動到底部，顯示最新訊息
    chatbox.scrollTop = chatbox.scrollHeight;

    return messageElement; // 回傳創建的元素，方便後續操作 (例如移除 loading 訊息)
}

// --- 事件監聽 ---
// 點擊發送按鈕
sendButton.addEventListener('click', sendMessage);

// 在輸入框按下 Enter 鍵也發送訊息
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});