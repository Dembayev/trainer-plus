import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../lib/api';
import type { Group, Session } from '../lib/api';
import { MapPin, Clock, Users } from 'lucide-react';

interface ScheduleData {
  club: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    currency: string;
  };
  groups: Group[];
  sessions: (Session & { group_title: string })[];
}

export default function PublicSchedulePage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  useEffect(() => {
    if (clubId) {
      loadSchedule();
    }
  }, [clubId]);

  const loadSchedule = async () => {
    try {
      const res = await publicApi.getSchedule(clubId!);
      setData(res.data.data);
    } catch (err) {
      setError('Не удалось загрузить расписание');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = (group: Group) => {
    // Open checkout modal or redirect
    const checkoutUrl = `/checkout/${clubId}/${group.id}`;
    window.location.href = checkoutUrl;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Загрузка расписания...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">{error || 'Клуб не найден'}</div>
      </div>
    );
  }

  const filteredSessions = selectedGroup === 'all'
    ? data.sessions
    : data.sessions.filter((s) => s.group_id === selectedGroup);

  // Group sessions by date
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.start_at).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, typeof filteredSessions>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{data.club.name}</h1>
          {data.club.address && (
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {data.club.address}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Groups */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Наши группы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.groups.map((group) => (
              <div key={group.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{group.title}</h3>
                    {group.sport && (
                      <p className="text-sm text-gray-600">{group.sport}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {group.price.toLocaleString()} {data.club.currency}
                    </p>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  {group.capacity && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      до {group.capacity} чел.
                    </span>
                  )}
                  <button
                    onClick={() => handleCheckout(group)}
                    className="btn-primary"
                  >
                    Записаться
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Schedule Filter */}
        <section className="mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Расписание</h2>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Все группы</option>
              {data.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Schedule */}
        <section>
          {Object.entries(sessionsByDate).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Нет запланированных занятий
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(sessionsByDate).map(([date, sessions]) => (
                <div key={date}>
                  <h3 className="font-medium text-gray-900 mb-3 capitalize">{date}</h3>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-semibold">
                              {new Date(session.start_at).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">{session.group_title}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {session.duration_minutes} мин
                              </span>
                              {session.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {session.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Powered by Тренер+</p>
        </div>
      </footer>
    </div>
  );
}
