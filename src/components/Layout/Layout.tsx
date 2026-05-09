import { Outlet } from 'react-router-dom';
import { TabBar } from './TabBar';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden min-h-screen relative">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
