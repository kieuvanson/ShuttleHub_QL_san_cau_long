import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import './Layout.css';

/**
 * Layout — khung chung cho mọi trang: Header + nội dung + Footer.
 * Dùng trong main.tsx qua <Route element={<Layout />}> để không lặp import.
 * React Router v6 inject route con qua <Outlet />.
 */
export function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="layout__main" id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
