import React, { useEffect, useState, useMemo } from 'react';
import { useStoreContext } from '../context/AppContext';
import { ChartBarIcon, SparklesIcon, ExclamationTriangleIcon } from './Icons';
import AnalyticsDashboardSkeleton from './AnalyticsDashboardSkeleton';

interface AnalyticsData {
    sourceNoteId: string;
    sourceNoteTitle: string;
    suggestedNoteId: string;
    suggestedNoteTitle: string;
    impressions: number;
    clicks: number;
    ctr: number;
}

const MIN_IMPRESSIONS_FOR_ALERT = 20;
const MAX_CTR_FOR_ALERT = 5; // 5%

const AnalyticsDashboard: React.FC = () => {
    const { getSuggestionAnalytics, notes } = useStoreContext();
    const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            const data = await getSuggestionAnalytics();
            const noteMap = new Map(notes.map(n => [n.id, n.title]));
            
            const enrichedData = data.map(item => ({
                ...item,
                sourceNoteTitle: noteMap.get(item.sourceNoteId) || 'Deleted Note',
                suggestedNoteTitle: noteMap.get(item.suggestedNoteId) || 'Deleted Note',
            })).sort((a, b) => b.impressions - a.impressions);

            setAnalytics(enrichedData);
            setIsLoading(false);
        };
        fetchAnalytics();
    }, [getSuggestionAnalytics, notes]);

    if (isLoading) {
        return <AnalyticsDashboardSkeleton />;
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <ChartBarIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />
                    CTR Analytics
                </h1>
                <p className="text-light-text/60 dark:text-dark-text/60 mt-1">
                    Click-through rates for the "AI-Suggested Related Notes" feature.
                </p>
            </header>
            
            {analytics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-light-text/60 dark:text-dark-text/60 p-4 rounded-lg bg-light-ui/50 dark:bg-dark-ui/50">
                    <SparklesIcon className="w-16 h-16 mb-4" />
                    <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">No Suggestion Data Yet</h2>
                    <p className="mt-1">As you use the app, AI will suggest related notes while you're writing. <br />This dashboard will track how often those suggestions are clicked.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-light-border dark:border-dark-border">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                        <thead className="bg-light-ui dark:bg-dark-ui">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text/80 dark:text-dark-text/80 uppercase tracking-wider">Source Note</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text/80 dark:text-dark-text/80 uppercase tracking-wider">Suggested Note</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text/80 dark:text-dark-text/80 uppercase tracking-wider">Impressions</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text/80 dark:text-dark-text/80 uppercase tracking-wider">Clicks</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-light-text/80 dark:text-dark-text/80 uppercase tracking-wider">CTR</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-background dark:bg-dark-background divide-y divide-light-border dark:divide-dark-border">
                            {analytics.map((item, index) => {
                                const needsReview = item.impressions >= MIN_IMPRESSIONS_FOR_ALERT && item.ctr < MAX_CTR_FOR_ALERT;
                                return (
                                    <tr key={`${item.sourceNoteId}-${item.suggestedNoteId}-${index}`} className="hover:bg-light-ui/50 dark:hover:bg-dark-ui/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-light-text dark:text-dark-text">
                                            <div className="flex items-center gap-2">
                                                {needsReview && (
                                                    <div className="relative group flex-shrink-0">
                                                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                            Low CTR: Suggestion needs review
                                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800" />
                                                        </div>
                                                    </div>
                                                )}
                                                <span className="truncate">{item.sourceNoteTitle}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">{item.suggestedNoteTitle}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text/80 dark:text-dark-text/80">{item.impressions}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text/80 dark:text-dark-text/80">{item.clicks}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-light-primary dark:text-dark-primary">{item.ctr.toFixed(2)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;