import React, { useState, useRef, ReactNode } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { ChevronDownIcon } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccordionItem: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-light-border dark:border-dark-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-4 font-semibold"
            >
                {title}
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="pb-4 text-light-text/80 dark:text-dark-text/80">{children}</div>}
        </div>
    );
};

const ChangelogContent = () => (
    <div className="space-y-6 text-sm">
        <div>
            <h3 className="font-bold text-base mb-2">July 30, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">Manual Save in Editor:</strong> Replaced the automatic "saving..." indicator with an explicit "Save" button. This gives you more control and a calmer writing environment, while still saving your work automatically if you navigate away.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 29, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">UI Polish & Refinements:</strong> Reorganized the Settings modal into clear tabs (General, Templates, Data), streamlined the AI chat action bar with icons for a cleaner look, and added visual dividers to context menus for better grouping of actions.</li>
                <li><strong className="font-semibold">Active Path Highlighting:</strong> The sidebar now highlights the entire folder path of the active note, making it easier to see where you are in your workspace.</li>
                <li><strong className="font-semibold">Consistent Error Handling:</strong> Centralized AI error reporting into the global notification system for a more consistent and less intrusive user experience.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 28, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">AI-Driven Onboarding:</strong> Replaced the static checklist with a generative onboarding experience. New users are now greeted with AI-crafted notes that guide them through the app's core features.</li>
                <li><strong className="font-semibold">Saved Chat Responders:</strong> Added the ability to save and quickly reuse common prompts in the "Responder" chat mode, accelerating customer service workflows.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 27, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">Enhanced AI Feedback:</strong> Added one-click reason tags (e.g., "Incorrect") when downvoting an AI chat response to provide more detailed feedback for model improvement.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 26, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">Help Center Added:</strong> You're looking at it! A new central place for help and to see what's new.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 25, 2024</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">Edit Last Chat Message:</strong> Press `ArrowUp` in an empty chat input to recall and edit your last message.</li>
                <li><strong className="font-semibold">Improved Notifications:</strong> Toast notifications now have a manual dismiss button for better control.</li>
            </ul>
        </div>
        <div>
            <h3 className="font-bold text-base mb-2">July 24, 2024</h3>
             <ul className="list-disc pl-5 space-y-1">
                <li><strong className="font-semibold">UI Polish:</strong> Added loading indicators to AI search and empty states for sidebar sections to improve user feedback.</li>
            </ul>
        </div>
    </div>
);

const HelpContent = () => (
    <div className="text-sm">
        <AccordionItem title="How do I use the AI features?">
            <p className="mb-2">All AI features, including chat and content generation, require a Google Gemini API key.</p>
            <ol className="list-decimal pl-5 space-y-1">
                <li>Get a free API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="font-semibold text-light-primary dark:text-dark-primary hover:underline">Google AI Studio</a>.</li>
                <li>Open **Settings** (gear icon) in the sidebar.</li>
                <li>Paste your key into the "Gemini API Key" field and save.</li>
            </ol>
        </AccordionItem>
        <AccordionItem title="What are Smart Folders?">
            <p>Smart Folders are like saved searches that stay up-to-date. They use AI to automatically find and display notes that match a conceptual query you provide, like "all notes about marketing strategies from last month".</p>
        </AccordionItem>
         <AccordionItem title="How do I link notes?">
            <p className="mb-2">You can create links between notes to build a web of knowledge. When you're in a note, you can see all the notes that link to it in the "Linked Mentions" section.</p>
             <p>To create a link, type `[[` to open the note linker, search for the note you want to link to, and press Enter. You can also right-click a note in the sidebar and select "Copy Note Link" to get the link syntax.</p>
        </AccordionItem>
        <AccordionItem title="What are the key keyboard shortcuts?">
             <ul className="list-disc pl-5 space-y-2">
                <li><kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd> - Open Command Palette</li>
                <li><kbd>Cmd/Ctrl</kbd> + <kbd>Z</kbd> - Undo</li>
                 <li><kbd>/</kbd> (in editor) - Open Slash Commands</li>
                 <li><kbd>ArrowUp</kbd> (in empty chat) - Edit last message</li>
            </ul>
        </AccordionItem>
    </div>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useModalAccessibility(isOpen, onClose, modalRef);
    const [activeTab, setActiveTab] = useState<'changelog' | 'help'>('changelog');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-modal-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <h2 id="help-modal-title" className="text-2xl font-bold">Help & What's New</h2>
                </div>
                
                <div className="px-6 border-b border-light-border dark:border-dark-border flex-shrink-0">
                    <div className="flex -mb-px">
                        <button 
                            onClick={() => setActiveTab('changelog')}
                            className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === 'changelog' ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary' : 'border-transparent text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text'}`}
                        >
                            What's New
                        </button>
                        <button 
                            onClick={() => setActiveTab('help')}
                            className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === 'help' ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary' : 'border-transparent text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text'}`}
                        >
                            Help Center
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    {activeTab === 'changelog' ? <ChangelogContent /> : <HelpContent />}
                </div>

                <div className="flex justify-end items-center space-x-4 p-6 border-t border-light-border dark:border-dark-border flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-light-primary text-white rounded-md hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;