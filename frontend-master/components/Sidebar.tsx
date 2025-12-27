
import React from 'react';
import type { User, Page } from '../types';
import { Page as PageEnum } from '../types';
import { PAGES, ADMIN_USER } from '../constants';
import { ICONS, XIcon } from './icons';

interface SidebarProps {
  user: User;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  finalQuizPassed: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onSmartContentNavigation: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, setCurrentPage, finalQuizPassed, isSidebarOpen, setIsSidebarOpen, onSmartContentNavigation }) => {
  const visiblePages = PAGES.filter(
    page => {
      if (page === PageEnum.Activity && !finalQuizPassed) return false;
      if (page === PageEnum.AdminDashboard && user.email !== ADMIN_USER.email) return false;
      return true;
    }
  );

  const handleNavigation = (page: Page) => {
    if (page === PageEnum.Content) {
        onSmartContentNavigation();
    } else {
        setCurrentPage(page);
    }
    setIsSidebarOpen(false); // Close sidebar on navigation
  };

  const baseClasses = "bg-blue-800 text-white flex flex-col h-full transition-transform duration-300 ease-in-out";
  const desktopClasses = "md:w-64 md:relative md:translate-x-0";
  const mobileClasses = "fixed top-0 right-0 z-30 w-64 shadow-lg";
  const transformClass = isSidebarOpen ? 'translate-x-0' : 'translate-x-full';

  return (
    <aside className={`${baseClasses} ${desktopClasses} ${mobileClasses} ${transformClass} md:flex`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-blue-700">
        <span className="text-2xl font-bold">القائمة الرئيسية</span>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-blue-200 hover:text-white" aria-label="Close sidebar">
          <XIcon />
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {visiblePages.map((page) => {
          const Icon = ICONS[page] || ICONS['الرئيسية'];
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => handleNavigation(page)}
              className={`w-full flex items-center px-4 py-3 text-right text-base font-medium rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-900 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 ml-3" />
              <span>{page}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
