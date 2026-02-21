import { Outlet } from 'react-router-dom';
import { Dock } from './Dock';

export default function Layout() {
  return (
    <div className="min-h-screen relative z-[1] flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20 bg-base">
        <div className="px-7 pt-6" style={{ paddingTop: 24, paddingLeft: 28, paddingRight: 28 }}>
          <Outlet />
        </div>
      </main>
      <Dock />
    </div>
  );
}
