import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { subscriptionsApi, groupsApi, studentsApi } from '../lib/api';
import type { Subscription, Group, Student } from '../lib/api';
import { Plus, X, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import Layout from '../components/Layout';

interface SubscriptionWithDetails extends Subscription {
  student_name?: string;
  group_title?: string;
}

export default function SubscriptionsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (clubId) {
      loadData();
    }
  }, [clubId, statusFilter]);

  const loadData = async () => {
    try {
      const [subsRes, groupsRes, studentsRes] = await Promise.all([
        subscriptionsApi.listByClub(clubId!, statusFilter || undefined),
        groupsApi.list(clubId!),
        studentsApi.list(clubId!, 1, 100),
      ]);
      setSubscriptions(subsRes.data.data || []);
      setGroups(groupsRes.data.data || []);
      setStudents(studentsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить абонемент?')) return;
    try {
      await subscriptionsApi.cancel(id);
      loadData();
    } catch (err) {
      alert('Ошибка при отмене');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'expired': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'used': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'used': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
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

  if (isLoading) {
    return <Layout clubId={clubId!}><div className="p-8 text-gray-500">Загрузка...</div></Layout>;
  }

  return (
    <Layout clubId={clubId!} currentPage="subscriptions">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Абонементы</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Создать абонемент
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-full text-sm ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Все
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-full text-sm ${statusFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Активные
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-full text-sm ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Ожидают оплаты
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-4 py-2 rounded-full text-sm ${statusFilter === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Истекшие
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm text-gray-500">Всего</div>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">Активных</div>
            <div className="text-2xl font-bold text-green-600">
              {subscriptions.filter(s => s.status === 'active').length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">Ожидают оплаты</div>
            <div className="text-2xl font-bold text-yellow-600">
              {subscriptions.filter(s => s.status === 'pending').length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-500">Заканчиваются</div>
            <div className="text-2xl font-bold text-orange-600">
              {subscriptions.filter(s => s.status === 'active' && s.remaining_sessions <= 2).length}
            </div>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Нет абонементов</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Создать первый абонемент
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ученик</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Группа</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Занятий</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Цена</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Статус</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Срок</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {sub.student_name || students.find(s => s.id === sub.student_id)?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sub.group_title || groups.find(g => g.id === sub.group_id)?.title || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sub.remaining_sessions}</span>
                        <span className="text-gray-400">/ {sub.total_sessions}</span>
                        {sub.remaining_sessions <= 2 && sub.status === 'active' && (
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {sub.price.toLocaleString()} ₸
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(sub.status)}`}>
                        {getStatusIcon(sub.status)}
                        {getStatusText(sub.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sub.expires_at 
                        ? `до ${new Date(sub.expires_at).toLocaleDateString('ru-RU')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(sub.status === 'active' || sub.status === 'pending') && (
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Отменить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <SubscriptionModal
            
            groups={groups}
            students={students}
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              loadData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

// Subscription Modal
function SubscriptionModal({ 
  
  groups,
  students,
  onClose, 
  onSave 
}: { 
  
  groups: Group[];
  students: Student[];
  onClose: () => void; 
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    student_id: '',
    group_id: '',
    total_sessions: 8,
    price: 15000,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill price when group is selected
  useEffect(() => {
    if (form.group_id) {
      const group = groups.find(g => g.id === form.group_id);
      if (group) {
        setForm(f => ({ ...f, price: group.price }));
      }
    }
  }, [form.group_id, groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await subscriptionsApi.create(form);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка создания');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Новый абонемент</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <div>
            <label className="label">Ученик *</label>
            <select
              className="input mt-1"
              value={form.student_id}
              onChange={e => setForm({ ...form, student_id: e.target.value })}
              required
            >
              <option value="">Выберите ученика</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Группа *</label>
            <select
              className="input mt-1"
              value={form.group_id}
              onChange={e => setForm({ ...form, group_id: e.target.value })}
              required
            >
              <option value="">Выберите группу</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.title} — {g.price.toLocaleString()} ₸</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Количество занятий</label>
              <select
                className="input mt-1"
                value={form.total_sessions}
                onChange={e => setForm({ ...form, total_sessions: parseInt(e.target.value) })}
              >
                <option value="4">4 занятия</option>
                <option value="8">8 занятий</option>
                <option value="12">12 занятий</option>
                <option value="16">16 занятий</option>
              </select>
            </div>
            <div>
              <label className="label">Цена (₸)</label>
              <input
                type="number"
                className="input mt-1"
                value={form.price}
                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
                min="0"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
            Абонемент будет создан в статусе "Ожидает оплаты". После оплаты статус изменится на "Активна".
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Отмена
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
