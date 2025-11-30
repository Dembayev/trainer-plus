import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Users, Zap, LogOut, Menu, X, BarChart3, UserPlus, CreditCard, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FinanceReport { total_paid: number; total_refunded: number; net_revenue: number; payment_count: number; payments_by_method: { method: string; amount: number; count: number }[]; payments_by_group: { group_id: string; group_title: string; amount: number }[]; }
interface OccupancyReport { avg_fill_rate: number; total_sessions: number; total_attendees: number; group_stats: { group_id: string; group_title: string; capacity: number; session_count: number; total_present: number; avg_fill_rate: number }[]; }
interface StudentsReport { total_students: number; active_students: number; avg_sessions_per_student: number; top_students: { student_id: string; student_name: string; session_count: number; present_count: number; attendance_rate: number }[]; }
interface DebtReport { total_pending_amount: number; pending_count: number; debtors: { student_id: string; student_name: string; parent_phone: string; amount: number; days_overdue: number }[]; }

export default function ReportsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'finance' | 'occupancy' | 'students' | 'debt'>('finance');
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });
  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null);
  const [occupancyReport, setOccupancyReport] = useState<OccupancyReport | null>(null);
  const [studentsReport, setStudentsReport] = useState<StudentsReport | null>(null);
  const [debtReport, setDebtReport] = useState<DebtReport | null>(null);

  useEffect(() => { loadReport(); }, [clubId, activeTab, dateRange]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = { from: dateRange.from, to: dateRange.to };
      switch (activeTab) {
        case 'finance': const f = await api.get(`/clubs/${clubId}/reports/finance`, { params }); setFinanceReport(f.data.data); break;
        case 'occupancy': const o = await api.get(`/clubs/${clubId}/reports/occupancy`, { params }); setOccupancyReport(o.data.data); break;
        case 'students': const s = await api.get(`/clubs/${clubId}/reports/students`, { params }); setStudentsReport(s.data.data); break;
        case 'debt': const d = await api.get(`/clubs/${clubId}/reports/debt`, { params: { days: 7 } }); setDebtReport(d.data.data); break;
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { label: 'Главная', href: `/clubs/${clubId}`, icon: Zap },
    { label: 'Группы', href: `/clubs/${clubId}/groups`, icon: Users },
    { label: 'Ученики', href: `/clubs/${clubId}/students`, icon: UserPlus },
    { label: 'Абонементы', href: `/clubs/${clubId}/subscriptions`, icon: CreditCard },
    { label: 'Отчёты', href: `/clubs/${clubId}/reports`, icon: BarChart3, active: true },
  ];

  const tabs = [
    { key: 'finance', label: 'Финансы', icon: DollarSign },
    { key: 'occupancy', label: 'Загруженность', icon: Calendar },
    { key: 'students', label: 'Ученики', icon: Users },
    { key: 'debt', label: 'Долги', icon: AlertTriangle },
  ] as const;

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
        <h1 className="text-3xl sm:text-4xl font-bold mb-8">Отчёты</h1>

        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">От</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500/50" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">До</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500/50" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {activeTab === 'finance' && financeReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Чистый доход</div>
                    <div className="text-3xl font-bold text-green-400">{(financeReport.net_revenue || 0).toLocaleString()} ₸</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Получено</div>
                    <div className="text-2xl font-bold">{(financeReport.total_paid || 0).toLocaleString()} ₸</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Возвраты</div>
                    <div className="text-2xl font-bold text-red-400">{(financeReport.total_refunded || 0).toLocaleString()} ₸</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Платежей</div>
                    <div className="text-2xl font-bold">{financeReport.payment_count || 0}</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold mb-4">Доход по группам</h3>
                  {(financeReport.payments_by_group || []).length > 0 ? (
                    <div className="space-y-3">{(financeReport.payments_by_group || []).map(g => (
                      <div key={g.group_id} className="flex justify-between items-center"><span className="text-gray-400">{g.group_title}</span><span className="font-semibold">{g.amount.toLocaleString()} ₸</span></div>
                    ))}</div>
                  ) : <p className="text-gray-500">Нет данных</p>}
                </div>
              </div>
            )}

            {activeTab === 'occupancy' && occupancyReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Средняя загруженность</div>
                    <div className="text-3xl font-bold text-purple-400">{(occupancyReport.avg_fill_rate || 0).toFixed(1)}%</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Всего занятий</div>
                    <div className="text-2xl font-bold">{occupancyReport.total_sessions || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Посещений</div>
                    <div className="text-2xl font-bold">{occupancyReport.total_attendees || 0}</div>
                  </div>
                </div>
                {(occupancyReport.group_stats || []).length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-white/10">
                        <tr><th className="px-6 py-4 text-left text-gray-400 text-sm">Группа</th><th className="px-6 py-4 text-center text-gray-400 text-sm">Занятий</th><th className="px-6 py-4 text-center text-gray-400 text-sm">Загруженность</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(occupancyReport.group_stats || []).map(g => (
                          <tr key={g.group_id}><td className="px-6 py-4 font-medium">{g.group_title}</td><td className="px-6 py-4 text-center">{g.session_count}</td><td className="px-6 py-4 text-center"><span className="text-purple-400">{g.avg_fill_rate.toFixed(1)}%</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && studentsReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Всего учеников</div>
                    <div className="text-3xl font-bold text-blue-400">{studentsReport.total_students || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Активных</div>
                    <div className="text-2xl font-bold text-green-400">{studentsReport.active_students || 0}</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Среднее посещений</div>
                    <div className="text-2xl font-bold">{(studentsReport.avg_sessions_per_student || 0).toFixed(1)}</div>
                  </div>
                </div>
                {(studentsReport.top_students || []).length > 0 && (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold mb-4">Топ по посещаемости</h3>
                    <div className="space-y-3">
                      {(studentsReport.top_students || []).map((s, i) => (
                        <div key={s.student_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                            <span className="font-medium">{s.student_name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{s.present_count} посещений</div>
                            <div className="text-gray-400 text-sm">{s.attendance_rate.toFixed(0)}% явка</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'debt' && debtReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Сумма долга</div>
                    <div className="text-3xl font-bold text-orange-400">{(debtReport.total_pending_amount || 0).toLocaleString()} ₸</div>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm mb-1">Должников</div>
                    <div className="text-2xl font-bold">{debtReport.pending_count || 0}</div>
                  </div>
                </div>
                {(debtReport.debtors || []).length > 0 ? (
                  <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead className="border-b border-white/10">
                        <tr><th className="px-6 py-4 text-left text-gray-400 text-sm">Ученик</th><th className="px-6 py-4 text-left text-gray-400 text-sm">Телефон</th><th className="px-6 py-4 text-right text-gray-400 text-sm">Сумма</th><th className="px-6 py-4 text-right text-gray-400 text-sm">Дней</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(debtReport.debtors || []).map(d => (
                          <tr key={d.student_id}><td className="px-6 py-4 font-medium">{d.student_name}</td><td className="px-6 py-4 text-gray-400">{d.parent_phone || '—'}</td><td className="px-6 py-4 text-right font-semibold text-orange-400">{d.amount.toLocaleString()} ₸</td><td className="px-6 py-4 text-right">{d.days_overdue}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="text-center py-16 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl"><div className="text-4xl mb-4">🎉</div><h3 className="text-xl font-semibold">Нет должников!</h3></div>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
