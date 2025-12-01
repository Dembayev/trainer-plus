import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { subscriptionsApi, studentsApi, groupsApi, clubsApi } from '../lib/api';
import type { Subscription, Student, Group } from '../lib/api';
import { Plus, Zap, LogOut, Menu, X, CreditCard, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SubscriptionsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clubId, setClubId] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', group_id: '', total_sessions: '', price: '' });

  useEffect(() => { loadClubAndData(); }, []);

  const loadClubAndData = async () => {
    try {
      const clubsRes = await clubsApi.list();
      const clubs = clubsRes.data.data || [];
      if (clubs.length > 0) {
        const club = clubs[0];
        setClubId(club.id);
        await loadData(club.id);
      }
    } catch (e) { 
      console.error(e); 
      setIsLoading(false);
    }
  };

  const loadData = async (cid: string) => {
    try {
      const [subRes, studRes, grpRes] = await Promise.all([
        subscriptionsApi.listByClub(cid),
        studentsApi.list(cid),
        groupsApi.list(cid)
      ]);
      setSubscriptions(subRes.data.data || []);
      setStudents(studRes.data.data || []);
      setGroups(grpRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subscriptionsApi.create({
        student_id: form.student_id,
        group_id: form.group_id,
        total_sessions: Number(form.total_sessions),
        price: Number(form.price)
      });
      setShowModal(false);
      setForm({ student_id: '', group_id: '', total_sessions: '', price: '' });
      loadData(clubId);
    } catch (e) { console.error(e); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить абонемент?')) return;
    try { await subscriptionsApi.cancel(id); loadData(clubId); } catch (e) { console.error(e); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '—';
  const getGroupName = (id: string) => groups.find(g => g.id === id)?.title || '—';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-1 rounded-lg text-xs"><CheckCircle className="w-3 h-3" />Активен</span>;
      case 'expired': return <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-1 rounded-lg text-xs"><XCircle className="w-3 h-3" />Истёк</span>;
      case 'used': return <span className="flex items-center gap-1 text-gray-400 bg-gray-500/10 px-2 py-1 rounded-lg text-xs"><CheckCircle className="w-3 h-3" />Использован</span>;
      default: return <span className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg text-xs"><Clock className="w-3 h-3" />{status}</span>;
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Главная' },
    { to: '/groups', label: 'Группы' },
    { to: '/students', label: 'Ученики' },
    { to: '/attendance', label: 'Посещаемость' },
    { to: '/subscriptions', label: 'Абонементы' },
    { to: '/reports', label: 'Отчёты' },
  ];

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
                      item.to === '/subscriptions' 
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Абонементы</h1>
            <p className="text-gray-400 mt-1">Управляйте абонементами учеников</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            <Plus className="w-5 h-5" /> Создать абонемент
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Нет абонементов</h3>
            <p className="text-gray-400 mb-6">Создайте первый абонемент для ученика</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" /> Создать абонемент
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{getStudentName(sub.student_id)}</h3>
                    <p className="text-gray-400 text-sm">{getGroupName(sub.group_id)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{sub.remaining_sessions}/{sub.total_sessions}</div>
                    <div className="text-xs text-gray-500">занятий</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{sub.price.toLocaleString()} ₸</div>
                    <div className="text-xs text-gray-500">стоимость</div>
                  </div>
                  {getStatusBadge(sub.status)}
                  {sub.status === 'active' && (
                    <button onClick={() => handleCancel(sub.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Новый абонемент</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Ученик *</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  required
                >
                  <option value="">Выберите ученика</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Группа *</label>
                <select
                  value={form.group_id}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setForm({ 
                      ...form, 
                      group_id: e.target.value,
                      price: group ? String(group.price) : form.price
                    });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.title} — {g.price.toLocaleString()} ₸</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Количество занятий *</label>
                <input
                  type="number"
                  value={form.total_sessions}
                  onChange={(e) => setForm({ ...form, total_sessions: e.target.value })}
                  placeholder="8"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Цена (₸) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="15000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  required
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-semibold hover:bg-white/5 transition-all">
                  Отмена
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
