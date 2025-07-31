import * as vscode from 'vscode';
import { OllamaApi } from './ollamaApi';
import { OllamaModelManager } from './modelManager';
import { OllamaChatProvider } from './chatProvider';
import { OllamaCompletionProvider } from './completionProvider';

export class OllamaCommandManager {
    private ollamaApi: OllamaApi;
    private modelManager: OllamaModelManager;
    private chatProvider: OllamaChatProvider;
    private completionProvider: OllamaCompletionProvider;
    private completionsEnabled: boolean = true;

    constructor(
        ollamaApi: OllamaApi,
        modelManager: OllamaModelManager,
        chatProvider: OllamaChatProvider,
        completionProvider: OllamaCompletionProvider
    ) {
        this.ollamaApi = ollamaApi;
        this.modelManager = modelManager;
        this.chatProvider = chatProvider;
        this.completionProvider = completionProvider;
        
        // Initialize completion state from config
        const config = vscode.workspace.getConfiguration('ollama');
        this.completionsEnabled = config.get<boolean>('completions.enabled', true);
    }

    registerCommands(context: vscode.ExtensionContext): void {
        // Register all commands
        const commands = [
            vscode.commands.registerCommand('ollama.openChat', this.openChat.bind(this)),
            vscode.commands.registerCommand('ollama.selectModel', this.selectModel.bind(this)),
            vscode.commands.registerCommand('ollama.toggleCompletions', this.toggleCompletions.bind(this)),
            vscode.commands.registerCommand('ollama.clearChat', this.clearChat.bind(this)),
            vscode.commands.registerCommand('ollama.checkConnection', this.checkConnection.bind(this)),
            vscode.commands.registerCommand('ollama.explainCode', this.explainCode.bind(this)),
            vscode.commands.registerCommand('ollama.improveCode', this.improveCode.bind(this)),
            vscode.commands.registerCommand('ollama.generateDocstring', this.generateDocstring.bind(this)),
            vscode.commands.registerCommand('ollama.askQuestion', this.askQuestion.bind(this))
        ];

        // Add all commands to context subscriptions
        commands.forEach(command => context.subscriptions.push(command));
    }

    private async openChat(): Promise<void> {
        try {
            await vscode.commands.executeCommand('workbench.view.explorer');
            await vscode.commands.executeCommand('ollamaChat.focus');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open chat: ${error}`);
        }
    }

    private async selectModel(): Promise<void> {
        await this.modelManager.selectModel();
    }

    private async toggleCompletions(): Promise<void> {
        this.completionsEnabled = !this.completionsEnabled;
        this.completionProvider.setEnabled(this.completionsEnabled);
        
        // Update configuration
        const config = vscode.workspace.getConfiguration('ollama');
        await config.update('completions.enabled', this.completionsEnabled, vscode.ConfigurationTarget.Global);
        
        const status = this.completionsEnabled ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Ollama code completions ${status}`);
    }

    private clearChat(): void {
        this.chatProvider.clearChat();
    }

    private async checkConnection(): Promise<void> {
        await this.modelManager.showConnectionStatus();
    }

    private async explainCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText.trim()) {
            vscode.window.showWarningMessage('Please select some code to explain');
            return;
        }

        const language = editor.document.languageId;
        const prompt = `Explain this ${language} code in detail:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        
        await this.sendToChat(prompt);
    }

    private async improveCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText.trim()) {
            vscode.window.showWarningMessage('Please select some code to improve');
            return;
        }

        const language = editor.document.languageId;
        const prompt = `Suggest improvements for this ${language} code. Consider performance, readability, best practices, and potential bugs:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        
        await this.sendToChat(prompt);
    }

    private async generateDocstring(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        if (!selectedText.trim()) {
            vscode.window.showWarningMessage('Please select a function or method to document');
            return;
        }

        const language = editor.document.languageId;
        let docstringStyle = '';
        
        switch (language) {
            case 'python':
                docstringStyle = 'Python docstring (Google style)';
                break;
            case 'javascript':
            case 'typescript':
                docstringStyle = 'JSDoc comment';
                break;
            case 'java':
                docstringStyle = 'Javadoc comment';
                break;
            case 'csharp':
                docstringStyle = 'XML documentation comment';
                break;
            default:
                docstringStyle = 'appropriate documentation comment';
        }

        const prompt = `Generate a comprehensive ${docstringStyle} for this ${language} code. Include parameter descriptions, return value, and any important notes:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        
        await this.sendToChat(prompt);
    }

    private async askQuestion(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        let contextPrompt = '';
        
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (selectedText.trim()) {
                const language = editor.document.languageId;
                contextPrompt = `\n\nContext (${language} code):\n\`\`\`${language}\n${selectedText}\n\`\`\``;
            }
        }

        const question = await vscode.window.showInputBox({
            prompt: 'Ask Ollama a question',
            placeHolder: 'What would you like to know?'
        });

        if (question && question.trim()) {
            const fullPrompt = question.trim() + contextPrompt;
            await this.sendToChat(fullPrompt);
        }
    }

    private async sendToChat(message: string): Promise<void> {
        // Open chat panel
        await this.openChat();
        
        // Send message to chat
        // Note: In a real implementation, you'd need to expose a method in chatProvider
        // to programmatically send messages. For now, we'll show the message to copy/paste
        vscode.window.showInformationMessage(
            'Chat opened. Please paste this message:',
            'Copy Message'
        ).then(selection => {
            if (selection === 'Copy Message') {
                vscode.env.clipboard.writeText(message);
            }
        });
    }
}

// Context menu commands for editor
export function registerEditorCommands(context: vscode.ExtensionContext): void {
    // Add context menu items for code actions
    const editorCommands = [
        vscode.commands.registerCommand('ollama.explainSelection', async () => {
            vscode.commands.executeCommand('ollama.explainCode');
        }),
        vscode.commands.registerCommand('ollama.improveSelection', async () => {
            vscode.commands.executeCommand('ollama.improveCode');
        }),
        vscode.commands.registerCommand('ollama.documentSelection', async () => {
            vscode.commands.executeCommand('ollama.generateDocstring');
        })
    ];

    editorCommands.forEach(command => context.subscriptions.push(command));
}