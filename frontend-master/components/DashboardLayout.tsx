import React, { useState } from 'react';
import type { User, Page } from '../types';
import Header from './Header';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  user: User;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onLogout: () => void;
  children: React.ReactNode;
  finalQuizPassed: boolean;
  onSmartContentNavigation: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ user, currentPage, setCurrentPage, onLogout, children, finalQuizPassed, onSmartContentNavigation }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-gray-100 font-sans overflow-hidden">
      <Sidebar 
        user={user} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        finalQuizPassed={finalQuizPassed} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSmartContentNavigation={onSmartContentNavigation}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} setCurrentPage={setCurrentPage} onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
          <div className="container mx-auto px-4 md:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;
