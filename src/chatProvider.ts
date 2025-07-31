import * as vscode from 'vscode';
import { OllamaApi, OllamaMessage } from './ollamaApi';

export class OllamaChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ollamaChat';
    
    private _view?: vscode.WebviewView;
    private ollamaApi: OllamaApi;
    private chatHistory: OllamaMessage[] = [];
    private maxHistory: number = 20;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        ollamaApi: OllamaApi
    ) {
        this.ollamaApi = ollamaApi;
        this.updateConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('ollama')) {
                this.updateConfig();
            }
        });
    }

    private updateConfig() {
        const config = vscode.workspace.getConfiguration('ollama');
        this.maxHistory = config.get<number>('chat.maxHistory', 20);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleSendMessage(data.message);
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
                case 'selectModel':
                    await this.selectModel();
                    break;
            }
        });
    }

    private async handleSendMessage(userMessage: string) {
        if (!userMessage.trim()) {
            return;
        }

        // Add user message to history
        const userMsg: OllamaMessage = {
            role: 'user',
            content: userMessage.trim()
        };
        
        this.addMessageToHistory(userMsg);
        this.updateWebview();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Prepare messages for API call
            const messages = [...this.chatHistory];
            
            // Stream the response
            let assistantMessage = '';
            const assistantMsg: OllamaMessage = {
                role: 'assistant',
                content: ''
            };
            
            this.addMessageToHistory(assistantMsg);

            await this.ollamaApi.streamChatCompletion(
                {
                    model: this.ollamaApi.getDefaultModel(),
                    messages: messages,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9
                    }
                },
                (chunk: string) => {
                    assistantMessage += chunk;
                    // Update the last message in history
                    if (this.chatHistory.length > 0) {
                        this.chatHistory[this.chatHistory.length - 1].content = assistantMessage;
                    }
                    this.updateWebview();
                }
            );

            // Ensure the final message is set
            if (this.chatHistory.length > 0) {
                this.chatHistory[this.chatHistory.length - 1].content = assistantMessage;
            }

        } catch (error) {
            console.error('Chat error:', error);
            
            // Remove the empty assistant message and show error
            if (this.chatHistory.length > 0 && this.chatHistory[this.chatHistory.length - 1].role === 'assistant') {
                this.chatHistory.pop();
            }
            
            const errorMsg: OllamaMessage = {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
            };
            
            this.addMessageToHistory(errorMsg);
        }

        this.hideTypingIndicator();
        this.updateWebview();
    }

    private addMessageToHistory(message: OllamaMessage) {
        this.chatHistory.push(message);
        
        // Trim history if it exceeds max length
        if (this.chatHistory.length > this.maxHistory * 2) { // *2 because each exchange has user + assistant
            this.chatHistory = this.chatHistory.slice(-this.maxHistory * 2);
        }
    }

    private showTypingIndicator() {
        this._view?.webview.postMessage({
            type: 'showTyping'
        });
    }

    private hideTypingIndicator() {
        this._view?.webview.postMessage({
            type: 'hideTyping'
        });
    }

    private updateWebview() {
        this._view?.webview.postMessage({
            type: 'updateMessages',
            messages: this.chatHistory
        });
    }

    public clearChat() {
        this.chatHistory = [];
        this.updateWebview();
        vscode.window.showInformationMessage('Chat history cleared');
    }

    private async selectModel() {
        try {
            const models = await this.ollamaApi.getModels();
            const modelNames = models.map(m => m.name);
            
            if (modelNames.length === 0) {
                vscode.window.showWarningMessage('No Ollama models found. Please ensure Ollama is running and has models installed.');
                return;
            }

            const selected = await vscode.window.showQuickPick(modelNames, {
                placeHolder: 'Select an Ollama model'
            });

            if (selected) {
                const config = vscode.workspace.getConfiguration('ollama');
                await config.update('model', selected, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Model changed to: ${selected}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load models: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ollama Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h3 {
            margin: 0;
            font-size: 14px;
        }
        
        .header-buttons {
            display: flex;
            gap: 5px;
        }
        
        .header-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
            border-radius: 2px;
        }
        
        .header-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .message {
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 85%;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        
        .user-message {
            background-color: var(--vscode-inputValidation-infoBorder);
            color: var(--vscode-input-foreground);
            align-self: flex-end;
            margin-left: auto;
        }
        
        .assistant-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            color: var(--vscode-editor-foreground);
            align-self: flex-start;
        }
        
        .typing-indicator {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            color: var(--vscode-editor-foreground);
            align-self: flex-start;
            padding: 8px 12px;
            border-radius: 8px;
            font-style: italic;
            opacity: 0.7;
        }
        
        .input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-widget-border);
            display: flex;
            gap: 8px;
        }
        
        .message-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            min-height: 36px;
            max-height: 120px;
        }
        
        .message-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            border-radius: 2px;
        }
        
        .send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            gap: 10px;
        }
        
        .empty-state h4 {
            margin: 0;
            font-size: 16px;
        }
        
        .empty-state p {
            margin: 0;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Ollama Chat</h3>
        <div class="header-buttons">
            <button class="header-button" onclick="selectModel()">Model</button>
            <button class="header-button" onclick="clearChat()">Clear</button>
        </div>
    </div>
    
    <div class="messages" id="messages">
        <div class="empty-state">
            <h4>Welcome to Ollama Chat</h4>
            <p>Start a conversation with your AI assistant</p>
        </div>
    </div>
    
    <div class="input-container">
        <textarea 
            class="message-input" 
            id="messageInput" 
            placeholder="Type your message here..." 
            rows="1"
        ></textarea>
        <button class="send-button" id="sendButton" onclick="sendMessage()">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messages = [];
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateMessages':
                    messages = message.messages;
                    updateMessagesView();
                    break;
                case 'showTyping':
                    showTypingIndicator();
                    break;
                case 'hideTyping':
                    hideTypingIndicator();
                    break;
            }
        });
        
        function updateMessagesView() {
            const messagesContainer = document.getElementById('messages');
            
            if (messages.length === 0) {
                messagesContainer.innerHTML = \`
                    <div class="empty-state">
                        <h4>Welcome to Ollama Chat</h4>
                        <p>Start a conversation with your AI assistant</p>
                    </div>
                \`;
                return;
            }
            
            messagesContainer.innerHTML = '';
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${msg.role === 'user' ? 'user-message' : 'assistant-message'}\`;
                messageDiv.textContent = msg.content;
                messagesContainer.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function showTypingIndicator() {
            const messagesContainer = document.getElementById('messages');
            const existingIndicator = document.querySelector('.typing-indicator');
            
            if (!existingIndicator) {
                const typingDiv = document.createElement('div');
                typingDiv.className = 'typing-indicator';
                typingDiv.textContent = 'Ollama is typing...';
                messagesContainer.appendChild(typingDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        
        function hideTypingIndicator() {
            const indicator = document.querySelector('.typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message) {
                vscode.postMessage({
                    type: 'sendMessage',
                    message: message
                });
                input.value = '';
                adjustTextareaHeight();
            }
        }
        
        function clearChat() {
            vscode.postMessage({
                type: 'clearChat'
            });
        }
        
        function selectModel() {
            vscode.postMessage({
                type: 'selectModel'
            });
        }
        
        function adjustTextareaHeight() {
            const textarea = document.getElementById('messageInput');
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
        
        // Event listeners
        document.getElementById('messageInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        document.getElementById('messageInput').addEventListener('input', adjustTextareaHeight);
        
        // Initialize
        adjustTextareaHeight();
    </script>
</body>
</html>`;
    }
}