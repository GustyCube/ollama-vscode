# Ollama VS Code Extension

A powerful VS Code extension that integrates Ollama AI models directly into your development workflow, providing intelligent code completions, AI-powered chat assistance, and code analysis features.

## Features

### 🤖 Intelligent Code Completions
- Real-time AI-powered code suggestions as you type
- Context-aware completions that understand your codebase
- Support for 25+ programming languages
- Configurable completion settings and triggers

### 💬 AI Chat Assistant
- Dedicated chat sidebar for conversations with AI
- Persistent chat history with configurable limits
- Streaming responses for real-time interaction
- Context-aware conversations about your code

### 🔧 Code Analysis Tools
- **Explain Code**: Get detailed explanations of selected code
- **Improve Code**: Receive suggestions for code improvements
- **Generate Documentation**: Auto-generate docstrings and comments
- **Ask Questions**: Query the AI about code or programming concepts

### ⚙️ Model Management
- Easy model selection from available Ollama models
- Real-time model switching without restart
- Status bar integration showing current model
- Automatic model discovery and configuration

### 🎯 Smart Context Integration
- Right-click context menus for quick AI actions
- Editor selection-aware commands
- Command palette integration
- Keyboard shortcuts support

## Prerequisites

- [Ollama](https://ollama.ai) must be installed and running on your system
- At least one Ollama model must be downloaded (e.g., `ollama pull llama3.2`)

## Installation

1. Install the extension from the VS Code Marketplace
2. Ensure Ollama is running (`ollama serve`)
3. The extension will automatically detect available models
4. Start coding with AI assistance!

## Quick Start

1. **First Setup**: The extension will prompt you to select a model on first launch
2. **Code Completions**: Simply start typing - completions will appear automatically
3. **Open Chat**: Click the Ollama Chat panel in the Explorer sidebar
4. **Analyze Code**: Select code and right-click for AI analysis options

## Configuration

Configure the extension through VS Code settings (`Ctrl/Cmd + ,` → search "Ollama"):

### Core Settings

```json
{
  "ollama.apiUrl": "http://localhost:11434",
  "ollama.model": "llama3.2",
  "ollama.timeout": 30000
}
```

### Code Completions

```json
{
  "ollama.completions.enabled": true,
  "ollama.completions.maxTokens": 100,
  "ollama.completions.triggerChars": [" ", "\t", "\n", ".", "(", "[", "{"]
}
```

### Chat Settings

```json
{
  "ollama.chat.maxHistory": 20
}
```

## Commands

All commands are available through the Command Palette (`Ctrl/Cmd + Shift + P`):

- `Ollama: Open Chat` - Open the chat sidebar
- `Ollama: Select Model` - Choose from available models
- `Ollama: Toggle Code Completions` - Enable/disable completions
- `Ollama: Clear Chat History` - Reset chat conversation
- `Ollama: Check Connection` - Verify Ollama connectivity
- `Ollama: Explain Code` - Get code explanations
- `Ollama: Improve Code` - Receive improvement suggestions
- `Ollama: Generate Documentation` - Create docstrings/comments
- `Ollama: Ask Ollama` - Query the AI assistant

## Supported Languages

The extension provides intelligent completions for:

**Programming Languages:**
- JavaScript/TypeScript
- Python
- Java, C#, C/C++
- Go, Rust, Swift, Kotlin
- PHP, Ruby, Scala, R
- And more...

**Markup & Config:**
- HTML, CSS, SCSS/Less
- JSON, YAML, XML
- Markdown
- Dockerfile, Makefile
- Shell scripts, PowerShell
- SQL

## Usage Examples

### Code Completions
```javascript
function calculateTotal(items) {
  // Start typing and get AI suggestions
  return items.reduce((sum, item) => |
}
```

### Chat Assistance
```markdown
You: How do I implement a binary search in Python?

Ollama: Here's an efficient binary search implementation:

def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1
```

### Code Analysis
Select any code and right-click to:
- **Explain**: Understand complex algorithms
- **Improve**: Get optimization suggestions
- **Document**: Generate comprehensive docstrings

## Troubleshooting

### Common Issues

**Extension not working:**
1. Ensure Ollama is installed and running (`ollama serve`)
2. Check that models are available (`ollama list`)
3. Verify the API URL in settings matches your Ollama instance

**No completions appearing:**
1. Check that completions are enabled in settings
2. Verify the selected model supports code generation
3. Try toggling completions off and on

**Chat not responding:**
1. Check Ollama connection status
2. Verify the selected model is downloaded
3. Increase timeout setting if requests are slow

### Performance Tips

- Use smaller, faster models for code completions (e.g., CodeLlama 7B)
- Adjust `maxTokens` setting to balance speed vs. completion length
- Consider using different models for chat vs. completions

## Privacy & Security

- All processing happens locally through your Ollama instance
- No code or data is sent to external servers
- Chat history is stored locally in VS Code
- You have full control over your AI models and data

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/ollama/ollama-vscode/wiki)
- 🐛 [Report Issues](https://github.com/ollama/ollama-vscode/issues)
- 💬 [Discord Community](https://discord.gg/ollama)
- 🌟 [Star on GitHub](https://github.com/ollama/ollama-vscode)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and updates.

---

**Enjoy coding with AI! 🚀**