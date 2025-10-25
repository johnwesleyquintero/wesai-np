import React, { useEffect, useRef } from 'react';
import { useUIContext } from '../context/AppContext';
import { LockClosedIcon, SparklesIcon, MagnifyingGlassIcon, TrendingUpIcon, Cog6ToothIcon, PencilSquareIcon, ServerStackIcon, SunIcon, MoonIcon } from './Icons';

// Moved static data outside the component for performance and clarity.
const templates = [
    {
        id: 'amazon-listing',
        icon: <PencilSquareIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'Amazon Listing Optimization',
        description: 'Analyze ASINs, generate optimized listing suggestions, and manage product content workflows.',
    },
    {
        id: 'customer-ai',
        icon: <SparklesIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'Automated Customer AI',
        description: 'Draft professional responses, handle FAQs, and manage customer service workflows with AI assistance.',
    },
    {
        id: 'data-analysis',
        icon: <TrendingUpIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'Content & Data Analysis',
        description: 'Process VOC insights, benchmark competitors, and generate content strategies from raw data.',
    },
];

const useCases = [
    {
        id: 'founders',
        icon: <MagnifyingGlassIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'For Founders & Strategists',
        description: 'Connect market research, meeting notes, and roadmaps. Use the AI to synthesize information and find the signal in the noise.',
    },
    {
        id: 'operators',
        icon: <Cog6ToothIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'For Operators & Managers',
        description: 'Build your operational playbook. Document processes, draft customer responses, and ensure team consistency with an AI-powered knowledge base.',
    },
    {
        id: 'creators',
        icon: <PencilSquareIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
        title: 'For Creators & Writers',
        description: 'Organize research, conquer writer\'s block, and refine your drafts. Let the AI assistant help you expand on ideas and structure your masterpiece.',
    },
];


const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const { theme, toggleTheme } = useUIContext();
    const sectionsRef = useRef<Array<HTMLElement | null>>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        // Adding a slight delay based on index for a staggered effect
                        setTimeout(() => {
                            entry.target.classList.add('scroll-animate-visible');
                        }, 100);
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '0px 0px -50px 0px', // Trigger a bit before it's fully in view
            }
        );

        const currentSections = sectionsRef.current.filter(Boolean);
        currentSections.forEach((section) => {
            if (section) observer.observe(section);
        });

        return () => {
            currentSections.forEach((section) => {
                if (section) observer.unobserve(section);
            });
            observer.disconnect();
        };
    }, []);

    return (
        <div className="w-full min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
            <header className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="64" height="64" rx="12" className="fill-light-background dark:fill-dark-background" />
                            <g className="stroke-light-primary dark:stroke-dark-primary">
                                <path d="M32 14L16 25V39L32 50L48 39V25L32 14Z" strokeWidth="4" />
                                <path d="M32 22L22 29V37L32 44L42 37V29L32 22Z" strokeWidth="2" />
                                <path d="M16 25L22 29" strokeWidth="2" />
                                <path d="M48 25L42 29" strokeWidth="2" />
                                <path d="M16 39L22 37" strokeWidth="2" />
                                <path d="M48 39L42 37" strokeWidth="2" />
                                <path d="M32 14V22" strokeWidth="2" />
                                <path d="M32 50V44" strokeWidth="2" />
                            </g>
                        </svg>
                        <span className="font-bold text-lg">WesCore</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-md border border-transparent hover:border-light-border dark:hover:border-dark-border hover:bg-light-ui dark:hover:bg-dark-ui transition-colors"
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={onGetStarted} className="px-4 py-2 text-sm font-semibold rounded-md border border-light-border dark:border-dark-border hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                            Launch Cockpit
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <section className="pt-32 pb-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-light-ui/30 dark:bg-dark-ui/30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500 bg-clip-text text-transparent">
                            One cockpit, endless AI-powered workflows.
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-light-text/70 dark:text-dark-text/70">
                            The operator-first platform for building, executing, and automating high-value work. Powered by the engine you already trust.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <button onClick={onGetStarted} className="px-8 py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md text-lg font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition-transform hover:scale-105">
                                Launch Your Workflow
                            </button>
                        </div>
                        <div className="mt-16 mx-auto max-w-4xl h-80 bg-slate-900 rounded-xl shadow-2xl p-4 border border-slate-700 flex flex-col font-mono text-sm text-slate-400 overflow-hidden relative">
                            <div className="animate-step1">
                                <p className="text-slate-500"> // Messy meeting notes...</p>
                                <p><span className="text-slate-500">&gt;</span> Discuss Q3 launch</p>
                                <p><span className="text-slate-500">&gt;</span> John: need to finalize marketing copy</p>
                                <p><span className="text-slate-500">&gt;</span> Jane: budget is tight, focus on organic</p>
                                {/* FIX: Removed invalid closing </span> tag which was causing a JSX parsing error. */}
                                <p className="text-slate-500">&gt; Action: JW to draft blog post</p>
                            </div>
                            <div className="animate-step2">
                                <p className="text-cyan-400">/summarize<span className="inline-block w-px h-4 bg-cyan-400 animate-pulse ml-0.5"></span></p>
                            </div>
                            <div className="animate-step3">
                                <p className="text-slate-300 font-bold">[✨ AI Summary]</p>
                                <p className="text-slate-300">The team discussed the Q3 launch, noting a tight budget requires a focus on organic marketing. John will draft a blog post to support this.</p>
                                <p className="text-slate-300 font-bold mt-2">[✅ Action Items]</p>
                                <p className="text-slate-300">- [ ] Finalize Q3 marketing copy</p>
                                <p className="text-slate-300">- [ ] Draft blog post for organic marketing</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section ref={el => { sectionsRef.current[0] = el; }} className="py-20 bg-light-ui/50 dark:bg-dark-ui/50 scroll-animate">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold">Start with Core Templates</h2>
                            <p className="mt-4 text-lg text-light-text/70 dark:text-dark-text/70">
                                WesCore is a modular platform. Begin with our MVP templates, then expand to any domain.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-10">
                            {templates.map((template) => (
                                <div key={template.id} className="text-center">
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 bg-light-background dark:bg-dark-background rounded-full border border-light-border dark:border-dark-border">
                                        {template.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{template.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                <section ref={el => { sectionsRef.current[1] = el; }} className="py-24 bg-light-background dark:bg-dark-background scroll-animate">
                    <div className="container mx-auto px-4 text-center max-w-4xl">
                        <h2 className="text-3xl font-bold mb-2">Built for Security and Performance</h2>
                        <p className="text-lg text-light-text/70 dark:text-dark-text/70 mb-12">A robust backend for a seamless experience. Built on a foundation of privacy and power.</p>
                        <div className="grid md:grid-cols-2 gap-8 text-left">
                            <div className="bg-light-ui/50 dark:bg-dark-ui/50 p-6 rounded-lg border border-light-border dark:border-dark-border">
                                <ServerStackIcon className="w-8 h-8 mb-3 text-light-primary dark:text-dark-primary" />
                                <h3 className="text-xl font-bold">Secure Cloud Backend</h3>
                                <p className="mt-2 text-light-text/70 dark:text-dark-text/70">Your data is protected with enterprise-grade security and real-time sync, all managed for you. No setup required.</p>
                            </div>
                            <div className="bg-light-ui/50 dark:bg-dark-ui/50 p-6 rounded-lg border border-light-border dark:border-dark-border">
                                <SparklesIcon className="w-8 h-8 mb-3 text-light-primary dark:text-dark-primary" />
                                <h3 className="text-xl font-bold">Your Personal AI with Gemini</h3>
                                <p className="mt-2 text-light-text/70 dark:text-dark-text/70">Connect your own Gemini API key to unlock a powerful multi-mode assistant. Your key is stored locally, ensuring your interactions with the AI remain private.</p>
                            </div>
                        </div>
                    </div>
                </section>
                <section ref={el => { sectionsRef.current[2] = el; }} className="py-20 bg-light-ui/50 dark:bg-dark-ui/50 scroll-animate">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold">A Power Tool for Every Operator</h2>
                            <p className="mt-4 text-lg text-light-text/70 dark:text-dark-text/70">
                                Whether you're building a company, running a team, or creating content, WesCore adapts to your workflow.
                            </p>
                        </div>
                        <div className="mt-16 grid md:grid-cols-3 gap-10">
                            {useCases.map((useCase) => (
                                <div key={useCase.id}>
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-6 bg-light-background dark:bg-dark-background rounded-full border border-light-border dark:border-dark-border">
                                        {useCase.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-center">{useCase.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70 text-center">{useCase.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                <section ref={el => { sectionsRef.current[3] = el; }} className="py-20 scroll-animate">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold">Ready to build your second brain?</h2>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-light-text/70 dark:text-dark-text/70">
                            Take control of your data and unlock the power of AI in your personal knowledge base.
                        </p>
                        <button onClick={onGetStarted} className="mt-8 px-8 py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md text-lg font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition-transform hover:scale-105">
                            Launch WesCore
                        </button>
                    </div>
                </section>
            </main>
            <footer className="py-8 border-t border-light-border dark:border-dark-border">
                <div className="container mx-auto px-4 text-center text-sm text-light-text/60 dark:text-dark-text/60">
                    &copy; {new Date().getFullYear()} WesCore by ScaleSmart. All Rights Reserved. Version 2.0.0
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;