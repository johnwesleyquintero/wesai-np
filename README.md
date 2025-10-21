# WesAI Notepad

**Your personal knowledge assistant, transformed into a powerful operational tool.**

[**Live Demo**](https://wesai-np.vercel.app/)

WesAI Notepad is a local-first, AI-enhanced application designed for privacy, performance, and productivity. It combines a fast, offline-capable notepad with a multi-mode AI assistant powered by the Google Gemini API. All your data is stored securely in your browser.

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
- **Multi-Mode AI Assistant:** The core of the application is a versatile AI assistant with three distinct modes for different tasks:
    - **Knowledge Assistant:** Engage in a conversation with your notes. Ask complex questions and receive synthesized answers with direct links to the source notes for verification.
    - **Service Responder:** Transform your notes into an operational playbook. Paste a customer inquiry, and the AI will use your knowledge base to draft a professional, empathetic, and platform-compliant response. It's specifically trained to avoid direct links, protecting your third-party marketplace accounts.
    - **General Assistant:** Your creative and strategic partner. Use this mode for brainstorming, drafting content, and asking general questions. It maintains a continuous conversational memory, allowing for natural follow-up questions.
- **Semantic Search:** Go beyond simple keyword matching to find notes based on their conceptual meaning and context.
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
- **Enhanced Performance:** The app is faster than ever with lazy-loading for major components and an optimized architecture that reduces re-renders, ensuring a snappy experience even with many notes.
- **Improved Onboarding:** A new welcome guide and a persistent indicator for the API key make setup for new users seamless and intuitive.
- **Detailed Note Info:** Access word count, character count, creation date, and estimated reading time directly from the editor's toolbar.
- **Command Palette:** Press `Ctrl/Cmd + K` to open a command palette and access nearly every application feature, from creating notes to executing AI actions.
- **Expanded Keyboard Shortcuts:** Boost your workflow with new hotkeys for focusing search (`Ctrl/Cmd + F`), toggling favorites (`Ctrl/Cmd + Shift + F`), and switching to AI Chat (`Ctrl/Cmd + Shift + C`).
- **Slash Commands:** Type `/` in the editor to quickly insert headings, lists, to-do items, and dividers, or to trigger AI actions.
- **Full Data Portability:** Export your entire notepad—including all notes, folders, and templates—to a single JSON file for backup. Import a backup file to restore your data on any device.
- **Note Templates:** Create and save reusable templates for frequently created documents, such as meeting minutes or project plans.
- **Version History:** The application automatically saves previous versions of your notes, allowing you to preview or restore them at any time.
- **Drag and Drop:**
    - Reorganize notes and folders in the sidebar.
    - Drag text files or images directly into the editor to import their content.
- **Polished User Experience:** Enjoy smoother animations, more responsive feedback, and smarter in-app guidance for a more premium feel.
- **Light and Dark Themes:** Choose between a light or dark interface for optimal viewing comfort.
- **Responsive Design:** A seamless experience across desktop, tablet, and mobile devices.

## Getting Started

1.  **Open the Application:** Navigate to the [**Live Demo**](https://wesai-np.vercel.app/).
2.  **Obtain a Gemini API Key:** The AI features require a free API key from Google.
    - Go to [Google AI Studio](https://ai.google.dev/).
    - Click "Get API key" and follow the on-screen instructions.
3.  **Configure the Application:**
    - You will be greeted by a welcome screen that guides you. Follow the prompt to open Settings.
    - Alternatively, click the Settings icon in the bottom-left corner of the sidebar.
    - Paste your API key into the "Gemini API Key" field and click "Save Settings".
4.  **Begin Writing:** Your API key is saved securely in your browser's local storage, and all AI features are now available for use.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/genai`)
- **State Management:** React Hooks and Context API
- **Storage:** Browser `localStorage`