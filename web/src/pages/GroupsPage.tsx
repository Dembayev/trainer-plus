import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { groupsApi, clubsApi } from '../lib/api';
import type { Group } from '../lib/api';
import { Plus, Zap, LogOut, Menu, X, Trash2, Edit, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function GroupsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clubId, setClubId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState({ title: '', sport: '', capacity: '', price: '', description: '' });

  useEffect(() => { loadClubAndGroups(); }, []);

  const loadClubAndGroups = async () => {
    try {
      const clubsRes = await clubsApi.list();
      const clubs = clubsRes.data.data || [];
      if (clubs.length > 0) {
        const club = clubs[0];
        setClubId(club.id);
        await loadGroups(club.id);
      }
    } catch (e) { 
      console.error(e); 
      setIsLoading(false);
    }
  };

  const loadGroups = async (cid: string) => {
    try {
      const res = await groupsApi.list(cid);
      setGroups(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await groupsApi.update(editingGroup.id, {
          title: form.title,
          sport: form.sport,
          capacity: Number(form.capacity),
          price: Number(form.price),
          description: form.description
        });
      } else {
        await groupsApi.create({
          club_id: clubId,
          title: form.title,
          sport: form.sport,
          capacity: Number(form.capacity),
          price: Number(form.price),
          description: form.description
        });
      }
      setShowModal(false);
      setEditingGroup(null);
      setForm({ title: '', sport: '', capacity: '', price: '', description: '' });
      loadGroups(clubId);
    } catch (e) { console.error(e); }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setForm({
      title: group.title,
      sport: group.sport || '',
      capacity: String(group.capacity || ''),
      price: String(group.price),
      description: group.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить группу?')) return;
    try { await groupsApi.delete(id); loadGroups(clubId); } catch (e) { console.error(e); }
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
                      item.to === '/groups' 
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
            <h1 className="text-3xl sm:text-4xl font-bold">Группы</h1>
            <p className="text-gray-400 mt-1">Управляйте группами вашего клуба</p>
          </div>
          <button
            onClick={() => { setEditingGroup(null); setForm({ title: '', sport: '', capacity: '', price: '', description: '' }); setShowModal(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            <Plus className="w-5 h-5" /> Добавить группу
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">Нет групп</h3>
            <p className="text-gray-400 mb-6">Создайте первую группу для вашего клуба</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" /> Создать группу
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.id} className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(group)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(group.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-1">{group.title}</h3>
                {group.sport && <p className="text-gray-400 text-sm mb-3">{group.sport}</p>}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Вместимость: {group.capacity || '—'}</span>
                  <span className="text-orange-400 font-semibold">{group.price.toLocaleString()} ₸</span>
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
            <h2 className="text-xl font-bold mb-6">{editingGroup ? 'Редактировать группу' : 'Новая группа'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Название *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="U17"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Вид спорта</label>
                <input
                  type="text"
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                  placeholder="Хоккей"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Вместимость</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="20"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
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
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Описание группы..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingGroup(null); }} className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-semibold hover:bg-white/5 transition-all">
                  Отмена
                </button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  {editingGroup ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
