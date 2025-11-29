import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { studentsApi, subscriptionsApi } from '../lib/api';
import type { Student, Subscription } from '../lib/api';
import { Plus, Edit, Trash2, Search, Phone, Mail, User, X, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function StudentsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (clubId) loadStudents();
  }, [clubId]);

  const loadStudents = async () => {
    try {
      const res = await studentsApi.list(clubId!, 1, 100);
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadStudents();
      return;
    }
    try {
      const res = await studentsApi.search(clubId!, searchQuery);
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить ученика?')) return;
    try {
      await studentsApi.delete(id);
      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const openCreate = () => {
    setEditingStudent(null);
    setShowModal(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  if (isLoading) {
    return <Layout clubId={clubId!}><div className="p-8 text-gray-500">Загрузка...</div></Layout>;
  }

  return (
    <Layout clubId={clubId!} currentPage="students">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Ученики</h1>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Добавить ученика
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn-secondary">
            Найти
          </button>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Нет учеников</p>
            <button onClick={openCreate} className="btn-primary">
              Добавить первого ученика
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Имя</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Контакт родителя</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Дата рождения</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(student => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {student.parent_contact ? (
                        <div className="text-sm">
                          {student.parent_contact.phone && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="w-3 h-3" />
                              {student.parent_contact.phone}
                            </div>
                          )}
                          {student.parent_contact.email && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Mail className="w-3 h-3" />
                              {student.parent_contact.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.birth_date 
                        ? new Date(student.birth_date).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => openEdit(student)} 
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)} 
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <StudentModal
            clubId={clubId!}
            student={editingStudent}
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              loadStudents();
            }}
          />
        )}

        {selectedStudent && (
          <StudentDetailPanel
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </div>
    </Layout>
  );
}

function StudentModal({ 
  clubId, 
  student, 
  onClose, 
  onSave 
}: { 
  clubId: string; 
  student: Student | null; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: student?.name || '',
    birth_date: student?.birth_date?.split('T')[0] || '',
    parent_name: student?.parent_contact?.name || '',
    parent_phone: student?.parent_contact?.phone || '',
    parent_email: student?.parent_contact?.email || '',
    notes: student?.notes || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const data = {
      name: form.name,
      birth_date: form.birth_date || undefined,
      parent_contact: {
        name: form.parent_name,
        phone: form.parent_phone,
        email: form.parent_email,
      },
      notes: form.notes,
      club_id: clubId,
    };

    try {
      if (student) {
        await studentsApi.update(student.id, data);
      } else {
        await studentsApi.create(data);
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {student ? 'Редактировать ученика' : 'Новый ученик'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <div>
            <label className="label">Имя ученика *</label>
            <input
              type="text"
              className="input mt-1"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Иван Иванов"
              required
            />
          </div>

          <div>
            <label className="label">Дата рождения</label>
            <input
              type="date"
              className="input mt-1"
              value={form.birth_date}
              onChange={e => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Контакт родителя</h3>
            
            <div className="space-y-3">
              <div>
                <label className="label">Имя</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={form.parent_name}
                  onChange={e => setForm({ ...form, parent_name: e.target.value })}
                  placeholder="Анна Иванова"
                />
              </div>
              <div>
                <label className="label">Телефон</label>
                <input
                  type="tel"
                  className="input mt-1"
                  value={form.parent_phone}
                  onChange={e => setForm({ ...form, parent_phone: e.target.value })}
                  placeholder="+7 777 123 45 67"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input mt-1"
                  value={form.parent_email}
                  onChange={e => setForm({ ...form, parent_email: e.target.value })}
                  placeholder="parent@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Заметки</label>
            <textarea
              className="input mt-1 h-20"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Отмена
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentDetailPanel({ 
  student, 
  onClose 
}: { 
  student: Student; 
  onClose: () => void;
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, [student.id]);

  const loadSubscriptions = async () => {
    try {
      const res = await subscriptionsApi.listByStudent(student.id);
      setSubscriptions(res.data.data || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'used': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'pending': return 'Ожидает оплаты';
      case 'expired': return 'Истекла';
      case 'used': return 'Использована';
      case 'cancelled': return 'Отменена';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Профиль ученика</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">{student.name}</h3>
          {student.birth_date && (
            <p className="text-gray-500">
              Дата рождения: {new Date(student.birth_date).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>

        {student.parent_contact && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Контакт родителя</h4>
            {student.parent_contact.name && (
              <p className="text-sm">{student.parent_contact.name}</p>
            )}
            {student.parent_contact.phone && (
              <a href={`tel:${student.parent_contact.phone}`} className="text-sm text-primary flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {student.parent_contact.phone}
              </a>
            )}
            {student.parent_contact.email && (
              <a href={`mailto:${student.parent_contact.email}`} className="text-sm text-primary flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {student.parent_contact.email}
              </a>
            )}
          </div>
        )}

        <div>
          <h4 className="font-medium mb-3">Абонементы</h4>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Загрузка...</p>
          ) : subscriptions.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет абонементов</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(sub => (
                <div key={sub.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(sub.status)}`}>
                      {getStatusText(sub.status)}
                    </span>
                    <span className="text-sm font-medium">
                      {sub.remaining_sessions}/{sub.total_sessions} занятий
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {sub.price.toLocaleString()} ₸
                  </p>
                  {sub.remaining_sessions <= 2 && sub.status === 'active' && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs mt-2">
                      <AlertCircle className="w-3 h-3" />
                      Заканчивается
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {student.notes && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium mb-2">Заметки</h4>
            <p className="text-sm text-gray-700">{student.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
