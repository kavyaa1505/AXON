# AXON IDE — AI-Native Software Development Environment

<p align="center">
  <img src="https://img.shields.io/badge/AXON-IDE-blueviolet?style=for-the-badge&logo=codefactor" alt="AXON IDE Logo">
  <img src="https://img.shields.io/badge/Tauri-v2-blue?style=for-the-badge&logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS">
</p>

---

## 🚀 Overview

**AXON IDE** is a state-of-the-art, AI-native software engineering environment designed for rapid, intelligent software planning and development. Built on Tauri, React 19, and CodeMirror, AXON features a **Dual-Agent Architecture** coupled with a flexible **Multi-Provider LLM Router** that supports over 15+ cloud and local AI models out of the box.

---

## ✨ Key Features

### 🤖 Dual AI Agent System
- **Planning Agent (P)**: Dedicated agent optimized for software architecture, task breakdown, and technical specification cards.
- **Development Agent (D)**: Specialized agent for code generation, bug fixing, refactoring, and execution.
- Independent provider and model selection for each agent (e.g. Claude 3.5 Sonnet for Planning, Llama 3.3 70B for Development).

### 🌐 15+ Supported LLM Providers
Supported natively out of the box with zero lock-in:
- **OpenRouter** (`anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `deepseek/deepseek-r1`, `meta-llama/llama-3.3-70b`, `google/gemini-2.0-flash`)
- **NVIDIA NIM** (`meta/llama-3.3-70b-instruct`, `deepseek-ai/deepseek-r1`, `nvidia/llama-3.1-nemotron-70b`)
- **DeepSeek** (`deepseek-chat`, `deepseek-reasoner`)
- **Anthropic** (`claude-3-5-sonnet`, `claude-3-7-sonnet`, `claude-3-5-haiku`)
- **OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini`)
- **Groq** (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b`)
- **Google Gemini** (`gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`)
- **Mistral AI** (`mistral-large-latest`, `codestral-latest`)
- **Together AI** (`meta-llama/Llama-3.3-70B-Instruct-Turbo`, `Qwen2.5-Coder-32B`)
- **Perplexity AI** (`sonar-pro`, `sonar-reasoning-pro`)
- **xAI (Grok)** (`grok-2-latest`, `grok-2-vision-latest`)
- **Fireworks AI** (`deepseek-r1`, `llama-v3p3-70b-instruct`)
- **Cerebras** (`llama-3.3-70b`, `llama3.1-8b`)
- **Ollama (Local)** (`http://localhost:11434/v1/chat/completions`)
- **LM Studio (Local)** (`http://localhost:1234/v1/chat/completions`)
- **Custom Providers**: Add any OpenAI, Anthropic, Gemini, or custom REST endpoint with preset templates.

### 📁 Complete Workspace & File Explorer
- **Folder Navigation**: Native OS directory picker dialogs (Tauri) and HTML5 File System Access API support.
- **Recursive File Tree**: Full workspace tree with file type icons (`.tsx`, `.ts`, `.js`, `.rs`, `.json`, `.css`, `.html`, `.md`, images).
- **Search & Filtering**: Live workspace file search filtering.
- **Context Menus**: Right-click to create files/folders, rename, delete, or copy paths.
- **Recent Workspaces**: Quick-switch popover menu for recent projects.

### 💻 Multi-Tab CodeMirror Editor
- **Multi-Tab Interface**: Active file tab highlight, file icons, unsaved change indicators (`•`), and close tab buttons (`X`).
- **Disk Synchronization**: Press `Ctrl+S` or `Cmd+S` to save file edits directly to disk.
- **Syntax Highlighting**: Automatic language mode detection and VS Code Dark theme.
- **Cursor Status**: Live line & column tracking (`Ln X, Col Y`) synced to status bar.

### 🖥️ Integrated Terminal
- Embedded **xterm.js** terminal emulator with fit addon for command line operations.

---

## 🛠️ Tech Stack

- **Desktop Shell**: [Tauri v2](https://tauri.app/) (Rust)
- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Code Editor**: [@uiw/react-codemirror](https://uiwjs.github.io/react-codemirror/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Resizable Layout**: [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: `v18+`
- **Rust & Cargo**: Required for building the Tauri desktop application.

### Installation

1. **Clone or navigate to repository**:
   ```bash
   cd "my ide"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Locally

- **Development Server (Browser Preview)**:
  ```bash
  npm run dev
  ```

- **Tauri Desktop Application**:
  ```bash
  npm run tauri dev
  ```

- **Production Build**:
  ```bash
  npm run build
  ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Ctrl` + `S` / `Cmd` + `S` | Save active file to disk |
| `Ctrl` + `B` / `Cmd` + `B` | Toggle Explorer Sidebar |
| `Ctrl` + `` ` `` | Toggle Integrated Terminal |
| `Esc` | Close context menus or popovers |

---

## 📜 License

MIT License. Designed with elite AI agentic software development principles.
