import React from 'react';
import {
    Cog6ToothIcon, SunIcon, MoonIcon, SparklesIcon, ChartBarIcon,
    TrendingUpIcon, GraphIcon, DocumentTextIcon, QuestionMarkCircleIcon
} from '../Icons';
import FooterButton from './FooterButton';
import { useUIContext } from '../../context/AppContext';
import { SettingsTab } from '../SettingsModal';

const SidebarFooter: React.FC = () => {
    const {
        theme, toggleTheme, view, setView,
        openSettings, isApiKeyMissing, openHelpModal,
        isAiEnabled
    } = useUIContext();

    return (
        <div className="p-2 flex-shrink-0 border-t border-light-border dark:border-dark-border">
            <div className="flex justify-end items-center space-x-1">
                <FooterButton
                    onClick={() => setView('NOTES')}
                    tooltip="Notes"
                    isActive={view === 'NOTES'}
                    tooltipPosition="top"
                >
                    <DocumentTextIcon />
                </FooterButton>

                {isAiEnabled && (
                    <>
                        <FooterButton
                            onClick={() => setView('GRAPH')}
                            tooltip="Graph View"
                            isActive={view === 'GRAPH'}
                            tooltipPosition="top"
                        >
                            <GraphIcon />
                        </FooterButton>

                        <FooterButton
                            onClick={() => setView('TREND_ANALYSIS')}
                            tooltip="Trend Analysis"
                            isActive={view === 'TREND_ANALYSIS'}
                            tooltipPosition="top"
                        >
                            <TrendingUpIcon />
                        </FooterButton>

                        <FooterButton
                            onClick={() => setView('CTR_ANALYTICS')}
                            tooltip="CTR Analytics"
                            isActive={view === 'CTR_ANALYTICS'}
                            tooltipPosition="top"
                        >
                            <ChartBarIcon />
                        </FooterButton>

                        <FooterButton
                            id="onboarding-ask-ai-btn"
                            onClick={() => setView('CHAT')}
                            tooltip="Ask AI"
                            isActive={view === 'CHAT'}
                            tooltipPosition="top"
                        >
                            <SparklesIcon />
                        </FooterButton>
                    </>
                )}


                <FooterButton
                    onClick={toggleTheme}
                    tooltip={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    tooltipPosition="top"
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </FooterButton>

                <FooterButton
                    onClick={() => openSettings('general')}
                    tooltip="Settings"
                    hasIndicator={isApiKeyMissing}
                    tooltipPosition="top"
                >
                    <Cog6ToothIcon />
                </FooterButton>
                 <FooterButton
                    onClick={openHelpModal}
                    tooltip="Help & Changelog"
                    tooltipPosition="top"
                >
                    <QuestionMarkCircleIcon />
                </FooterButton>
            </div>
        </div>
    );
};

export default SidebarFooter;