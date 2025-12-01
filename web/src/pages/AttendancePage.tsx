import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupsApi, studentsApi, sessionsApi, attendanceApi, subscriptionsApi } from '../lib/api';
import type { Group, Student, Session, Subscription, Attendance } from '../lib/api';
import { Zap, LogOut, Menu, X, Users, Calendar, Check, X as XIcon, AlertCircle, Plus } from 'lucide-react';

interface StudentWithSubscription extends Student {
  subscription?: Subscription;
  attendance_status?: 'present' | 'absent' | 'excused' | null;
  attendance_id?: string;
}

export default function AttendancePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<StudentWithSubscription[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().slice(0, 16));
  const [clubId, setClubId] = useState<string>('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup && clubId) {
      loadSessions(selectedGroup.id);
      loadSubscriptions(selectedGroup.id);
    }
  }, [selectedGroup, clubId]);

  useEffect(() => {
    if (selectedSession && subscriptions.length > 0) {
      loadAttendance(selectedSession.id);
    }
  }, [selectedSession, subscriptions]);

  const loadGroups = async () => {
    try {
      const clubsRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/clubs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      const clubsData = await clubsRes.json();
      if (clubsData.data && clubsData.data.length > 0) {
        const club = clubsData.data[0];
        setClubId(club.id);
        const groupsRes = await groupsApi.list(club.id);
        const groupsData = groupsRes.data?.data || groupsRes.data || [];
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      }
    } catch (err) {
      setError('Ошибка загрузки групп');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async (groupId: string) => {
    try {
      const res = await sessionsApi.list(groupId);
      const sessionsData = res.data?.data || res.data || [];
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : [];
      sessionsArray.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
      setSessions(sessionsArray);
      const today = new Date().toDateString();
      const todaySession = sessionsArray.find(s => new Date(s.start_at).toDateString() === today);
      setSelectedSession(todaySession || sessionsArray[0] || null);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setSessions([]);
    }
  };

  const loadSubscriptions = async (groupId: string) => {
    try {
      const res = await subscriptionsApi.listByClub(clubId, 'active');
      const subsData = res.data?.data || res.data || [];
      const filtered = Array.isArray(subsData) ? subsData.filter(s => s.group_id === groupId) : [];
      setSubscriptions(filtered);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setSubscriptions([]);
    }
  };

  const loadAttendance = async (sessionId: string) => {
    try {
      const activeStudents: StudentWithSubscription[] = [];
      
      for (const sub of subscriptions) {
        if (sub.status === 'active' && sub.remaining_sessions > 0) {
          try {
            const studentRes = await studentsApi.get(sub.student_id);
            const student = studentRes.data?.data || studentRes.data;
            activeStudents.push({
              ...student,
              subscription: sub,
              attendance_status: null,
              attendance_id: undefined
            });
          } catch (e) {
            console.error('Error loading student:', e);
          }
        }
      }

      try {
        const attRes = await attendanceApi.getBySession(sessionId);
        const attendanceData = attRes.data?.data || attRes.data || [];
        const attendanceArray = Array.isArray(attendanceData) ? attendanceData : [];
        
        for (const student of activeStudents) {
          const att = attendanceArray.find((a: Attendance) => a.student_id === student.id);
          if (att) {
            student.attendance_status = att.status;
            student.attendance_id = att.id;
          }
        }
      } catch (e) {
        // No attendance yet
      }

      setStudents(activeStudents);
    } catch (err) {
      console.error('Error loading attendance:', err);
      setStudents([]);
    }
  };

  const createSession = async () => {
    if (!selectedGroup) return;
    
    try {
      const res = await sessionsApi.create(selectedGroup.id, {
        start_at: new Date(newSessionDate).toISOString(),
        duration_minutes: 60
      });
      const session = res.data?.data || res.data;
      setSessions([session, ...sessions]);
      setSelectedSession(session);
      setShowNewSession(false);
      setSuccess('Занятие создано');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Ошибка создания занятия');
    }
  };

  const markAttendance = async (student: StudentWithSubscription, status: 'present' | 'absent' | 'excused') => {
    if (!selectedSession || !student.subscription) return;
    
    setIsSaving(true);
    try {
      if (student.attendance_id) {
        await attendanceApi.update(student.attendance_id, { status });
      } else {
        await attendanceApi.mark({
          session_id: selectedSession.id,
          student_id: student.id,
          status
        });
      }
      
      await loadAttendance(selectedSession.id);
      await loadSubscriptions(selectedGroup!.id);
      
      setSuccess('Сохранено');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const navItems = [
    { to: '/dashboard', label: 'Главная' },
    { to: '/groups', label: 'Группы' },
    { to: '/students', label: 'Ученики' },
    { to: '/attendance', label: 'Посещаемость' },
    { to: '/subscriptions', label: 'Абонементы' },
    { to: '/reports', label: 'Отчёты' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
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
                      item.to === '/attendance' 
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

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Посещаемость</h1>
            <p className="text-gray-400 mt-1">Отмечайте присутствие учеников на занятиях</p>
          </div>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <Check className="w-5 h-5" /> {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Нет групп</h3>
            <p className="text-gray-400 mb-6">Сначала создайте группу для отметки посещаемости</p>
            <Link to="/groups" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold">
              Создать группу
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-4">
                <label className="block text-sm text-gray-400 mb-2">Группа</label>
                <select
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    setSelectedGroup(group || null);
                    setSelectedSession(null);
                    setStudents([]);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.title}</option>
                  ))}
                </select>
              </div>

              {selectedGroup && (
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-gray-400">Занятия</label>
                    <button
                      onClick={() => setShowNewSession(true)}
                      className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Новое
                    </button>
                  </div>

                  {showNewSession && (
                    <div className="mb-3 p-3 bg-white/5 rounded-xl">
                      <input
                        type="datetime-local"
                        value={newSessionDate}
                        onChange={(e) => setNewSessionDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-2"
                      />
                      <div className="flex gap-2">
                        <button onClick={createSession} className="flex-1 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                          Создать
                        </button>
                        <button onClick={() => setShowNewSession(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white">
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sessions.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">Нет занятий</p>
                    ) : (
                      sessions.map(session => (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSession(session)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                            selectedSession?.id === session.id
                              ? 'bg-orange-500/20 border border-orange-500/50 text-white'
                              : 'bg-white/5 border border-transparent text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.start_at)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-3">
              {!selectedSession ? (
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Выберите занятие</h3>
                  <p className="text-gray-400">Выберите группу и занятие для отметки посещаемости</p>
                </div>
              ) : students.length === 0 ? (
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-12 text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Нет учеников</h3>
                  <p className="text-gray-400 mb-6">В этой группе нет учеников с активными абонементами</p>
                  <Link to="/subscriptions" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl font-semibold">
                    Создать абонемент
                  </Link>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10">
                    <h3 className="font-bold">{selectedGroup?.title} — {formatDate(selectedSession.start_at)}</h3>
                    <p className="text-sm text-gray-400">{students.length} учеников с абонементами</p>
                  </div>
                  
                  <div className="divide-y divide-white/5">
                    {students.map(student => (
                      <div key={student.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-400">
                              Осталось: {student.subscription?.remaining_sessions} / {student.subscription?.total_sessions} занятий
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markAttendance(student, 'present')}
                            disabled={isSaving}
                            className={`p-3 rounded-xl transition-all ${
                              student.attendance_status === 'present'
                                ? 'bg-green-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                            }`}
                            title="Присутствует"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => markAttendance(student, 'absent')}
                            disabled={isSaving}
                            className={`p-3 rounded-xl transition-all ${
                              student.attendance_status === 'absent'
                                ? 'bg-red-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400'
                            }`}
                            title="Отсутствует"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => markAttendance(student, 'excused')}
                            disabled={isSaving}
                            className={`p-3 rounded-xl transition-all ${
                              student.attendance_status === 'excused'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400'
                            }`}
                            title="Уважительная причина"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
