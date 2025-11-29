import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupsApi } from '../lib/api';
import type { Group } from '../lib/api';
import { Plus, Edit, Trash2, Users, Calendar, X } from 'lucide-react';
import Layout from '../components/Layout';

export default function GroupsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (clubId) loadGroups();
  }, [clubId]);

  const loadGroups = async () => {
    try {
      const res = await groupsApi.list(clubId!);
      setGroups(res.data.data || []);
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить группу?')) return;
    try {
      await groupsApi.delete(id);
      setGroups(groups.filter(g => g.id !== id));
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  const openCreate = () => {
    setEditingGroup(null);
    setShowModal(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setShowModal(true);
  };

  if (isLoading) {
    return <Layout clubId={clubId!}><div className="p-8 text-gray-500">Загрузка...</div></Layout>;
  }

  return (
    <Layout clubId={clubId!} currentPage="groups">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Группы</h1>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Создать группу
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">Нет групп</p>
            <button onClick={openCreate} className="btn-primary">
              Создать первую группу
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <div key={group.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{group.title}</h3>
                    {group.sport && <p className="text-sm text-gray-500">{group.sport}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(group)} className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => handleDelete(group.id)} className="p-1 hover:bg-gray-100 rounded">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>До {group.capacity || '∞'} человек</span>
                  </div>
                  <div className="text-lg font-semibold text-primary">
                    {group.price?.toLocaleString()} ₸
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link 
                    to={`/clubs/${clubId}/groups/${group.id}/sessions`}
                    className="btn-outline flex-1 text-center"
                  >
                    <Calendar className="w-4 h-4 mr-1 inline" />
                    Расписание
                  </Link>
                  <Link 
                    to={`/clubs/${clubId}/groups/${group.id}/attendance`}
                    className="btn-secondary flex-1 text-center"
                  >
                    Посещаемость
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <GroupModal
            clubId={clubId!}
            group={editingGroup}
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false);
              loadGroups();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

// Modal component
function GroupModal({ 
  clubId, 
  group, 
  onClose, 
  onSave 
}: { 
  clubId: string; 
  group: Group | null; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: group?.title || '',
    sport: group?.sport || '',
    capacity: group?.capacity || 20,
    price: group?.price || 15000,
    description: group?.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (group) {
        await groupsApi.update(group.id, form);
      } else {
        await groupsApi.create({ ...form, club_id: clubId });
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
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {group ? 'Редактировать группу' : 'Новая группа'}
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
            <label className="label">Название *</label>
            <input
              type="text"
              className="input mt-1"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="U12 Хоккей"
              required
            />
          </div>

          <div>
            <label className="label">Вид спорта</label>
            <input
              type="text"
              className="input mt-1"
              value={form.sport}
              onChange={e => setForm({ ...form, sport: e.target.value })}
              placeholder="Хоккей"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Вместимость</label>
              <input
                type="number"
                className="input mt-1"
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) })}
                min="1"
              />
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

          <div>
            <label className="label">Описание</label>
            <textarea
              className="input mt-1 h-20"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Описание группы..."
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
