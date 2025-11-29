import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Calendar, CreditCard, BarChart3, Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  clubId: string;
  currentPage?: string;
}

export default function Layout({ children, clubId, currentPage }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { key: 'dashboard', label: 'Главная', icon: Home, path: '/dashboard' },
    { key: 'groups', label: 'Группы', icon: Calendar, path: `/clubs/${clubId}/groups` },
    { key: 'students', label: 'Ученики', icon: Users, path: `/clubs/${clubId}/students` },
    { key: 'subscriptions', label: 'Абонементы', icon: CreditCard, path: `/clubs/${clubId}/subscriptions` },
    { key: 'reports', label: 'Отчёты', icon: BarChart3, path: `/clubs/${clubId}/reports` },
  ];

  const isActive = (key: string) => currentPage === key;

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Desktop Header */}
      <header className="bg-white shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            Тренер+
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="btn-ghost text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="bg-white shadow-sm md:hidden sticky top-0 z-40">
        <div className="px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-lg font-bold text-primary">
            Тренер+
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-t shadow-lg z-50">
            <div className="p-4 border-b">
              <div className="font-medium">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Navigation */}
      <nav className="bg-white border-b hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.key);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-40 safe-area-bottom">
        <div className="flex justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.key);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex flex-col items-center py-2 px-3 min-w-[64px] ${
                  active ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-2' : ''}`} />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Click outside to close mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
