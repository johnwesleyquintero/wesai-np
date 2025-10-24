# WesAI Notepad

**Your personal knowledge system, transformed into a powerful operational tool.**

WesAI Notepad is a secure, AI-enhanced application designed for privacy, performance, and productivity. It combines a fast, responsive notepad with a multi-mode AI assistant powered by the Google Gemini API. All your data is securely stored in your personal Supabase account, making it accessible across all your devices while ensuring you are the sole owner of your data.

## Key Features

### Note-Taking and Organization
- **Secure & Private Cloud Sync:** All data is stored in your private Supabase project and protected by granular row-level security policies, ensuring only you can access your notes. Real-time, authenticated subscriptions keep all your devices perfectly in sync without compromising privacy.
- **Flexible Authentication:** Sign up quickly with an email and password or use the convenient one-click Google Sign-In option.
- **Drag & Drop Organization:** Intuitively organize your workspace by dragging notes and folders to reorder them or nest them within each other.
- **Rich Markdown Editor:** A full-featured Markdown editor with syntax highlighting and a live preview mode that supports tables, images, embedded videos, and more.
- **Cloud Image Storage:** Images are uploaded to secure Supabase Storage, keeping your note content clean and your database lean.
- **Smart Folders:** Create dynamic, saved searches that automatically display notes matching a specific AI-powered query.
- **Bi-Directional Linking:** Connect ideas by linking notes using `[[note-id|display text]]` syntax. A "Linked Mentions" section automatically displays all backlinks to the current note.
- **Tagging System:** Assign multiple tags to notes for flexible, cross-folder organization.

### AI-Powered by Google Gemini
- **Multimodal Input:** Provide visual context to the AI by attaching images to your prompts in any assistant mode via drag-and-drop or a file picker. The AI analyzes the image alongside your text for more accurate and relevant responses.
- **Multi-Mode AI Assistant:** A versatile AI assistant with three distinct modes for different tasks:
    - **Knowledge Assistant:** Engage in a conversation with your notes. Ask complex questions and receive synthesized answers with direct links to the source notes.
    - **Service Responder:** Transform your notes into an operational playbook. Paste a customer inquiry, and the AI will use your knowledge base to draft a professional, compliant response.
    - **General Assistant:** Your creative partner for brainstorming, drafting content, and asking general questions, with full access to your knowledge base.
- **Proactive Related Notes (AI Co-Pilot):** As you write, the AI analyzes your content in real-time to proactively surface semantically related notes from your knowledge base, helping you discover hidden connections and build a richer web of ideas without breaking your flow.
- **Self-Improving Intelligence:** A foundational feedback loop makes the AI smarter over time. The system logs every suggestion "impression" and user "click," creating an invaluable dataset to measure relevance and continuously refine the AI's performance.
- **Semantic Search:** Go beyond keyword matching to find notes based on their conceptual meaning.
- **Inline AI Assistant:** Select any text to fix spelling, adjust tone, expand or shorten, and simplify language.
- **Content Generation:** Automatically suggest descriptive titles and relevant tags based on your note's content.
- **Summarization & Action Items:** Generate a concise summary and extract a checklist of action items from your note with a single command.

### Productivity and Workflow
- **Optimized for Performance & Scale:** A highly-optimized Supabase backend with custom database indexing ensures data retrieval is instantaneous, providing a snappy experience even as your knowledge base grows to thousands of notes. The frontend is built with lazy-loading components for a fast initial load.
- **Full Keyboard Navigation:** Navigate the entire sidebar, select notes, and expand folders using only your keyboard for maximum efficiency.
- **Command Palette:** Press `Ctrl/Cmd + K` to access nearly every application feature, from creating notes to executing AI actions.
- **Slash Commands:** Type `/` in the editor to quickly insert headings, lists, to-do items, and more.
- **Drag & Drop Import:** Drag text or markdown files directly into the editor or onto a folder in the sidebar to instantly create new notes.
- **Full Data Portability:** Export your entire notepad—including all notes, folders, and templates—to a single JSON file for backup. Import a backup file to restore your data.
- **Note Templates:** Create and save reusable templates for frequently created documents.
- **Version History:** Automatically saves previous versions of your notes, allowing you to preview or restore them at any time.
- **Light and Dark Themes:** Choose between a light or dark interface for optimal viewing comfort.
- **Responsive Design:** A seamless experience across desktop, tablet, and mobile devices.

## Getting Started

### For Users (Hosted App)

1.  **Open the Application:** Navigate to the live application URL.
2.  **Sign Up / Sign In:** Create an account using your email and password or by signing in with your Google account.
3.  **Obtain a Gemini API Key:** The AI features require a free API key from Google.
    - Go to [Google AI Studio](https://ai.google.dev/).
    - Click "Get API key" and follow the on-screen instructions.
4.  **Configure the Application:**
    - After logging in, you will be greeted by a welcome screen. Follow the prompt to open Settings.
    - Click the Settings icon (gear) in the bottom-left corner of the sidebar.
    - Paste your API key into the "Gemini API Key" field and click "Save Settings".
5.  **Begin Writing:** Your API key is saved securely in your browser's local storage, and all AI features are now available for use.

### For Developers (Running Locally)

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Set Up Supabase:**
    - Create a new project on [Supabase](https://supabase.com/).
    - In your Supabase project, navigate to the **SQL Editor** and run the `schema.sql` script from this repository to set up your database tables and policies.
    - Go to **Settings** > **API**. Find your Project URL and your `public` anonymous key.
    - **Note on Supabase Storage:** The application will automatically attempt to create a public storage bucket named `note_images` for image uploads. Ensure your Supabase project has Storage enabled.
3.  **Configure the Client:**
    - Open the file: `lib/supabaseClient.ts`.
    - Replace the placeholder values for `supabaseUrl` and `supabaseAnonKey` with the keys from your Supabase project.
4.  **Install Dependencies & Run:**
    ```bash
    npm install
    npm run dev
    ```
5.  Follow the "For Users" guide above to sign up and add your Gemini API key within the running application.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend & Database:** Supabase (Authentication, PostgreSQL, Realtime Subscriptions, Storage)
- **AI Integration:** Google Gemini API (`@google/genai`)
- **State Management:** React Hooks and Context API

## WesAI Notepad v2.5 Roadmap

| Phase                               | Feature / Enhancement        | Description                                                                 | Impact | Effort | Notes                                                                                      |
|-------------------------------------|------------------------------|-----------------------------------------------------------------------------|--------|--------|--------------------------------------------------------------------------------------------|
| Phase 1 (Quick Wins / Core Loop)    | Inline Previews on Hover     | Show first ~150 chars or snippet of suggested notes on hover. Reduces context switching. | High   | Low    | Lazy-load snippets for performance. Lives in `RelatedNotes.tsx`.                           |
| Phase 1                             | CTR Analytics Dashboard      | Display click-through rates for AI suggestions. Quick visual insight on relevance. | High   | Medium | Use `ai_suggestion_feedback` table. Could be a simple table or chart in WNP.               |
| Phase 2 (Feedback-Driven Intelligence) | Dynamic Semantic Ranking     | Adjust suggestion ranking based on CTR data. Self-improving model.                  | High   | Medium | Starts simple: boost high-CTR suggestions. Later could use weighted ranking algorithm.      |
| Phase 2                             | Suggestion Quality Alerts    | Highlight notes with consistently low CTRs for review or pruning.             | Medium | Low    | Helps maintain knowledge base hygiene.                                                     |
| Phase 3 (Strategic Insights / Trend Analysis) | Trend Analysis Dashboard     | Aggregate patterns across notes to surface hot topics, frequent links, and emerging clusters. | High   | High   | Medium-term goal; leverages feedback + semantic connections.                               |
| Phase 3                             | Idea Consolidation / Merge   | Suggest related notes to merge or connect, building knowledge clusters.       | High   | Medium | Manual first, AI-assisted later. Strengthens long-term knowledge structure.                |

### Strategic Execution Order

1.  **Phase 1:** Polish the UX & collect actionable feedback (inline previews + CTR dashboard). Fast, visible wins.
2.  **Phase 2:** Let the system learn from its users (dynamic ranking + quality alerts). Boost intelligence with minimal UI disruption.
3.  **Phase 3:** Strategic insights & knowledge clustering. Big-picture leverage, higher effort, but fully grounded in the data we’ve already collected.

This roadmap ensures continuous user impact while progressively scaling intelligence, keeping our foundation stable and expanding the Notepad into a truly intelligent system.
