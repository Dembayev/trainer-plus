import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentsApi } from '../lib/api';
import type { Student } from '../lib/api';
import { Users, Plus, Zap, LogOut, Menu, X, BarChart3, UserPlus, CreditCard, Phone, Mail, Trash2, Edit, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function StudentsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', birth_date: '', parent_name: '', parent_phone: '', parent_email: '', notes: '' });

  useEffect(() => { if (clubId) loadStudents(); }, [clubId]);

  const loadStudents = async () => {
    try {
      const res = await studentsApi.list(clubId!);
      setStudents(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        club_id: clubId,
        name: form.name,
        birth_date: form.birth_date || undefined,
        parent_contact: { name: form.parent_name, phone: form.parent_phone, email: form.parent_email },
        notes: form.notes
      };
      if (editingStudent) {
        await studentsApi.update(editingStudent.id, data);
      } else {
        await studentsApi.create(data);
      }
      setShowModal(false);
      setForm({ name: '', birth_date: '', parent_name: '', parent_phone: '', parent_email: '', notes: '' });
      setEditingStudent(null);
      loadStudents();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      birth_date: student.birth_date || '',
      parent_name: student.parent_contact?.name || '',
      parent_phone: student.parent_contact?.phone || '',
      parent_email: student.parent_contact?.email || '',
      notes: student.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить ученика?')) return;
    try { await studentsApi.delete(id); loadStudents(); } catch (e) { console.error(e); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { label: 'Главная', href: `/clubs/${clubId}`, icon: Zap },
    { label: 'Группы', href: `/clubs/${clubId}/groups`, icon: Users },
    { label: 'Ученики', href: `/clubs/${clubId}/students`, icon: UserPlus, active: true },
    { label: 'Абонементы', href: `/clubs/${clubId}/subscriptions`, icon: CreditCard },
    { label: 'Отчёты', href: `/clubs/${clubId}/reports`, icon: BarChart3 },
  ];

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Ученики</h1>
            <p className="text-gray-400">Всего: {students.length} учеников</p>
          </div>
          <button onClick={() => { setEditingStudent(null); setForm({ name: '', birth_date: '', parent_name: '', parent_phone: '', parent_email: '', notes: '' }); setShowModal(true); }} className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-all">
            <Plus className="w-5 h-5" /> Добавить
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input type="text" placeholder="Поиск по имени..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50" />
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{searchQuery ? 'Не найдено' : 'Нет учеников'}</h3>
            <p className="text-gray-400 mb-6">{searchQuery ? 'Попробуйте другой запрос' : 'Добавьте первого ученика'}</p>
            {!searchQuery && <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold">Добавить ученика</button>}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-lg font-bold">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(student)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(student.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-3">{student.name}</h3>
                <div className="space-y-2 text-sm">
                  {student.parent_contact?.phone && (
                    <div className="flex items-center gap-2 text-gray-400"><Phone className="w-4 h-4" /><span>{student.parent_contact.phone}</span></div>
                  )}
                  {student.parent_contact?.email && (
                    <div className="flex items-center gap-2 text-gray-400"><Mail className="w-4 h-4" /><span>{student.parent_contact.email}</span></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingStudent ? 'Редактировать' : 'Новый ученик'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Имя *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Дата рождения</label>
                <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Имя родителя</label>
                <input type="text" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Телефон родителя</label>
                <input type="tel" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email родителя</label>
                <input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Заметки</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 font-semibold hover:bg-white/5 transition-all">Отмена</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 py-3 rounded-xl font-semibold hover:shadow-lg transition-all">{editingStudent ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
