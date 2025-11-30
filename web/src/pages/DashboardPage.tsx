import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clubsApi } from '../lib/api';
import type { Club, DashboardStats } from '../lib/api';
import { Users, CreditCard, Calendar, TrendingUp, Plus, ChevronRight, Zap, LogOut, Menu, X, BarChart3, UserPlus, CalendarCheck } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { loadClubs(); }, []);
  useEffect(() => { if (selectedClub) loadStats(selectedClub.id); }, [selectedClub]);

  const loadClubs = async () => {
    try {
      const res = await clubsApi.list();
      const list = res.data.data || [];
      setClubs(list);
      if (list.length > 0) setSelectedClub(list[0]);
      else navigate('/onboarding');
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const loadStats = async (clubId: string) => {
    try { const res = await clubsApi.dashboard(clubId); setStats(res.data.data); } catch (e) { console.error(e); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const navItems = [
    { label: 'Главная', href: `/clubs/${selectedClub?.id}`, icon: Zap, active: true },
    { label: 'Группы', href: `/clubs/${selectedClub?.id}/groups`, icon: Users },
    { label: 'Ученики', href: `/clubs/${selectedClub?.id}/students`, icon: UserPlus },
    { label: 'Абонементы', href: `/clubs/${selectedClub?.id}/subscriptions`, icon: CreditCard },
    { label: 'Отчёты', href: `/clubs/${selectedClub?.id}/reports`, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center"><Zap className="w-6 h-6" /></div>
                <span className="text-xl font-bold">Тренер+</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.label} to={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${item.active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-gray-400">{user?.name}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5" /></button>
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/10 px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.label} to={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${item.active ? 'bg-white/10 text-white' : 'text-gray-400'}`} onClick={() => setMobileMenuOpen(false)}>
                <item.icon className="w-5 h-5" />{item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{selectedClub?.name}</h1>
          <p className="text-gray-400">{selectedClub?.address || 'Добро пожаловать'}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6" /></div>
              <div><div className="text-3xl font-bold">{stats?.total_students || 0}</div><div className="text-gray-400 text-sm">Учеников</div></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6" /></div>
              <div><div className="text-3xl font-bold">{stats?.active_subscriptions || 0}</div><div className="text-gray-400 text-sm">Абонементов</div></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center"><Calendar className="w-6 h-6" /></div>
              <div><div className="text-3xl font-bold">{stats?.today_sessions || 0}</div><div className="text-gray-400 text-sm">Занятий сегодня</div></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
              <div><div className="text-3xl font-bold">{(stats?.month_revenue || 0).toLocaleString()}</div><div className="text-gray-400 text-sm">₸ за месяц</div></div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Быстрые действия</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link to={`/clubs/${selectedClub?.id}/groups`} className="group bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-orange-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center"><Plus className="w-6 h-6" /></div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-500 transition-all" />
            </div>
            <h3 className="font-semibold mb-1">Создать группу</h3>
            <p className="text-gray-400 text-sm">Добавить новую тренировочную группу</p>
          </Link>
          <Link to={`/clubs/${selectedClub?.id}/students`} className="group bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center"><UserPlus className="w-6 h-6" /></div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-all" />
            </div>
            <h3 className="font-semibold mb-1">Добавить ученика</h3>
            <p className="text-gray-400 text-sm">Зарегистрировать нового ученика</p>
          </Link>
          <Link to={`/clubs/${selectedClub?.id}/groups`} className="group bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center"><CalendarCheck className="w-6 h-6" /></div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-green-500 transition-all" />
            </div>
            <h3 className="font-semibold mb-1">Отметить посещаемость</h3>
            <p className="text-gray-400 text-sm">Отметить присутствие на занятии</p>
          </Link>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Информация о клубе</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><div className="text-gray-400 text-sm mb-1">Название</div><div className="font-medium">{selectedClub?.name}</div></div>
            <div><div className="text-gray-400 text-sm mb-1">Адрес</div><div className="font-medium">{selectedClub?.address || '—'}</div></div>
            <div><div className="text-gray-400 text-sm mb-1">Телефон</div><div className="font-medium">{selectedClub?.phone || '—'}</div></div>
            <div><div className="text-gray-400 text-sm mb-1">Валюта</div><div className="font-medium">{selectedClub?.currency || 'KZT'}</div></div>
          </div>
        </div>
      </main>
    </div>
  );
}
