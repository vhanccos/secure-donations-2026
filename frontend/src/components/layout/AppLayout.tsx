import React from 'react';
import { Outlet } from 'react-router-dom';
import { AcademicSimulationBanner } from './AcademicSimulationBanner';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 1. Persistent Academic Simulation Banner (Mounted on all routes) */}
      <AcademicSimulationBanner />

      {/* 2. Top Header Navigation */}
      <Navbar />

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* 4. Academic Footer */}
      <Footer />
    </div>
  );
};
