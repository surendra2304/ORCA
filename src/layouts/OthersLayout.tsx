import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';

/**
 * OthersLayout:
 * Full Marine Intelligence Dashboard Experience:
 * - Clean Light Navbar with Hamburger Menu & top-right controls
 * - Left Slide-out Sidebar Navigation
 * - Integrated ORCA Voice Assistant
 * - Clean layout without old horizontal navigation bar
 */
export const OthersLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceAgentOpen, setIsVoiceAgentOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-ocean-bg text-ocean-text flex flex-col antialiased">
      {/* Top Global Light Header with Logo, Hamburger Menu & Top-Right Controls */}
      <Header onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />

      {/* Left Slide-out Sidebar with 8 strictly ordered items */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onOpenVoiceAgent={() => setIsVoiceAgentOpen(true)}
      />

      {/* Voice Assistant Modal for ORCA Agent */}
      <VoiceAssistantModal
        isOpen={isVoiceAgentOpen}
        onClose={() => setIsVoiceAgentOpen(false)}
        onComplete={() => {
          setIsVoiceAgentOpen(false);
          navigate('/others/fishing');
        }}
      />

      {/* Main Others Dashboard Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

