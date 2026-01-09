import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { ChatWidget } from '@/components/ChatWidget';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}

