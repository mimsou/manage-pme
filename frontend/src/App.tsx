import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Toast } from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import POSPage from './pages/POSPage';
import ClientsPage from './pages/ClientsPage';
import SuppliersPage from './pages/SuppliersPage';
import EntriesPage from './pages/EntriesPage';
import SalesPage from './pages/SalesPage';
import StockPage from './pages/StockPage';
import CreditsPage from './pages/CreditsPage';
import Layout from './components/Layout';
import ManagementLayout from './components/ManagementLayout';
import CompanyIdentityPage from './pages/management/CompanyIdentityPage';
import CurrencyManagementPage from './pages/management/CurrencyManagementPage';
import UsersManagementPage from './pages/management/UsersManagementPage';
import SettingsPage from './pages/management/SettingsPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Toast />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="credits" element={<CreditsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="entries" element={<EntriesPage />} />
          </Route>
          <Route path="/management" element={isAuthenticated ? <ManagementLayout /> : <Navigate to="/login" />}>
            <Route index element={<Navigate to="/management/company" replace />} />
            <Route path="company" element={<CompanyIdentityPage />} />
            <Route path="currency" element={<CurrencyManagementPage />} />
            <Route path="users" element={<UsersManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

