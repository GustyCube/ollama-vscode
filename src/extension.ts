import * as vscode from 'vscode';
import { OllamaApi } from './ollamaApi';
import { OllamaCompletionProvider } from './completionProvider';
import { OllamaChatProvider } from './chatProvider';
import { OllamaModelManager, OllamaConfigurationProvider } from './modelManager';
import { OllamaCommandManager, registerEditorCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Ollama extension...');

    try {
        // Initialize configuration
        await OllamaConfigurationProvider.initializeConfiguration();
        
        // Create core services
        const ollamaApi = new OllamaApi();
        const completionProvider = new OllamaCompletionProvider(ollamaApi);
        const chatProvider = new OllamaChatProvider(context.extensionUri, ollamaApi);
        const modelManager = new OllamaModelManager(ollamaApi);
        
        // Register completion provider for all supported languages
        const supportedLanguages = [
            'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c',
            'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'r',
            'html', 'css', 'scss', 'less', 'json', 'yaml', 'xml', 'markdown',
            'dockerfile', 'makefile', 'shellscript', 'powershell', 'sql'
        ];
        
        const completionDisposable = vscode.languages.registerInlineCompletionItemProvider(
            supportedLanguages,
            completionProvider
        );
        context.subscriptions.push(completionDisposable);
        
        // Register chat provider
        const chatDisposable = vscode.window.registerWebviewViewProvider(
            OllamaChatProvider.viewType,
            chatProvider
        );
        context.subscriptions.push(chatDisposable);
        
        // Create command manager and register commands
        const commandManager = new OllamaCommandManager(
            ollamaApi,
            modelManager,
            chatProvider,
            completionProvider
        );
        commandManager.registerCommands(context);
        
        // Register editor commands
        registerEditorCommands(context);
        
        // Register configuration watcher
        const configWatcher = OllamaConfigurationProvider.registerConfigurationWatcher();
        context.subscriptions.push(configWatcher);
        
        // Set context for conditional UI elements
        vscode.commands.executeCommand('setContext', 'ollamaEnabled', true);
        
        // Check initial connection status
        setTimeout(async () => {
            const isHealthy = await modelManager.checkOllamaConnection();
            if (!isHealthy) {
                vscode.window.showWarningMessage(
                    'Ollama is not running. Please start Ollama to use AI features.',
                    'Check Connection'
                ).then(selection => {
                    if (selection === 'Check Connection') {
                        vscode.commands.executeCommand('ollama.checkConnection');
                    }
                });
            }
        }, 2000);
        
        console.log('Ollama extension activated successfully!');
        
    } catch (error) {
        console.error('Failed to activate Ollama extension:', error);
        vscode.window.showErrorMessage(
            `Failed to activate Ollama extension: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export function deactivate() {
    console.log('Deactivating Ollama extension...');
    // Cleanup is handled by VS Code disposing of registered subscriptions
}