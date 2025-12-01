import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clubsApi, api } from '../lib/api';
import { Zap, LogOut, Menu, X, DollarSign, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FinanceReport {
  total_revenue: number;
  total_payments: number;
  total_refunds: number;
  payment_count: number;
  by_group: { group_id: string; group_title: string; revenue: number }[];
}

interface OccupancyReport {
  average_occupancy: number;
  total_sessions: number;
  total_attendance: number;
  by_group: { group_id: string; group_title: string; sessions: number; attendance: number; occupancy: number }[];
}

interface StudentsReport {
  total_students: number;
  active_students: number;
  avg_attendance: number;
  top_students: { student_id: string; student_name: string; attendance_count: number }[];
}

interface DebtReport {
  total_debt: number;
  debtors_count: number;
  debtors: { student_id: string; student_name: string; phone?: string; debt: number; days_overdue: number }[];
}

export default function ReportsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clubId, setClubId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'finance' | 'occupancy' | 'students' | 'debt'>('finance');
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  
  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null);
  const [occupancyReport, setOccupancyReport] = useState<OccupancyReport | null>(null);
  const [studentsReport, setStudentsReport] = useState<StudentsReport | null>(null);
  const [debtReport, setDebtReport] = useState<DebtReport | null>(null);

  useEffect(() => { loadClub(); }, []);

  useEffect(() => { if (clubId) loadReport(); }, [clubId, activeTab, dateFrom, dateTo]);

  const loadClub = async () => {
    try {
      const clubsRes = await clubsApi.list();
      const clubs = clubsRes.data.data || [];
      if (clubs.length > 0) {
        setClubId(clubs[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const loadReport = async () => {
    if (!clubId) return;
    setIsLoading(true);
    try {
      const params = { from: dateFrom, to: dateTo };
      switch (activeTab) {
        case 'finance':
          const finRes = await api.get(`/clubs/${clubId}/reports/finance`, { params });
          setFinanceReport(finRes.data.data || finRes.data);
          break;
        case 'occupancy':
          const occRes = await api.get(`/clubs/${clubId}/reports/occupancy`, { params });
          setOccupancyReport(occRes.data.data || occRes.data);
          break;
        case 'students':
          const stuRes = await api.get(`/clubs/${clubId}/reports/students`, { params });
          setStudentsReport(stuRes.data.data || stuRes.data);
          break;
        case 'debt':
          const debtRes = await api.get(`/clubs/${clubId}/reports/debt`);
          setDebtReport(debtRes.data.data || debtRes.data);
          break;
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { to: '/dashboard', label: 'Главная' },
    { to: '/groups', label: 'Группы' },
    { to: '/students', label: 'Ученики' },
    { to: '/attendance', label: 'Посещаемость' },
    { to: '/subscriptions', label: 'Абонементы' },
    { to: '/reports', label: 'Отчёты' },
  ];

  const tabs = [
    { id: 'finance', label: 'Финансы', icon: DollarSign },
    { id: 'occupancy', label: 'Загруженность', icon: Calendar },
    { id: 'students', label: 'Ученики', icon: Users },
    { id: 'debt', label: 'Долги', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold hidden sm:block">Тренер+</span>
              </Link>
              <div className="hidden md:flex items-center gap-1 ml-4">
                {navItems.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.to === '/reports' 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/profile" className="hidden sm:block text-gray-400 hover:text-white transition-colors">{user?.name}</Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5" /></button>
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/10 px-4 py-4 space-y-2">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} className="block px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Отчёты</h1>
          <p className="text-gray-400 mt-1">Аналитика вашего клуба</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        {activeTab !== 'debt' && (
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-1">От</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">До</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Finance Report */}
            {activeTab === 'finance' && financeReport && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Чистый доход</p>
                    <p className="text-3xl font-bold text-green-400">{(financeReport.total_revenue || 0).toLocaleString()} ₸</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Получено</p>
                    <p className="text-3xl font-bold">{(financeReport.total_payments || 0).toLocaleString()} ₸</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Возвраты</p>
                    <p className="text-3xl font-bold text-red-400">{(financeReport.total_refunds || 0).toLocaleString()} ₸</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Платежей</p>
                    <p className="text-3xl font-bold">{financeReport.payment_count || 0}</p>
                  </div>
                </div>
                {financeReport.by_group && financeReport.by_group.length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">Доход по группам</h3>
                    <div className="space-y-3">
                      {financeReport.by_group.map(g => (
                        <div key={g.group_id} className="flex justify-between items-center">
                          <span className="text-gray-300">{g.group_title}</span>
                          <span className="font-semibold">{(g.revenue || 0).toLocaleString()} ₸</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Occupancy Report */}
            {activeTab === 'occupancy' && occupancyReport && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Средняя загруженность</p>
                    <p className="text-3xl font-bold">{(occupancyReport.average_occupancy || 0).toFixed(0)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Всего занятий</p>
                    <p className="text-3xl font-bold">{occupancyReport.total_sessions || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Посещений</p>
                    <p className="text-3xl font-bold">{occupancyReport.total_attendance || 0}</p>
                  </div>
                </div>
                {occupancyReport.by_group && occupancyReport.by_group.length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">По группам</h3>
                    <div className="space-y-3">
                      {occupancyReport.by_group.map(g => (
                        <div key={g.group_id} className="flex justify-between items-center">
                          <span className="text-gray-300">{g.group_title}</span>
                          <span className="font-semibold">{(g.occupancy || 0).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Students Report */}
            {activeTab === 'students' && studentsReport && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Всего учеников</p>
                    <p className="text-3xl font-bold">{studentsReport.total_students || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Активных</p>
                    <p className="text-3xl font-bold text-green-400">{studentsReport.active_students || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Среднее посещений</p>
                    <p className="text-3xl font-bold">{(studentsReport.avg_attendance || 0).toFixed(1)}</p>
                  </div>
                </div>
                {studentsReport.top_students && studentsReport.top_students.length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">Топ по посещаемости</h3>
                    <div className="space-y-3">
                      {studentsReport.top_students.map((s, i) => (
                        <div key={s.student_id} className="flex justify-between items-center">
                          <span className="text-gray-300">{i + 1}. {s.student_name}</span>
                          <span className="font-semibold">{s.attendance_count} посещений</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Debt Report */}
            {activeTab === 'debt' && debtReport && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Сумма долга</p>
                    <p className="text-3xl font-bold text-red-400">{(debtReport.total_debt || 0).toLocaleString()} ₸</p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <p className="text-gray-400 text-sm mb-1">Должников</p>
                    <p className="text-3xl font-bold">{debtReport.debtors_count || 0}</p>
                  </div>
                </div>
                {debtReport.debtors && debtReport.debtors.length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">Список должников</h3>
                    <div className="space-y-3">
                      {debtReport.debtors.map(d => (
                        <div key={d.student_id} className="flex justify-between items-center">
                          <div>
                            <span className="text-gray-300">{d.student_name}</span>
                            {d.phone && <span className="text-gray-500 text-sm ml-2">{d.phone}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-red-400">{(d.debt || 0).toLocaleString()} ₸</span>
                            <span className="text-gray-500 text-sm ml-2">({d.days_overdue} дн.)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
