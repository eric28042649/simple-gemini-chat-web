// --- 請將這裡替換成您 Cloudflare Worker 的實際網址 ---
const WORKER_URL = 'https://square-mountain-5ffb.eric10041004.workers.dev/';
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
    const loadingMessageElement = appendMessage('AI 正在思考中...', 'ai-loading'); // 使用特殊 class 標記

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
    messageElement.classList.add('message', `${senderType}-message`);
    if (senderType === 'ai-loading') {
        messageElement.classList.add('loading');
    }
    if (senderType === 'ai error') {
         messageElement.style.backgroundColor = '#ffdddd';
         messageElement.style.color = '#d8000c';
    }

    // 建立一個容器來放訊息內容
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('message-content'); // 給它一個 class 方便未來調整樣式

    // --- 主要修改處：判斷是否為 AI 訊息並使用 Marked.js ---
    if (senderType === 'ai' || senderType === 'ai-message') { // 檢查是否為標準的 AI 回覆訊息
        try {
            // 檢查 marked 函式庫是否已成功載入
            if (typeof marked === 'undefined') {
                 console.error("錯誤：Marked.js 函式庫未載入！");
                 contentContainer.textContent = text; // 若未載入，直接顯示純文字
            } else {
                 // 使用 Marked.js 將 Markdown 語法轉換成 HTML
                 // **安全性警告：** 這裡沒有對 AI 產生的 HTML 進行過濾。
                 // 如果擔心 AI 可能產生惡意程式碼，建議搭配使用 DOMPurify 等過濾函式庫。
                 // 例如: contentContainer.innerHTML = DOMPurify.sanitize(marked.parse(text));
                 // 目前為了簡單起見，我們先直接使用：
                 contentContainer.innerHTML = marked.parse(text);
            }
        } catch (e) {
            console.error("解析 Markdown 時發生錯誤:", e);
            contentContainer.textContent = text; // 若解析出錯，顯示純文字
        }
    } else {
        // 對於使用者訊息、載入中、錯誤訊息，直接顯示純文字
        // 使用 textContent 比 innerHTML 更安全 (避免非預期的 HTML 被渲染)
        contentContainer.textContent = text;
        // 如果您希望使用者輸入的換行也顯示出來，可以取消註解下面這行：
        // contentContainer.innerHTML = text.replace(/\n/g, '<br>');
    }
    // --- 修改結束 ---

    messageElement.appendChild(contentContainer); // 將內容容器加入訊息元素
    chatbox.appendChild(messageElement); // 將訊息元素加入聊天框
    chatbox.scrollTop = chatbox.scrollHeight; // 捲動到底部
    return messageElement;
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