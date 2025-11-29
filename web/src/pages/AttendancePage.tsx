import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { groupsApi, sessionsApi, studentsApi, attendanceApi, subscriptionsApi } from '../lib/api';
import type { Group, Session, Student, Attendance } from '../lib/api';
import { Check, X, Clock, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import Layout from '../components/Layout';

interface StudentAttendance {
  student: Student;
  attendance?: Attendance;
  hasActiveSubscription: boolean;
}

export default function AttendancePage() {
  const { clubId, groupId } = useParams<{ clubId: string; groupId?: string }>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(groupId || '');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clubId) loadGroups();
  }, [clubId]);

  useEffect(() => {
    if (selectedGroup) loadSessions();
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedSession) loadAttendance();
  }, [selectedSession]);

  const loadGroups = async () => {
    try {
      const res = await groupsApi.list(clubId!);
      setGroups(res.data.data || []);
      if (groupId) {
        setSelectedGroup(groupId);
      } else if (res.data.data?.length > 0) {
        setSelectedGroup(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      const to = new Date(today);
      to.setDate(to.getDate() + 7);

      const res = await sessionsApi.list(
        selectedGroup, 
        from.toISOString().split('T')[0], 
        to.toISOString().split('T')[0]
      );
      const sessionsList = res.data.data || [];
      setSessions(sessionsList);

      const todayStr = today.toISOString().split('T')[0];
      const todaySession = sessionsList.find(s => s.start_at.startsWith(todayStr));
      if (todaySession) {
        setSelectedSession(todaySession.id);
      } else if (sessionsList.length > 0) {
        setSelectedSession(sessionsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const loadAttendance = async () => {
    try {
      const studentsRes = await studentsApi.list(clubId!, 1, 100);
      const allStudents = studentsRes.data.data || [];

      const attendanceRes = await attendanceApi.getBySession(selectedSession);
      const existingAttendance = attendanceRes.data.data || [];

      const subsRes = await subscriptionsApi.listByClub(clubId!, 'active');
      const activeSubs = (subsRes.data.data || []).filter(s => s.group_id === selectedGroup);

      const merged: StudentAttendance[] = allStudents.map(student => {
        const attendance = existingAttendance.find((a: any) => a.student_id === student.id);
        const hasActiveSub = activeSubs.some(s => s.student_id === student.id);
        return { student, attendance, hasActiveSubscription: hasActiveSub };
      });

      merged.sort((a, b) => {
        if (a.hasActiveSubscription && !b.hasActiveSubscription) return -1;
        if (!a.hasActiveSubscription && b.hasActiveSubscription) return 1;
        return a.student.name.localeCompare(b.student.name);
      });

      setStudentAttendances(merged);
    } catch (err) {
      console.error('Failed to load attendance', err);
    }
  };

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'excused') => {
    const sa = studentAttendances.find(s => s.student.id === studentId);
    if (!sa) return;

    if (sa.attendance?.status === status) return;

    try {
      if (sa.attendance) {
        await attendanceApi.update(sa.attendance.id, { status });
      } else {
        await attendanceApi.mark({
          session_id: selectedSession,
          student_id: studentId,
          status,
        });
      }
      loadAttendance();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Ошибка';
      alert(msg);
    }
  };

  const markAllPresent = async () => {
    setIsSaving(true);
    const toMark = studentAttendances
      .filter(sa => sa.hasActiveSubscription && !sa.attendance)
      .map(sa => ({ student_id: sa.student.id, status: 'present' }));

    if (toMark.length === 0) {
      alert('Нет учеников для отметки');
      setIsSaving(false);
      return;
    }

    try {
      await attendanceApi.bulkMark({
        session_id: selectedSession,
        attendances: toMark,
      });
      loadAttendance();
    } catch (err) {
      alert('Ошибка при массовой отметке');
    } finally {
      setIsSaving(false);
    }
  };

  const getSessionLabel = (session: Session) => {
    const date = new Date(session.start_at);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const dateStr = date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${isToday ? '🔴 Сегодня' : dateStr} в ${timeStr}`;
  };

  if (isLoading) {
    return <Layout clubId={clubId!}><div className="p-8 text-gray-500">Загрузка...</div></Layout>;
  }

  const presentCount = studentAttendances.filter(sa => sa.attendance?.status === 'present').length;
  const absentCount = studentAttendances.filter(sa => sa.attendance?.status === 'absent').length;
  const unmarkedCount = studentAttendances.filter(sa => !sa.attendance && sa.hasActiveSubscription).length;

  return (
    <Layout clubId={clubId!} currentPage="groups">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Посещаемость</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Группа</label>
            <select
              className="input mt-1"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Занятие</label>
            <select
              className="input mt-1"
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              disabled={sessions.length === 0}
            >
              {sessions.length === 0 ? (
                <option>Нет занятий</option>
              ) : (
                sessions.map(s => (
                  <option key={s.id} value={s.id}>{getSessionLabel(s)}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{presentCount}</div>
              <div className="text-sm text-gray-500">Присутствуют</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold">{absentCount}</div>
              <div className="text-sm text-gray-500">Отсутствуют</div>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <MinusCircle className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-2xl font-bold">{unmarkedCount}</div>
              <div className="text-sm text-gray-500">Не отмечены</div>
            </div>
          </div>
          <div className="card p-4">
            <button
              onClick={markAllPresent}
              disabled={isSaving || unmarkedCount === 0}
              className="btn-primary w-full h-full"
            >
              {isSaving ? 'Сохранение...' : 'Отметить всех ✓'}
            </button>
          </div>
        </div>

        {selectedSession && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ученик</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Абонемент</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Присутствует</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Отсутствует</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Уважительная</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studentAttendances.map(({ student, attendance, hasActiveSubscription }) => (
                  <tr 
                    key={student.id} 
                    className={!hasActiveSubscription ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{student.name}</div>
                      {!hasActiveSubscription && (
                        <div className="text-xs text-orange-600">Нет активного абонемента</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasActiveSubscription ? (
                        <span className="text-sm text-green-600">Активен</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => markAttendance(student.id, 'present')}
                        disabled={!hasActiveSubscription}
                        className={`p-2 rounded-full transition-colors ${
                          attendance?.status === 'present'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => markAttendance(student.id, 'absent')}
                        className={`p-2 rounded-full transition-colors ${
                          attendance?.status === 'absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                        }`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => markAttendance(student.id, 'excused')}
                        className={`p-2 rounded-full transition-colors ${
                          attendance?.status === 'excused'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {studentAttendances.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Нет учеников в этом клубе
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
