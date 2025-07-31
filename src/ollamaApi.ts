import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    suffix?: string;
    stream?: boolean;
    raw?: boolean;
    options?: {
        temperature?: number;
        top_k?: number;
        top_p?: number;
        num_predict?: number;
        stop?: string[];
    };
}

export interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    options?: {
        temperature?: number;
        top_k?: number;
        top_p?: number;
        num_predict?: number;
        stop?: string[];
    };
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: OllamaMessage;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        format: string;
        family: string;
        parameter_size: string;
        quantization_level: string;
    };
}

export interface OllamaModelsResponse {
    models: OllamaModel[];
}

export class OllamaApi {
    private baseUrl: string = 'http://localhost:11434';
    private timeout: number = 30000;

    constructor() {
        this.updateConfig();
    }

    updateConfig() {
        const config = vscode.workspace.getConfiguration('ollama');
        this.baseUrl = config.get<string>('apiUrl', 'http://localhost:11434');
        this.timeout = config.get<number>('timeout', 30000);
    }

    async generateCompletion(request: OllamaGenerateRequest): Promise<string> {
        try {
            const response: AxiosResponse<OllamaResponse> = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    ...request,
                    stream: false
                },
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.response;
        } catch (error) {
            console.error('Ollama completion error:', error);
            throw new Error(`Failed to generate completion: ${error}`);
        }
    }

    async generateChatCompletion(request: OllamaChatRequest): Promise<OllamaMessage> {
        try {
            const response: AxiosResponse<OllamaChatResponse> = await axios.post(
                `${this.baseUrl}/api/chat`,
                {
                    ...request,
                    stream: false
                },
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.message;
        } catch (error) {
            console.error('Ollama chat error:', error);
            throw new Error(`Failed to generate chat completion: ${error}`);
        }
    }

    async streamChatCompletion(
        request: OllamaChatRequest,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/chat`,
                {
                    ...request,
                    stream: true
                },
                {
                    timeout: this.timeout,
                    responseType: 'stream',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            response.data.on('data', (chunk: Buffer) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    try {
                        const data: OllamaChatResponse = JSON.parse(line);
                        if (data.message && data.message.content) {
                            onChunk(data.message.content);
                        }
                    } catch (parseError) {
                        // Ignore parsing errors for incomplete chunks
                    }
                }
            });

            response.data.on('end', () => {
                // Stream completed
            });

        } catch (error) {
            console.error('Ollama streaming chat error:', error);
            throw new Error(`Failed to stream chat completion: ${error}`);
        }
    }

    async getModels(): Promise<OllamaModel[]> {
        try {
            const response: AxiosResponse<OllamaModelsResponse> = await axios.get(
                `${this.baseUrl}/api/tags`,
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.models;
        } catch (error) {
            console.error('Ollama models error:', error);
            throw new Error(`Failed to fetch models: ${error}`);
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5000
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    getDefaultModel(): string {
        const config = vscode.workspace.getConfiguration('ollama');
        return config.get<string>('model', 'llama3.2');
    }
}