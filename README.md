# WesAI Notepad

**A local-first, AI-enhanced notepad for the modern web.**

<img width="845" height="1121" alt="image" src="https://github.com/user-attachments/assets/5bf49a27-447f-436e-ba79-5d314e607be5" />


[**Live Demo**](https://wesai-np.vercel.app/)

WesAI Notepad is a powerful, privacy-focused note-taking application that runs entirely in your browser. It combines a fast, responsive, and offline-capable interface with the advanced capabilities of the Google Gemini API to create a truly intelligent writing environment. All your data stays with you, on your device.

## Core Features

### 📝 Note-Taking & Organization
- **Local-First Storage:** All notes, folders, and templates are stored directly in your browser's `localStorage`. No cloud, no sign-up required.
- **Offline Capable:** Create, edit, and organize your notes even without an internet connection.
- **Rich Markdown Editing:** Write in Markdown with a beautiful, syntax-highlighted editor.
- **Preview Mode:** Instantly see your rendered Markdown, including tables, images, and embedded videos.
- **Hierarchical Folders:** Organize your notes with nested folders for better structure.
- **Smart Folders:** Create dynamic folders based on AI search queries (e.g., "all notes about marketing from last week").
- **Bi-Directional Linking:** Connect your ideas by linking notes with `[[note-id|display text]]` syntax and see all "Linked Mentions" (backlinks) at the bottom of a note.
- **Favorites:** Quickly access your most important notes.

### ✨ AI-Powered by Gemini
- **Semantic Search:** Go beyond keywords. Find notes based on meaning and context.
- **AI Chat:** Ask questions about your entire note collection and get synthesized answers with sourced links.
- **Inline AI Assistant:** Select any text to:
    - Fix spelling and grammar.
    - Change the tone (professional, casual, etc.).
    - Make text shorter or longer.
    - Simplify complex language.
- **Content Generation:**
    - Automatically suggest a title for your note based on its content.
    - Get relevant tag suggestions to categorize your notes.
- **Summarization & Action Items:** Generate a concise summary and extract a to-do list from your note with a single click.

### 🚀 Productivity & Customization
- **Command Palette:** Access any action—from creating a new note to applying an AI function—with a quick keyboard command (`Ctrl/Cmd + K`).
- **Full Data Portability:** Export your entire notepad (notes, folders, and templates) to a single JSON file for backup, and import it to restore your data on any browser or device.
- **Note Templates:** Create reusable templates for common note types like meeting minutes or project plans.
- **Version History:** Automatically saves previous versions of your notes, allowing you to preview or restore them at any time.
- **Light & Dark Themes:** A beautiful and comfortable experience, day or night.
- **Fully Responsive:** Works seamlessly on desktop, tablet, and mobile devices.

## Roadmap: The Future of WesAI Notepad

This project is actively developed. Here are some of the features we envision for the future:
- **☁️ Optional Cloud Sync:** End-to-end encrypted synchronization between your devices.
- **🤝 Real-time Collaboration:** Share and edit notes with others.
- **🧠 Advanced AI Organization:** AI-powered suggestions for organizing notes into folders.
- **🖼️ Rich Media Support:** Enhanced support for embedding and managing images, videos, and other file types.
- **📱 Native Mobile Apps:** Dedicated applications for iOS and Android for the best mobile experience.

## Getting Started

1.  **Open the App:** Visit the [**Live Demo**](https://wesai-np.vercel.app/).
2.  **Get a Gemini API Key:** To use the AI features, you need a free API key from Google.
    - Visit [Google AI Studio](https://ai.google.dev/).
    - Click "Get API key" and follow the instructions to create a new key.
3.  **Add Your Key:**
    - In the WesAI Notepad, click the **Settings** icon (⚙️) in the bottom-left corner.
    - Paste your API key into the "Gemini API Key" field.
    - Click "Save Settings".
4.  **Start Writing!** Your API key is saved securely in your browser's local storage, and all AI features are now unlocked.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/genai`)
- **State Management:** React Hooks & Context API
- **Storage:** Browser `localStorage`
