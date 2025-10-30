# WesCore

**The operator-first platform for building, executing, and automating high-value workflows. Powered by a modular AI engine and real-time cloud sync.**

WesCore is a centralized cockpit for operators to execute workflows, manage data, and automate tasks. It combines a fast, responsive interface with a multi-mode AI assistant powered by the Google Gemini API. All your data is securely stored in your own cloud backend, making it accessible across all your devices.

## Key Features

### Core System & Organization
- **Secure & Private Cloud Sync:** All data is stored securely in your own Supabase backend and protected by granular security policies. Real-time, authenticated subscriptions keep all your devices perfectly in sync.
- **Flexible Authentication:** Sign up quickly with an email and password or use the convenient one-click Google Sign-In option.
- **Immersive Onboarding Experience:** Instead of a static checklist, new users can explore a pre-populated demo workspace. These curated notes immersively guide them through core features, teaching the app with its own functionality.
- **Drag & Drop Organization:** Intuitively organize your workspace by dragging notes and folders to reorder them or nest them within each other. Drop files directly onto folders to import them.
- **Rich Markdown Editor:** A full-featured Markdown editor with syntax highlighting, a live preview mode, and support for tables, images, embedded YouTube/Vimeo videos, callout blocks, and auto-pairing of brackets and quotes for a smoother writing flow.
- **Automatic Titling:** If you leave a note untitled, its title will be automatically generated from the first line of content when you move on.
- **Cloud Image Storage:** Images are uploaded to secure cloud storage, keeping your note content clean and your database lean.
- **Smart Folders:** Create dynamic, saved searches that automatically display notes matching a specific AI-powered query (e.g., "all notes about marketing from the last month").
- **Bi-Directional Linking:** Connect ideas by linking notes using `[[note-id|display text]]` syntax. A "Linked Mentions" section automatically displays all backlinks to the current note.
- **Active Path Highlighting:** The sidebar visually indicates the full path to your currently selected note, improving spatial awareness within your file tree.
- **Tagging System:** Assign multiple tags to notes for flexible, cross-folder organization.
- **PWA Ready:** Installable as a Progressive Web App with offline caching of core assets for faster load times and a native-like experience.

### AI-Powered by Google Gemini
- **Multi-Mode AI Assistant:** A versatile AI assistant with four distinct modes for different tasks:
    - **Knowledge Assistant:** Engage in a conversation with your notes. Ask complex questions and receive synthesized answers with direct links to the source notes.
    - **Service Responder:** Transform your notes into an operational playbook. Paste a customer inquiry, and the AI will use your knowledge base to draft a professional, compliant response.
    - **Amazon Copywriter:** Generates compelling, SEO-optimized Amazon product listing copy based on product info and research notes.
    - **WesCore Co-pilot (with Tools):** Your operational co-pilot. This assistant uses **Function Calling** to understand natural language commands and interact with your workspace. It can create, find, read, update, delete, and organize notes; manage templates; and even perform bulk find-and-replace operations across your entire workspace.
- **Proactive Related Notes (AI Co-Pilot):** As you write, the AI analyzes your content in real-time to proactively surface semantically related notes from your knowledge base, helping you discover hidden connections without breaking your flow.
- **Knowledge Graph Visualization:** A dynamic, interactive force-directed graph that visually represents the connections between your notes. Preview notes on hover, zoom and pan, and even create new links by holding `Alt` and dragging between nodes.
- **Self-Improving Intelligence & Analytics:**
    - **CTR Analytics:** A foundational feedback loop makes the AI smarter. The system logs every suggestion "impression" and user "click," providing a dashboard to measure relevance and continuously refine the AI's performance.
    - **Trend Analysis Dashboard:** Visualize conceptual clusters, "hot topics," and the most frequent connections between your ideas, giving you a strategic overview of your knowledge base.
    - **AI-Powered Consolidation:** From the Trend Analysis dashboard, generate an AI-powered consolidated note from any frequently linked pair of notes, helping you synthesize ideas and reduce redundancy.
- **Semantic Search:** Go beyond keyword matching to find notes based on their conceptual meaning.
- **Inline AI Assistant:** Select any text to fix spelling, adjust tone (professional, casual), expand or shorten content, and simplify language.
- **Real-time AI Spell Check:** Highlights potential spelling errors as you type and offers AI-powered suggestions for corrections, without interrupting your flow.
- **Content Generation & Summarization:**
    - Automatically suggest descriptive titles and relevant tags based on your note's content.
    - Generate a concise summary and extract a checklist of action items from your note with a single command.
- **Multimodal Input:** Provide visual context to the AI by attaching images to your prompts in any assistant mode via drag-and-drop, a file picker, or pasting directly from your clipboard.

### Productivity and Workflow
- **Optimized for Performance & Scale:** A highly-optimized Supabase backend with custom database indexing ensures data retrieval is instantaneous. The frontend is built with lazy-loading components for a fast initial load.
- **Frictionless Demo Mode:** Explore a fully-featured demo workspace instantly, without needing to sign up or provide an API key.
- **Full Keyboard Navigation:** Navigate the entire sidebar, select notes, and expand folders using only your keyboard for maximum efficiency.
- **Robust Editing Experience:** A reliable undo/redo system that covers all note attributes (title, content, tags) ensures you never lose an idea.
- **Manual Save Control:** The editor features an explicit "Save" button that appears only when there are unsaved changes, giving you full control over when to commit your work. The distracting auto-save-on-pause is gone, but the safety net of saving automatically when you navigate away remains.
- **Actionable UI Feedback:** All pop-up notifications are actionable, with manual dismiss controls, so they never interrupt your flow.
- **Command Palette:** Press `Ctrl/Cmd + K` to access nearly every application feature, from creating notes to executing AI actions.
- **Slash Commands:** Type `/` in the editor to quickly insert headings, lists, to-do items, dividers, and trigger AI actions.
- **Edit Last Message:** Press `ArrowUp` in an empty chat input to quickly recall, edit, and resubmit your last query.
- **Saved Chat Responders:** Save and reuse common prompts in the "Responder" chat mode, turning complex customer service tasks into one-click actions.
- **Collapsible Sidebar:** Maximize your writing space on desktop by collapsing the sidebar to a compact, icon-only view.
- **Drag & Drop Import:** Drag text or markdown files directly into the editor or onto a folder in the sidebar to instantly create new notes.
- **Full Data Portability:** Export your entire notepad—including all notes, folders, and templates—to a single JSON file for backup. Import a backup file to restore your data.
- **Note Templates & Synced Blocks:** Create and save reusable templates. Embed template content directly into notes as "synced blocks" that update automatically when the source template is changed.
- **Version History:** Automatically saves previous versions of your notes, allowing you to preview or restore them at any time.
- **In-App Help Center:** A dedicated modal for FAQs and a running changelog to keep users informed.
- **Light and Dark Themes:** Choose between a light or dark interface for optimal viewing comfort.
- **Responsive Design:** A seamless experience across desktop, tablet, and mobile devices.

## Getting Started

### For Users (Hosted App)

1.  **Open the Application:** Navigate to the live application URL.
2.  **Choose Your Path:**
    *   **Get Started:** Click "Launch Cockpit" and sign up with an email/password or Google to create your own private workspace.
    *   **Explore:** Click "Explore a Demo" to instantly access a pre-populated workspace with all features enabled, no sign-up required.
3.  **Obtain a Gemini API Key (if not in Demo):** The AI features in your private workspace require a free API key from Google.
    *   Go to [Google AI Studio](https://ai.google.dev/).
    *   Click "Get API key" and follow the on-screen instructions.
4.  **Configure the Application:**
    *   You will be guided by a welcome modal to open Settings.
    *   Click the Settings icon (gear) in the sidebar.
    *   Paste your API key into the "Gemini API Key" field and click "Save Settings".
5.  **Begin Writing:** Your API key is saved securely in your browser's local storage, and all AI features are now available for use.

### For Developers (Running Locally)

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install Dependencies & Run:**
    ```bash
    npm install
    npm run dev
    ```
3.  Follow the "For Users" guide above to sign up and add your Gemini API key within the running application. The app is pre-configured to connect to the production Supabase instance.

## Technology Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend & Database:** Supabase (Authentication, PostgreSQL, Realtime Subscriptions, Storage)
- **AI Integration:** Google Gemini API (`@google/genai`)
- **State Management:** React Hooks and Context API. The application features a clean, maintainable architecture built on custom hooks for logic encapsulation and reducers for predictable state management.

## Legacy & Philosophy

The WesCore platform is built on the foundation of an operator-first philosophy: turning challenges into opportunities, prioritizing competence over conventional approaches, and building robust systems for long-term strategic independence.

This platform preserves a raw, powerful "cockpit" feel that values results and efficiency above all else. It is a sovereign, intelligent tool for turning your ideas into action.