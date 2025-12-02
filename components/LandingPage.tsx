
import React, { useEffect, useRef } from 'react';
import { useUIContext } from '../context/AppContext';
import { 
    SparklesIcon, 
    GraphIcon, 
    DocumentTextIcon, 
    MagnifyingGlassIcon, 
    ServerStackIcon, 
    ArrowTopRightOnSquareIcon,
    SunIcon,
    MoonIcon,
    BoltIcon
} from './Icons';

// --- Shared Components for the Landing Page ---

const FeatureCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}> = ({ title, description, icon, className = "", children }) => (
    <div className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm transition-all hover:shadow-md ${className}`}>
        <div className="flex flex-col h-full justify-between relative z-10">
            <div>
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-200 dark:ring-zinc-700">
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
            </div>
            {children && <div className="mt-6">{children}</div>}
        </div>
        {/* Subtle gradient glow on hover */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gradient-to-br from-light-primary/5 to-transparent dark:from-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
);

const MiniAppPreview = () => (
    <div className="relative w-full max-w-4xl mx-auto h-[400px] bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col font-sans select-none">
        {/* Fake Window Controls */}
        <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 space-x-2 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 hidden sm:flex flex-col gap-2">
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-4"></div>
                <div className="space-y-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded">
                            <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-sm"></div>
                            <div className="h-2 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 p-8 bg-white dark:bg-zinc-950 relative">
                <div className="max-w-lg mx-auto">
                    <div className="h-8 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded mb-6 animate-pulse"></div>
                    <div className="space-y-3">
                        <div className="h-3 w-full bg-zinc-50 dark:bg-zinc-900 rounded"></div>
                        <div className="h-3 w-11/12 bg-zinc-50 dark:bg-zinc-900 rounded"></div>
                        <div className="h-3 w-full bg-zinc-50 dark:bg-zinc-900 rounded"></div>
                        <div className="h-3 w-4/5 bg-zinc-50 dark:bg-zinc-900 rounded"></div>
                    </div>
                    {/* Floating Chat UI */}
                    <div className="absolute bottom-6 right-6 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-3">
                        <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <SparklesIcon className="w-3 h-3 text-indigo-500" />
                            </div>
                            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2 text-[10px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                I found 3 notes related to "Q3 Strategy". Linking them now.
                            </div>
                        </div>
                        <div className="h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-md"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const LandingPage: React.FC<{ onGetStarted: () => void; onEnterDemo: () => void; }> = ({ onGetStarted, onEnterDemo }) => {
    const { toggleTheme } = useUIContext();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('scroll-animate-visible');
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (scrollRef.current) {
            Array.from(scrollRef.current.children).forEach((child) => {
                observer.observe(child);
            });
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div className="w-full min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 selection:bg-indigo-500/20">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>

            {/* Navbar */}
            <nav className="sticky top-0 z-50 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="64" height="64" rx="12" className="fill-white dark:fill-zinc-950"/>
                            <g className="stroke-zinc-900 dark:stroke-zinc-50">
                                <path d="M32 14L16 25V39L32 50L48 39V25L32 14Z" strokeWidth="4"/>
                                <path d="M32 22L22 29V37L32 44L42 37V29L32 22Z" strokeWidth="2"/>
                                <path d="M16 25L22 29" strokeWidth="2"/>
                                <path d="M48 25L42 29" strokeWidth="2"/>
                                <path d="M16 39L22 37" strokeWidth="2"/>
                                <path d="M48 39L42 37" strokeWidth="2"/>
                                <path d="M32 14V22" strokeWidth="2"/>
                                <path d="M32 50V44" strokeWidth="2"/>
                            </g>
                        </svg>
                        WesCore
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                            <SunIcon className="w-5 h-5 hidden dark:block" />
                            <MoonIcon className="w-5 h-5 block dark:hidden" />
                        </button>
                        <button 
                            onClick={onGetStarted}
                            className="text-sm font-medium px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Launch App
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 pt-24 pb-32">
                
                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        v2.2 Now Live: Gemini 2.5 Integration
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6 leading-[1.1]">
                        Your Second Brain,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">Supercharged.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        A private, AI-native operating system for your work. <br className="hidden md:block"/>
                        Write, organize, and analyze with a Co-pilot that actually understands your notes.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <button 
                            onClick={onGetStarted}
                            className="px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold text-lg hover:transform hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-xl"
                        >
                            Start Building
                        </button>
                        <button 
                            onClick={onEnterDemo}
                            className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold text-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                            Try Demo <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                </div>

                {/* Hero Visual */}
                <div className="mb-32 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <MiniAppPreview />
                </div>

                {/* The "Bento" Feature Grid */}
                <div ref={scrollRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                    
                    {/* Item 1: Co-pilot (Wide) */}
                    <FeatureCard 
                        title="Context-Aware Co-pilot" 
                        description="Unlike standard chatbots, WesCore's AI has read-access to your entire knowledge base. It cites sources, finds connections, and helps you synthesize information from across your workspace."
                        icon={<SparklesIcon className="w-6 h-6 text-indigo-500" />}
                        className="md:col-span-2 md:row-span-1"
                    >
                        <div className="mt-4 flex gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Capabilities</span>
                            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700">RAG</span>
                            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700">Function Calling</span>
                            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700">Web Grounding</span>
                        </div>
                    </FeatureCard>

                    {/* Item 2: The Graph */}
                    <FeatureCard 
                        title="Networked Thought" 
                        description="Visualize your ideas. Bi-directional linking creates a dynamic knowledge graph, revealing hidden clusters and hot topics in your thinking."
                        icon={<GraphIcon className="w-6 h-6 text-emerald-500" />}
                    />

                    {/* Item 3: Semantic Search */}
                    <FeatureCard 
                        title="Semantic Retrieval" 
                        description="Stop remembering file names. Find notes by concept or meaning using AI-powered vector search."
                        icon={<MagnifyingGlassIcon className="w-6 h-6 text-amber-500" />}
                    />

                    {/* Item 4: The Editor (Wide) */}
                    <FeatureCard 
                        title="Flow State Editor" 
                        description="A distraction-free Markdown environment with slash commands, syntax highlighting, auto-formatting, and inline AI tools to rewrite, shorten, or expand your text."
                        icon={<DocumentTextIcon className="w-6 h-6 text-rose-500" />}
                        className="md:col-span-2"
                    >
                         <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-500">
                            /summarize<br/>
                            /synced-block<br/>
                            /todo
                        </div>
                    </FeatureCard>

                     {/* Item 5: Privacy */}
                     <FeatureCard 
                        title="Private by Default" 
                        description="Your data lives in your secure cloud bucket. Your API key stays in your browser. No middleman."
                        icon={<ServerStackIcon className="w-6 h-6 text-zinc-500" />}
                    />
                     
                     {/* Item 6: Automation */}
                     <FeatureCard 
                        title="Workflow Automation" 
                        description="The AI doesn't just talk; it acts. It can create notes, organize folders, and restructure your data on command."
                        icon={<BoltIcon className="w-6 h-6 text-blue-500" />}
                        className="md:col-span-2"
                    />

                </div>

            </main>

            <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-12">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        &copy; {new Date().getFullYear()} WesCore. Built for Operators.
                    </div>
                    <div className="flex gap-6">
                        <a href="#" onClick={onEnterDemo} className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-500 transition-colors">Demo</a>
                        <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-500 transition-colors">Powered by Gemini</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
