import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Users, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';

interface FinanceReport {
  total_paid: number;
  total_refunded: number;
  net_revenue: number;
  payment_count: number;
  avg_payment: number;
  payments_by_method: { method: string; amount: number; count: number }[];
  payments_by_group: { group_id: string; group_title: string; amount: number; count: number }[];
  daily_revenue: { date: string; amount: number; count: number }[];
}

interface OccupancyReport {
  avg_fill_rate: number;
  total_sessions: number;
  total_attendees: number;
  group_stats: { group_id: string; group_title: string; capacity: number; session_count: number; total_present: number; avg_fill_rate: number }[];
}

interface StudentsReport {
  total_students: number;
  active_students: number;
  avg_sessions_per_student: number;
  top_students: { student_id: string; student_name: string; session_count: number; present_count: number; attendance_rate: number }[];
}

interface DebtReport {
  total_pending_amount: number;
  pending_count: number;
  debtors: { student_id: string; student_name: string; parent_phone: string; amount: number; days_overdue: number }[];
}

export default function ReportsPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [activeTab, setActiveTab] = useState<'finance' | 'occupancy' | 'students' | 'debt'>('finance');
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null);
  const [occupancyReport, setOccupancyReport] = useState<OccupancyReport | null>(null);
  const [studentsReport, setStudentsReport] = useState<StudentsReport | null>(null);
  const [debtReport, setDebtReport] = useState<DebtReport | null>(null);

  useEffect(() => {
    loadReport();
  }, [clubId, activeTab, dateRange]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = { from: dateRange.from, to: dateRange.to };
      
      switch (activeTab) {
        case 'finance':
          const finRes = await api.get(`/clubs/${clubId}/reports/finance`, { params });
          setFinanceReport(finRes.data.data);
          break;
        case 'occupancy':
          const occRes = await api.get(`/clubs/${clubId}/reports/occupancy`, { params });
          setOccupancyReport(occRes.data.data);
          break;
        case 'students':
          const stuRes = await api.get(`/clubs/${clubId}/reports/students`, { params });
          setStudentsReport(stuRes.data.data);
          break;
        case 'debt':
          const debtRes = await api.get(`/clubs/${clubId}/reports/debt`, { params: { days: 7 } });
          setDebtReport(debtRes.data.data);
          break;
      }
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'finance', label: 'Финансы', icon: DollarSign },
    { key: 'occupancy', label: 'Загруженность', icon: Calendar },
    { key: 'students', label: 'Ученики', icon: Users },
    { key: 'debt', label: 'Долги', icon: AlertTriangle },
  ] as const;

  return (
    <Layout clubId={clubId!} currentPage="reports">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Отчёты</h1>

        <div className="flex gap-4 mb-6">
          <div>
            <label className="label">От</label>
            <input
              type="date"
              className="input mt-1"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div>
            <label className="label">До</label>
            <input
              type="date"
              className="input mt-1"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="text-gray-500">Загрузка отчёта...</div>
        ) : (
          <>
            {activeTab === 'finance' && financeReport && (
              <FinanceReportView report={financeReport} />
            )}
            {activeTab === 'occupancy' && occupancyReport && (
              <OccupancyReportView report={occupancyReport} />
            )}
            {activeTab === 'students' && studentsReport && (
              <StudentsReportView report={studentsReport} />
            )}
            {activeTab === 'debt' && debtReport && (
              <DebtReportView report={debtReport} />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function FinanceReportView({ report }: { report: FinanceReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Общий доход</div>
          <div className="text-3xl font-bold text-green-600">
            {report.net_revenue.toLocaleString()} ₸
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Получено</div>
          <div className="text-2xl font-bold">{report.total_paid.toLocaleString()} ₸</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Возвраты</div>
          <div className="text-2xl font-bold text-red-600">{report.total_refunded.toLocaleString()} ₸</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Кол-во платежей</div>
          <div className="text-2xl font-bold">{report.payment_count}</div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Доход по группам</h3>
        <div className="space-y-3">
          {report.payments_by_group.map(g => (
            <div key={g.group_id} className="flex items-center justify-between">
              <span>{g.group_title}</span>
              <span className="font-semibold">{g.amount.toLocaleString()} ₸</span>
            </div>
          ))}
          {report.payments_by_group.length === 0 && (
            <div className="text-gray-500">Нет данных</div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">По способу оплаты</h3>
        <div className="space-y-3">
          {report.payments_by_method.map(m => (
            <div key={m.method} className="flex items-center justify-between">
              <span className="capitalize">{m.method === 'stripe' ? 'Карта' : m.method === 'cash' ? 'Наличные' : m.method}</span>
              <span className="font-semibold">{m.amount.toLocaleString()} ₸</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OccupancyReportView({ report }: { report: OccupancyReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Средняя загруженность</div>
          <div className="text-3xl font-bold">{report.avg_fill_rate.toFixed(1)}%</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Всего занятий</div>
          <div className="text-2xl font-bold">{report.total_sessions}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Всего посещений</div>
          <div className="text-2xl font-bold">{report.total_attendees}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Группа</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Вместимость</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Занятий</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Посещений</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Загруженность</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.group_stats.map(g => (
              <tr key={g.group_id}>
                <td className="px-4 py-3 font-medium">{g.group_title}</td>
                <td className="px-4 py-3 text-center">{g.capacity}</td>
                <td className="px-4 py-3 text-center">{g.session_count}</td>
                <td className="px-4 py-3 text-center">{g.total_present}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(g.avg_fill_rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{g.avg_fill_rate.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentsReportView({ report }: { report: StudentsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Всего учеников</div>
          <div className="text-3xl font-bold">{report.total_students}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Активных</div>
          <div className="text-2xl font-bold text-green-600">{report.active_students}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Среднее посещений</div>
          <div className="text-2xl font-bold">{report.avg_sessions_per_student.toFixed(1)}</div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Топ учеников по посещаемости</h3>
        <div className="space-y-3">
          {report.top_students.map((s, i) => (
            <div key={s.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <span className="font-medium">{s.student_name}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{s.present_count} посещений</div>
                <div className="text-sm text-gray-500">{s.attendance_rate.toFixed(0)}% явка</div>
              </div>
            </div>
          ))}
          {report.top_students.length === 0 && (
            <div className="text-gray-500">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebtReportView({ report }: { report: DebtReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 border-orange-200 bg-orange-50">
          <div className="text-sm text-orange-600 mb-1">Сумма задолженности</div>
          <div className="text-3xl font-bold text-orange-600">
            {report.total_pending_amount.toLocaleString()} ₸
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-gray-500 mb-1">Должников</div>
          <div className="text-2xl font-bold">{report.pending_count}</div>
        </div>
      </div>

      {report.debtors.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ученик</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Телефон</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Сумма</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Дней просрочки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.debtors.map(d => (
                <tr key={d.student_id}>
                  <td className="px-4 py-3 font-medium">{d.student_name}</td>
                  <td className="px-4 py-3">
                    {d.parent_phone ? (
                      <a href={`tel:${d.parent_phone}`} className="text-primary">{d.parent_phone}</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{d.amount.toLocaleString()} ₸</td>
                  <td className="px-4 py-3 text-right">
                    <span className={d.days_overdue > 14 ? 'text-red-600 font-semibold' : ''}>
                      {d.days_overdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.debtors.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          Нет должников 🎉
        </div>
      )}
    </div>
  );
}
