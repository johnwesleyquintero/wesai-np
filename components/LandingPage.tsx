import React from 'react';
import { LockClosedIcon, SparklesIcon, RocketLaunchIcon, TrendingUpIcon, Cog6ToothIcon, PencilSquareIcon, ServerStackIcon } from './Icons';

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
    const features = [
        {
            icon: <LockClosedIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Privacy-First Architecture',
            description: 'All data is securely stored and encrypted. Real-time, authenticated subscriptions keep all your devices perfectly in sync.',
        },
        {
            icon: <SparklesIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'AI-Powered Intelligence',
            description: 'Leverage a multi-mode assistant, semantic search, and proactive suggestions. Turn your knowledge base into an operational co-pilot.',
        },
        {
            icon: <RocketLaunchIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Productivity Workflow',
            description: 'A full-featured Markdown editor, bi-directional linking, command palette, and full data portability to streamline your process from idea to execution.',
        },
    ];
    
    const principles = [
        {
            icon: <TrendingUpIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Leverage Challenges into Opportunities',
            description: 'Built to turn complex problems into actionable insights and strategic advantages.',
        },
        {
            icon: <Cog6ToothIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Prioritize Competence over Convention',
            description: 'A no-nonsense tool designed for operators who value results and efficiency above all else.',
        },
        {
            icon: <LockClosedIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />,
            title: 'Build for Strategic Independence',
            description: 'Your data, your systems. This is a sovereign, intelligent tool for turning your ideas into action.',
        }
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
                            <rect width="64" height="64" rx="12" fill="#60a5fa" />
                            <path d="M20 18C20 15.7909 21.7909 14 24 14H44C46.2091 14 48 15.7909 48 18V46C48 48.2091 46.2091 50 44 50H24C21.7909 50 20 48.2091 20 46V18Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M24 14V50" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-bold text-lg">WesAI Notepad</span>
                    </div>
                    <button onClick={onGetStarted} className="px-4 py-2 text-sm font-semibold rounded-md border border-light-border dark:border-dark-border hover:bg-light-ui dark:hover:bg-dark-ui transition-colors">
                        Launch App
                    </button>
                </div>
            </header>

            <main>
                <section className="pt-32 pb-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 -z-10 bg-light-ui/30 dark:bg-dark-ui/30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-light-text dark:text-dark-text">
                            Your personal knowledge system,<br /> transformed into a powerful operational tool.
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-light-text/70 dark:text-dark-text/70">
                            A secure, AI-enhanced notepad with real-time cloud sync, featuring a multi-mode Gemini assistant.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <button onClick={onGetStarted} className="px-8 py-3 bg-light-primary text-white dark:bg-dark-primary dark:text-zinc-900 rounded-md text-lg font-semibold hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition-transform hover:scale-105">
                                Get Started for Free
                            </button>
                        </div>
                         <div className="mt-16 mx-auto max-w-4xl h-80 bg-zinc-900 rounded-xl shadow-2xl p-4 border border-zinc-700 flex flex-col font-mono text-sm text-zinc-400 overflow-hidden relative">
                            <div className="animate-step1">
                                <p className="text-zinc-500">// Messy meeting notes...</p>
                                <p><span className="text-zinc-500">&gt;</span> Discuss Q3 launch</p>
                                <p><span className="text-zinc-500">&gt;</span> John: need to finalize marketing copy</p>
                                <p><span className="text-zinc-500">&gt;</span> Jane: budget is tight, focus on organic</p>
                                <p><span className="text-zinc-500">&gt;</span> Action: JW to draft blog post</p>
                            </div>
                            <div className="animate-step2">
                                <p className="text-green-400">/summarize<span className="inline-block w-px h-4 bg-green-400 animate-pulse ml-0.5"></span></p>
                            </div>
                            <div className="animate-step3">
                                <p className="text-zinc-300 font-bold">[✨ AI Summary]</p>
                                <p className="text-zinc-300">The team discussed the Q3 launch, noting a tight budget requires a focus on organic marketing. John will draft a blog post to support this.</p>
                                <p className="text-zinc-300 font-bold mt-2">[✅ Action Items]</p>
                                <p className="text-zinc-300">- [ ] Finalize Q3 marketing copy</p>
                                <p className="text-zinc-300">- [ ] Draft blog post for organic marketing</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-light-ui/50 dark:bg-dark-ui/50">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-10">
                            {features.map((feature, index) => (
                                <div key={index} className="text-center">
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 bg-light-background dark:bg-dark-background rounded-full border border-light-border dark:border-dark-border">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{feature.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70">{feature.description}</p>
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
                            <h2 className="text-3xl font-bold">A Power Tool for Every Thinker</h2>
                            <p className="mt-4 text-lg text-light-text/70 dark:text-dark-text/70">
                                Whether you're building a company, running a team, or creating content, WesAI Notepad adapts to your workflow.
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

                <section className="py-24 bg-light-background dark:bg-dark-background">
                    <div className="container mx-auto px-4 text-center max-w-5xl">
                        <h2 className="text-3xl font-bold mb-12">The Philosophy</h2>
                        <div className="grid md:grid-cols-3 gap-10">
                            {principles.map((principle, index) => (
                                 <div key={index} className="text-center">
                                    <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 bg-light-ui/50 dark:bg-dark-ui/50 rounded-full border border-light-border dark:border-dark-border">
                                        {principle.icon}
                                    </div>
                                    <h3 className="text-xl font-bold">{principle.title}</h3>
                                    <p className="mt-2 text-light-text/70 dark:text-dark-text/70">{principle.description}</p>
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
                            Launch WesAI Notepad
                        </button>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t border-light-border dark:border-dark-border">
                <div className="container mx-auto px-4 text-center text-sm text-light-text/60 dark:text-dark-text/60">
                    &copy; {new Date().getFullYear()} WesAI Notepad. All Rights Reserved. Version 1.1.0
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;