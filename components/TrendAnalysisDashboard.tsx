import React, { useEffect, useState, Suspense } from 'react';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { TrendingUpIcon, LinkIcon, SparklesIcon, DocumentTextIcon } from './Icons';
import TrendAnalysisDashboardSkeleton from './TrendAnalysisDashboardSkeleton';
import { Note } from '../types';

const ConsolidationSuggestionModal = React.lazy(() => import('./ConsolidationSuggestionModal'));

interface HotTopic extends Note {
    score: number;
    incoming: number;
    outgoing: number;
}

interface FrequentConnection {
    sourceNote: Note;
    suggestedNote: Note;
    count: number;
}

const TrendAnalysisDashboard: React.FC = () => {
    const { getTrendAnalytics, notes } = useStoreContext();
    const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
    const [connections, setConnections] = useState<FrequentConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [consolidationPair, setConsolidationPair] = useState<[Note, Note] | null>(null);

    useEffect(() => {
        const fetchTrends = async () => {
            setIsLoading(true);
            const { hotTopics: rawHotTopics, mostFrequentConnections: rawConnections } = await getTrendAnalytics();
            const noteMap = new Map(notes.map(n => [n.id, n]));

            const enrichedHotTopics = rawHotTopics
                .map((topic: any) => ({
                    ...(noteMap.get(topic.noteId) as Note),
                    ...topic,
                }))
                .filter(Boolean);

            const enrichedConnections = rawConnections
                .map((conn: any) => ({
                    sourceNote: noteMap.get(conn.sourceNoteId),
                    suggestedNote: noteMap.get(conn.suggestedNoteId),
                    count: conn.count,
                }))
                .filter((c: any) => c.sourceNote && c.suggestedNote);

            setHotTopics(enrichedHotTopics);
            setConnections(enrichedConnections);
            setIsLoading(false);
        };

        if (notes.length > 0) {
            fetchTrends();
        } else {
            setIsLoading(false);
        }
    }, [getTrendAnalytics, notes]);

    if (isLoading) {
        return <TrendAnalysisDashboardSkeleton />;
    }

    return (
        <>
            <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <TrendingUpIcon className="w-8 h-8 text-light-primary dark:text-dark-primary" />
                        Trend Analysis
                    </h1>
                    <p className="text-light-text/60 dark:text-dark-text/60 mt-1">
                        Discover emerging topics and key connections in your knowledge base.
                    </p>
                </header>
                
                {hotTopics.length === 0 && connections.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center text-light-text/60 dark:text-dark-text/60 p-4 rounded-lg bg-light-ui/50 dark:bg-dark-ui/50">
                        <SparklesIcon className="w-16 h-16 mb-4" />
                        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Not Enough Data Yet</h2>
                        <p className="mt-1">Click on AI-suggested notes to build connections. <br />This dashboard will then reveal patterns and hot topics.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🔥 Hot Topics</h2>
                            <div className="space-y-3">
                                {hotTopics.map(topic => <HotTopicCard key={topic.id} topic={topic} />)}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🔗 Most Frequent Connections</h2>
                            <div className="space-y-3">
                                {connections.map(conn => <ConnectionCard key={`${conn.sourceNote.id}-${conn.suggestedNote.id}`} connection={conn} onConsolidate={() => setConsolidationPair([conn.sourceNote, conn.suggestedNote])} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Suspense fallback={<div/>}>
                {consolidationPair && (
                    <ConsolidationSuggestionModal
                        isOpen={!!consolidationPair}
                        onClose={() => setConsolidationPair(null)}
                        note1={consolidationPair[0]}
                        note2={consolidationPair[1]}
                    />
                )}
            </Suspense>
        </>
    );
};

const HotTopicCard: React.FC<{ topic: HotTopic }> = ({ topic }) => {
    const { setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();

    const handleSelectNote = () => {
        setActiveNoteId(topic.id);
        setView('NOTES');
    };

    return (
        <div onClick={handleSelectNote} className="p-4 bg-light-ui/50 dark:bg-dark-ui/50 rounded-lg cursor-pointer hover:shadow-md hover:bg-light-ui dark:hover:bg-dark-ui transition-all">
            <h3 className="font-semibold truncate flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4" />
                {topic.title}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-light-text/70 dark:text-dark-text/70">
                <span><strong className="text-light-primary dark:text-dark-primary">{topic.score}</strong> Score</span>
                <span><strong className="text-green-600 dark:text-green-400">&uarr;{topic.incoming}</strong> Incoming</span>
                <span><strong className="text-blue-600 dark:text-blue-400">&darr;{topic.outgoing}</strong> Outgoing</span>
            </div>
        </div>
    );
};

const ConnectionCard: React.FC<{ connection: FrequentConnection, onConsolidate: () => void }> = ({ connection, onConsolidate }) => {
    return (
         <div className="p-4 bg-light-ui/50 dark:bg-dark-ui/50 rounded-lg">
            <div className="flex items-center justify-between">
                 <p className="text-sm font-semibold">
                    {connection.sourceNote.title} &rarr; {connection.suggestedNote.title}
                 </p>
                 <span className="text-xs font-bold bg-light-primary/20 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary px-2 py-1 rounded-full">{connection.count} {connection.count > 1 ? 'clicks' : 'click'}</span>
            </div>
             <button onClick={onConsolidate} className="flex items-center gap-1.5 text-xs font-semibold mt-3 px-2 py-1 rounded-md bg-light-background dark:bg-dark-background hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover border border-light-border dark:border-dark-border">
                <SparklesIcon className="w-3 h-3 text-light-primary dark:text-dark-primary"/>
                Suggest Consolidation
            </button>
        </div>
    );
};

export default TrendAnalysisDashboard;