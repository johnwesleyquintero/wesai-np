# WesAI Notepad

**A local-first, AI-enhanced notepad built for privacy, performance, and productivity.**

[**Live Demo**](https://wesai-np.vercel.app/)

WesAI Notepad is a powerful, privacy-focused note-taking application that runs entirely in your browser. It combines a fast, responsive, and offline-capable interface with the advanced capabilities of the Google Gemini API to create an intelligent writing environment. All your data is stored locally on your device.

## Key Features

### Note-Taking and Organization
- **Local-First Storage:** All notes, folders, and templates are stored in your browser's `localStorage`. No cloud services or user registration is required.
- **Offline Capability:** Create, edit, and manage your notes with or without an internet connection.
- **Rich Markdown Editor:** A full-featured Markdown editor with syntax highlighting and a live preview mode that supports tables, images, embedded videos, and more.
- **Hierarchical Folders:** Organize notes with nested folders for a clear, tree-like structure.
- **Smart Folders:** Create dynamic, saved searches that automatically display notes matching a specific AI-powered query.
- **Bi-Directional Linking:** Connect ideas by linking notes using `[[note-id|display text]]` syntax. A "Linked Mentions" section automatically displays all backlinks to the current note.
- **Tagging System:** Assign multiple tags to notes for flexible, cross-folder organization.
- **Favorites:** Mark important notes as favorites for quick and easy access.

### AI-Powered by Google Gemini
- **Semantic Search:** Go beyond simple keyword matching to find notes based on their conceptual meaning and context.
- **AI Chat:** Engage in a conversation with your notes. Ask complex questions and receive synthesized answers with links to the source notes.
- **Inline AI Assistant:** Select any text in the editor to:
    - Fix spelling and grammar.
    - Adjust the tone (e.g., professional, casual, concise).
    - Expand or shorten the selected text.
    - Simplify complex language.
- **Content Generation:**
    - Automatically suggest a descriptive title for a new note based on its content.
    - Generate relevant tag suggestions to help categorize your writing.
- **Summarization and Action Items:** Generate a concise summary and extract a checklist of action items from your note content with a single command.

### Productivity and Workflow
- **Command Palette:** Press `Ctrl/Cmd + K` to open a command palette and access nearly every application feature, from creating notes to executing AI actions.
- **Slash Commands:** Type `/` in the editor to quickly insert headings, lists, to-do items, and dividers, or to trigger AI actions.
- **Full Data Portability:** Export your entire notepad—including all notes, folders, and templates—to a single JSON file for backup. Import a backup file to restore your data on any device.
- **Note Templates:** Create and save reusable templates for frequently created documents, such as meeting minutes or project plans.
- **Version History:** The application automatically saves previous versions of your notes, allowing you to preview or restore them at any time.
- **Drag and Drop:**
    - Reorganize notes and folders in the sidebar.
    - Drag text files or images directly into the editor to import their content.
- **Light and Dark Themes:** Choose between a light or dark interface for optimal viewing comfort.
- **Responsive Design:** A seamless experience across desktop, tablet, and mobile devices.

## Getting Started

1.  **Open the Application:** Navigate to the [**Live Demo**](https://wesai-np.vercel.app/).
2.  **Obtain a Gemini API Key:** The AI features require a free API key from Google.
    - Go to [Google AI Studio](https://ai.google.dev/).
    - Click "Get API key" and follow the on-screen instructions.
3.  **Configure the Application:**
    - In the WesAI Notepad, click the Settings icon in the bottom-left corner of the sidebar.
    - Paste your API key into the "Gemini API Key" field.
    - Click "Save Settings".
4.  **Begin Writing:** Your API key is saved securely in your browser's local storage, and all AI features are now available for use.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/genai`)
- **State Management:** React Hooks and Context API
- **Storage:** Browser `localStorage`
