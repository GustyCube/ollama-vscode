# Installation Guide

## Prerequisites

Before installing the Ollama VS Code extension, ensure you have:

1. **Ollama installed** on your system
   - Download from: https://ollama.ai/download
   - Follow the installation instructions for your operating system

2. **At least one model downloaded**

   ```bash
   # Recommended for code completions
   ollama pull llama3.2
   
   # Or other popular models
   ollama pull codellama
   ollama pull mistral
   ```

3. **Ollama running**

   ```bash
   ollama serve
   ```

## Installing the Extension

### Method 1: VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Ollama"
4. Click "Install" on the official Ollama extension

### Method 2: Manual Installation

1. Download the `.vsix` file from releases
2. In VS Code, open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Type "Extensions: Install from VSIX"
4. Select the downloaded `.vsix` file

### Method 3: Development Installation

1. Clone this repository
2. Open in VS Code
3. Press F5 to launch Extension Development Host
4. Or run: `npm install && npm run compile`

## First Setup

1. After installation, the extension will automatically activate
2. If Ollama is running, it will detect available models
3. You'll be prompted to select a default model
4. The chat panel will appear in the Explorer sidebar
5. Code completions will be enabled by default

## Verification

Test the installation:

1. **Check Status Bar**: You should see the current model name in the status bar
2. **Open Chat**: Click on "Ollama Chat" in the Explorer sidebar
3. **Test Completions**: Start typing code and look for AI suggestions
4. **Run Commands**: Open Command Palette and search for "Ollama" commands

## Configuration

Access settings via:

- File → Preferences → Settings → Search "Ollama"
- Or use Command Palette: "Preferences: Open Settings (JSON)"

## Troubleshooting

### Extension not activating

- Check VS Code version (requires 1.74.0+)
- Restart VS Code after installation
- Check the Output panel for error messages

### No AI features working

- Ensure Ollama is running: `ollama serve`
- Check models are available: `ollama list`
- Verify API URL in settings matches your setup
- Test connection: Command Palette → "Ollama: Check Connection"

### Performance issues

- Try smaller models for faster responses
- Adjust timeout settings
- Reduce max tokens for completions

Need help? Check our [troubleshooting guide](README.md#troubleshooting) or open an issue on GitHub.