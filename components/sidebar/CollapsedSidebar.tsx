import React from 'react';
import {
    PlusIcon, FolderIcon, MagnifyingGlassIcon, DocumentTextIcon, GraphIcon,
    TrendingUpIcon, ChartBarIcon, SparklesIcon, MoonIcon, SunIcon,
    Cog6ToothIcon, QuestionMarkCircleIcon
} from '../Icons';
import FooterButton from './FooterButton';
import { useStoreContext, useUIContext } from '../../context/AppContext';

const CollapsedSidebar: React.FC = () => {
    const { onAddNote } = useStoreContext();
    const {
        toggleSidebarCollapsed, setIsCommandPaletteOpen, setView, view,
        toggleTheme, theme, openSettings, isApiKeyMissing, openHelpModal,
        isAiEnabled,
    } = useUIContext();

    return (
        <div className="flex flex-col h-full items-center p-2">
            {/* Logo at top */}
            <div className="relative group mb-4 flex-shrink-0 pt-2">
                <button onClick={toggleSidebarCollapsed} className="p-1 rounded-md transition-colors hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover" aria-label="Expand sidebar">
                    <div className="w-8 h-8">
                        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="64" height="64" rx="12" className="fill-light-background dark:fill-dark-background"/>
                            <g className="stroke-light-primary dark:stroke-dark-primary">
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
                    </div>
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 dark:bg-zinc-700 text-white dark:text-dark-text text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Expand
                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-zinc-800 dark:border-r-zinc-700" />
                </div>
            </div>

            {/* Main actions */}
            <div className="flex flex-col space-y-2 flex-grow">
                <FooterButton onClick={() => onAddNote()} tooltip="New Note">
                    <PlusIcon />
                </FooterButton>
                <FooterButton onClick={toggleSidebarCollapsed} tooltip="Explorer">
                    <FolderIcon />
                </FooterButton>
                <FooterButton onClick={() => setIsCommandPaletteOpen(true)} tooltip="Command Palette (Cmd+K)">
                    <MagnifyingGlassIcon />
                </FooterButton>
            </div>

            {/* Footer actions */}
            <div className="flex flex-col space-y-1 flex-shrink-0">
                <FooterButton onClick={() => setView('NOTES')} tooltip="Notes" isActive={view === 'NOTES'}>
                    <DocumentTextIcon />
                </FooterButton>
                {isAiEnabled && (
                    <>
                        <FooterButton onClick={() => setView('GRAPH')} tooltip="Graph View" isActive={view === 'GRAPH'}>
                            <GraphIcon />
                        </FooterButton>
                        <FooterButton onClick={() => setView('TREND_ANALYSIS')} tooltip="Trend Analysis" isActive={view === 'TREND_ANALYSIS'}>
                            <TrendingUpIcon />
                        </FooterButton>
                        <FooterButton onClick={() => setView('CTR_ANALYTICS')} tooltip="CTR Analytics" isActive={view === 'CTR_ANALYTICS'}>
                            <ChartBarIcon />
                        </FooterButton>
                        <FooterButton onClick={() => setView('CHAT')} tooltip="Ask AI" isActive={view === 'CHAT'}>
                            <SparklesIcon />
                        </FooterButton>
                    </>
                )}
                <FooterButton onClick={toggleTheme} tooltip={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </FooterButton>
                <FooterButton onClick={openSettings} tooltip="Settings" hasIndicator={isApiKeyMissing}>
                    <Cog6ToothIcon />
                </FooterButton>
                <FooterButton
                    onClick={openHelpModal}
                    tooltip="Help & Changelog"
                >
                    <QuestionMarkCircleIcon />
                </FooterButton>
            </div>
        </div>
    );
};

export default CollapsedSidebar;