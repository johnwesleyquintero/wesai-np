import React from 'react';
import { CheckIcon } from './Icons';

interface OnboardingStep {
    id: string;
    text: string;
    isComplete: boolean;
}

interface OnboardingChecklistProps {
    steps: OnboardingStep[];
}

const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ steps }) => {
    const completedCount = steps.filter(step => step.isComplete).length;
    const progress = (completedCount / steps.length) * 100;
    const circumference = 2 * Math.PI * 14; // 2 * pi * r (radius is 14)
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="mb-4 p-4 bg-light-background dark:bg-dark-background rounded-lg border border-light-border dark:border-dark-border">
            <div className="flex items-start gap-4">
                <div className="relative w-8 h-8 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 32 32">
                        <circle
                            className="text-light-ui dark:text-dark-ui"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            r="14"
                            cx="16"
                            cy="16"
                        />
                        <circle
                            className="text-light-primary dark:text-dark-primary"
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="14"
                            cx="16"
                            cy="16"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s' }}
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-light-text/70 dark:text-dark-text/70">
                        {completedCount}/{steps.length}
                    </span>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm">Getting Started</h3>
                    <ul className="mt-2 space-y-1.5">
                        {steps.map(step => (
                            <li key={step.id} className="flex items-center text-sm">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 border-2 ${step.isComplete ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary' : 'border-light-border dark:border-dark-border'}`}>
                                    {step.isComplete && <CheckIcon className="w-3 h-3 text-white dark:text-zinc-900" />}
                                </div>
                                <span className={`${step.isComplete ? 'line-through text-light-text/60 dark:text-dark-text/60' : 'text-light-text dark:text-dark-text'}`}>
                                    {step.text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default OnboardingChecklist;
