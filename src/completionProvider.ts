import * as vscode from 'vscode';
import { OllamaApi } from './ollamaApi';

export class OllamaCompletionProvider implements vscode.InlineCompletionItemProvider {
    private ollamaApi: OllamaApi;
    private isEnabled: boolean = true;

    constructor(ollamaApi: OllamaApi) {
        this.ollamaApi = ollamaApi;
        this.updateConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('ollama')) {
                this.updateConfig();
                this.ollamaApi.updateConfig();
            }
        });
    }

    private updateConfig() {
        const config = vscode.workspace.getConfiguration('ollama');
        this.isEnabled = config.get<boolean>('completions.enabled', true);
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        
        if (!this.isEnabled) {
            return null;
        }

        // Don't provide completions if we're in the middle of a word
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange && wordRange.start.character < position.character) {
            return null;
        }

        // Get context before cursor
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // Skip if line is empty or just whitespace
        if (linePrefix.trim().length === 0) {
            return null;
        }

        try {
            const completion = await this.getCompletion(document, position, token);
            if (!completion || completion.trim().length === 0) {
                return null;
            }

            return [
                new vscode.InlineCompletionItem(
                    completion,
                    new vscode.Range(position, position)
                )
            ];
        } catch (error) {
            console.error('Completion error:', error);
            return null;
        }
    }

    private async getCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('ollama');
        const maxTokens = config.get<number>('completions.maxTokens', 100);
        
        // Get context around cursor position
        const contextLines = this.getContextLines(document, position);
        const prompt = this.buildPrompt(document, contextLines, position);
        const suffix = this.getSuffix(document, position);

        try {
            const completion = await this.ollamaApi.generateCompletion({
                model: this.ollamaApi.getDefaultModel(),
                prompt: prompt,
                suffix: suffix,
                options: {
                    temperature: 0.1, // Low temperature for more deterministic completions
                    num_predict: maxTokens,
                    stop: ['\n\n', '```', '###']
                }
            });

            return this.processCompletion(completion, document, position);
        } catch (error) {
            if (token.isCancellationRequested) {
                return null;
            }
            throw error;
        }
    }

    private getContextLines(document: vscode.TextDocument, position: vscode.Position): string[] {
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(document.lineCount - 1, position.line + 5);
        
        const lines: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
            if (i === position.line) {
                // Only include text before cursor on current line
                lines.push(document.lineAt(i).text.substring(0, position.character));
            } else {
                lines.push(document.lineAt(i).text);
            }
        }
        
        return lines;
    }

    private buildPrompt(document: vscode.TextDocument, contextLines: string[], position: vscode.Position): string {
        const language = document.languageId;
        const fileName = document.fileName.split('/').pop() || 'file';
        
        let prompt = `You are an AI code completion assistant. Complete the following ${language} code.

File: ${fileName}
Language: ${language}

Code context:
\`\`\`${language}
${contextLines.join('\n')}
\`\`\`

Complete the code starting from where it left off. Only provide the completion, no explanations or additional context.`;

        return prompt;
    }

    private getSuffix(document: vscode.TextDocument, position: vscode.Position): string {
        const currentLine = document.lineAt(position);
        const suffixOnLine = currentLine.text.substring(position.character);
        
        // Include a few lines after current position for better context
        const lines: string[] = [suffixOnLine];
        const maxLines = Math.min(document.lineCount - 1, position.line + 3);
        
        for (let i = position.line + 1; i <= maxLines; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines.join('\n').trim();
    }

    private processCompletion(completion: string, document: vscode.TextDocument, position: vscode.Position): string {
        if (!completion) {
            return '';
        }

        // Clean up the completion
        let processed = completion.trim();
        
        // Remove code block markers if present
        processed = processed.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        
        // Remove any leading/trailing whitespace on each line but preserve structure
        const lines = processed.split('\n');
        const cleanedLines = lines.map((line, index) => {
            if (index === 0) {
                // First line: remove leading whitespace but keep structure
                return line.trimStart();
            }
            return line;
        });
        
        processed = cleanedLines.join('\n');
        
        // Limit to single line completion for inline suggestions
        const firstLineEnd = processed.indexOf('\n');
        if (firstLineEnd !== -1) {
            processed = processed.substring(0, firstLineEnd);
        }
        
        // Don't suggest completions that just repeat what's already there
        const currentLineText = document.lineAt(position).text;
        const linePrefix = currentLineText.substring(0, position.character);
        if (processed.trim() === linePrefix.trim()) {
            return '';
        }
        
        return processed;
    }

    setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
    }

    isCompletionEnabled(): boolean {
        return this.isEnabled;
    }
}