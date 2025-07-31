import * as vscode from 'vscode';
import { OllamaApi, OllamaModel } from './ollamaApi';

export class OllamaModelManager {
    private ollamaApi: OllamaApi;
    private statusBarItem: vscode.StatusBarItem;

    constructor(ollamaApi: OllamaApi) {
        this.ollamaApi = ollamaApi;
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'ollama.selectModel';
        this.statusBarItem.tooltip = 'Click to select Ollama model';
        
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('ollama.model')) {
                this.updateStatusBar();
            }
        });
    }

    private updateStatusBar() {
        const currentModel = this.ollamaApi.getDefaultModel();
        this.statusBarItem.text = `$(robot) ${currentModel}`;
    }

    async selectModel(): Promise<void> {
        try {
            // Show loading
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: 'Loading Ollama models...',
                cancellable: false
            }, async () => {
                const models = await this.ollamaApi.getModels();
                
                if (models.length === 0) {
                    vscode.window.showWarningMessage(
                        'No Ollama models found. Please ensure Ollama is running and has models installed.',
                        'Install Models'
                    ).then(selection => {
                        if (selection === 'Install Models') {
                            vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/library'));
                        }
                    });
                    return;
                }

                const items: vscode.QuickPickItem[] = models.map(model => ({
                    label: model.name,
                    description: `${model.details.parameter_size} • ${this.formatSize(model.size)}`,
                    detail: `${model.details.family} • ${model.details.quantization_level}`
                }));

                const currentModel = this.ollamaApi.getDefaultModel();
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Current: ${currentModel} - Select a different model`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected && selected.label !== currentModel) {
                    await this.setModel(selected.label);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to load models: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async setModel(modelName: string): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('ollama');
            await config.update('model', modelName, vscode.ConfigurationTarget.Global);
            
            this.updateStatusBar();
            
            vscode.window.showInformationMessage(
                `Ollama model changed to: ${modelName}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to set model: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async checkOllamaConnection(): Promise<boolean> {
        try {
            return await this.ollamaApi.isHealthy();
        } catch (error) {
            return false;
        }
    }

    async showConnectionStatus(): Promise<void> {
        const isHealthy = await this.checkOllamaConnection();
        
        if (isHealthy) {
            try {
                const models = await this.ollamaApi.getModels();
                vscode.window.showInformationMessage(
                    `✅ Connected to Ollama • ${models.length} models available`
                );
            } catch (error) {
                vscode.window.showWarningMessage(
                    `⚠️ Connected to Ollama but failed to load models: ${error}`
                );
            }
        } else {
            const config = vscode.workspace.getConfiguration('ollama');
            const apiUrl = config.get<string>('apiUrl', 'http://localhost:11434');
            
            vscode.window.showErrorMessage(
                `❌ Cannot connect to Ollama at ${apiUrl}`,
                'Open Settings',
                'Help'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
                } else if (selection === 'Help') {
                    vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/download'));
                }
            });
        }
    }

    private formatSize(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}

export class OllamaConfigurationProvider {
    static async initializeConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration('ollama');
        
        // Check if this is the first time setup
        const model = config.get<string>('model');
        if (!model) {
            // Try to detect available models and set a default
            try {
                const ollamaApi = new OllamaApi();
                const models = await ollamaApi.getModels();
                
                if (models.length > 0) {
                    // Prefer common models in order of preference
                    const preferredModels = ['llama3.2', 'llama3.1', 'llama3', 'codellama', 'mistral'];
                    let defaultModel = models[0].name;
                    
                    for (const preferred of preferredModels) {
                        const found = models.find(m => m.name.includes(preferred));
                        if (found) {
                            defaultModel = found.name;
                            break;
                        }
                    }
                    
                    await config.update('model', defaultModel, vscode.ConfigurationTarget.Global);
                    
                    vscode.window.showInformationMessage(
                        `Ollama extension initialized with model: ${defaultModel}`,
                        'Select Different Model'
                    ).then(selection => {
                        if (selection === 'Select Different Model') {
                            vscode.commands.executeCommand('ollama.selectModel');
                        }
                    });
                }
            } catch (error) {
                // If we can't connect to Ollama, show setup instructions
                vscode.window.showWarningMessage(
                    'Ollama extension requires Ollama to be installed and running.',
                    'Install Ollama',
                    'Open Settings'
                ).then(selection => {
                    if (selection === 'Install Ollama') {
                        vscode.env.openExternal(vscode.Uri.parse('https://ollama.ai/download'));
                    } else if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
                    }
                });
            }
        }
    }

    static registerConfigurationWatcher(): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('ollama')) {
                // Reload extension configuration
                vscode.window.showInformationMessage('Ollama configuration updated');
            }
        });
    }
}