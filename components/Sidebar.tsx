import React from 'react';
import { useUIContext } from '../context/AppContext';
import SidebarHeader from './sidebar/SidebarHeader';
import SidebarSearch from './sidebar/SidebarSearch';
import SidebarContent from './sidebar/SidebarContent';
import SidebarFooter from './sidebar/SidebarFooter';
import CollapsedSidebar from './sidebar/CollapsedSidebar';

interface OnboardingStep {
    id: string;
    text: string;
    isComplete: boolean;
}

interface SidebarProps {
    width: number;
    onboardingSteps: OnboardingStep[];
    isOnboardingComplete: boolean;
}

const COLLAPSED_WIDTH = 56;

const ExpandedView: React.FC<{
    onboardingSteps: OnboardingStep[];
    isOnboardingComplete: boolean;
}> = ({ onboardingSteps, isOnboardingComplete }) => (
    <>
        <SidebarHeader />
        <SidebarSearch 
            onboardingSteps={onboardingSteps}
            isOnboardingComplete={isOnboardingComplete}
        />
        <SidebarContent />
        <SidebarFooter />
    </>
);

const Sidebar: React.FC<SidebarProps> = ({
    width,
    onboardingSteps,
    isOnboardingComplete,
}) => {
    const { isSidebarOpen, isMobileView, isSidebarCollapsed } = useUIContext();

    return (
        <aside 
            className={`absolute md:relative z-30 flex flex-col h-full bg-light-ui dark:bg-dark-ui border-r border-light-border dark:border-dark-border transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex-shrink-0`}
            style={{ width: isMobileView ? '20rem' : isSidebarCollapsed ? `${COLLAPSED_WIDTH}px` : `${width}px` }}
        >
           {isSidebarCollapsed && !isMobileView ? (
               <CollapsedSidebar />
           ) : (
               <ExpandedView 
                    onboardingSteps={onboardingSteps} 
                    isOnboardingComplete={isOnboardingComplete} 
                />
            )}
        </aside>
    );
};

export default Sidebar;