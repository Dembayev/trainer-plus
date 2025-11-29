import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clubsApi } from '../lib/api';
import type { Club, DashboardStats } from '../lib/api';
import { Users, Calendar, CreditCard, TrendingUp, Plus, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => {
    if (selectedClub) {
      loadDashboard(selectedClub.id);
    }
  }, [selectedClub]);

  const loadClubs = async () => {
    try {
      const res = await clubsApi.list();
      setClubs(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedClub(res.data.data[0]);
      }
    } catch (err) {
      console.error('Failed to load clubs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async (clubId: string) => {
    try {
      const res = await clubsApi.dashboard(clubId);
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary">Тренер+</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button onClick={handleLogout} className="btn-ghost text-gray-600">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Добро пожаловать в Тренер+
            </h2>
            <p className="text-gray-600 mb-8">
              Создайте свой первый клуб, чтобы начать работу
            </p>
            <Link to="/onboarding" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Создать клуб
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">Тренер+</h1>
            {clubs.length > 1 && (
              <select
                value={selectedClub?.id || ''}
                onChange={(e) => {
                  const club = clubs.find((c) => c.id === e.target.value);
                  setSelectedClub(club || null);
                }}
                className="input w-auto"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="btn-ghost text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            <Link to="/dashboard" className="py-3 px-1 border-b-2 border-primary text-primary font-medium">
              Главная
            </Link>
            <Link to={`/clubs/${selectedClub?.id}/groups`} className="py-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900">
              Группы
            </Link>
            <Link to={`/clubs/${selectedClub?.id}/students`} className="py-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900">
              Ученики
            </Link>
            <Link to={`/clubs/${selectedClub?.id}/subscriptions`} className="py-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900">
              Абонементы
            </Link>
            <Link to={`/clubs/${selectedClub?.id}/reports`} className="py-3 px-1 border-b-2 border-transparent text-gray-600 hover:text-gray-900">
              Отчёты
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{selectedClub?.name}</h2>
          <p className="text-gray-600">{selectedClub?.address}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего учеников</p>
                <p className="text-2xl font-bold">{stats?.total_students || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Активных абонементов</p>
                <p className="text-2xl font-bold">{stats?.active_subscriptions || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Занятий сегодня</p>
                <p className="text-2xl font-bold">{stats?.today_sessions || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Доход за месяц</p>
                <p className="text-2xl font-bold">
                  {(stats?.month_revenue || 0).toLocaleString()} {selectedClub?.currency}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={`/clubs/${selectedClub?.id}/groups`} className="card p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Создать группу</h3>
            <p className="text-sm text-gray-600">Добавить новую тренировочную группу</p>
          </Link>

          <Link to={`/clubs/${selectedClub?.id}/students`} className="card p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Добавить ученика</h3>
            <p className="text-sm text-gray-600">Зарегистрировать нового ученика</p>
          </Link>

          <Link to={`/clubs/${selectedClub?.id}/attendance`} className="card p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Отметить посещаемость</h3>
            <p className="text-sm text-gray-600">Отметить присутствие на занятии</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
