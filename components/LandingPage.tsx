import React from 'react';
import { LockClosedIcon, SparklesIcon, RocketLaunchIcon, TrendingUpIcon, Cog6ToothIcon, PencilSquareIcon, ServerStackIcon } from './Icons';

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const templates = [
        {
            icon: <PencilSquareIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Amazon Listing Optimization',
            description: 'Analyze ASINs, generate optimized listing suggestions, and manage product content workflows.',
        },
        {
            icon: <SparklesIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Automated Customer AI',
            description: 'Draft professional responses, handle FAQs, and manage customer service workflows with AI assistance.',
        },
        {
            icon: <RocketLaunchIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Content & Data Analysis',
            description: 'Process VOC insights, benchmark competitors, and generate content strategies from raw data.',
        },
    ];

    const useCases = [
        {
            icon: <RocketLaunchIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'For Founders & Strategists',
            description: 'Connect market research, meeting notes, and roadmaps. Use the AI to synthesize information and find the signal in the noise.',
        },
        {
            icon: <Cog6ToothIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'For Operators & Managers',
            description: 'Build your operational playbook. Document processes, draft customer responses, and ensure team consistency with an AI-powered knowledge base.',
        },
        {
            icon: <PencilSquareIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'For Creators & Writers',
            description: 'Organize research, conquer writer\'s block, and refine your drafts. Let the AI assistant help you expand on ideas and structure your masterpiece.',
        },
    ];

    return (
        <div className="w-full min-h-screen bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text">
            <header className="absolute top-0 left-0 right-0 p-4 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <g className="stroke-light-primary dark:stroke-dark-primary">
                                <path d="M32 14L16 23V41L32 50L48 41V23L32 14Z" strokeWidth="4"/>
                                <path d="M32 24L22 29.5V40.5L32 46L42 40.5V29.5L32 24Z" strokeWidth="2"/>
                                <path d="M16 23L22 29.5" strokeWidth="2"/>
                                <path d="M48 23L42 29.5" strokeWidth="2"/>
                                <path d="M16 41L22 40.5" strokeWidth="2"/>
                                <path d="M48 41L42 40.5" strokeWidth="2"/>
                                <path d="M32 14V24" strokeWidth="2"/>
                                <path d="M32 50V46" strokeWidth="2"/>
                            </g>
                        </svg>
                        <span className="font-bold text-lg">WesCore</span>
                    </div>
                    <button onClick={onGetStarted} className="px-4 py-2 text-sm font-semibold rounded-md border border-light-border dark:border-dark-border hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                        Launch Cockpit
                    </button>
                </div>
            </header>

            <main>
                <section className="pt-32 pb-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-light-ui/30 dark:bg-dark-ui/30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
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
                                <p className="text-slate-500">// Messy meeting notes...</p>
                                <p><span className="text-slate-500">&gt;</span> Discuss Q3 launch</p>
                                <p><span className="text-slate-500">&gt;</span> John: need to finalize marketing copy</p>
                                <p><span className="text-slate-500">&gt;</span> Jane: budget is tight, focus on organic</p>
                                <p><span className="text-slate-500">&gt;</span> Action: JW to draft blog post</p>
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

                <section className="py-20 bg-light-ui/50 dark:bg-dark-ui/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold">Start with Core Templates</h2>
                             <p className="mt-4 text-lg text-light-text/70 dark:text-dark-text/70">
                                WesCore is a modular platform. Begin with our MVP templates, then expand to any domain.
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-10">
                            {templates.map((template, index) => (
                                <div key={index} className="text-center">
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
                
                 <section className="py-24 bg-light-background dark:bg-dark-background">
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

                <section className="py-20 bg-light-ui/50 dark:bg-dark-ui/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-3xl font-bold">A Power Tool for Every Operator</h2>
                            <p className="mt-4 text-lg text-light-text/70 dark:text-dark-text/70">
                                Whether you're building a company, running a team, or creating content, WesCore adapts to your workflow.
                            </p>
                        </div>
                        <div className="mt-16 grid md:grid-cols-3 gap-10">
                            {useCases.map((useCase, index) => (
                                <div key={index}>
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

                <section className="py-20">
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