import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clubsApi, groupsApi } from '../lib/api';
import { Building2, Users, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingData {
  clubName: string;
  clubAddress: string;
  clubPhone: string;
  currency: string;
  groups: { title: string; sport: string; price: number; capacity: number }[];
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<OnboardingData>({
    clubName: '',
    clubAddress: '',
    clubPhone: '',
    currency: 'KZT',
    groups: [{ title: '', sport: '', price: 15000, capacity: 20 }],
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Create club
      console.log('Creating club...');
      const clubRes = await clubsApi.create({
        name: data.clubName,
        address: data.clubAddress,
        phone: data.clubPhone,
        currency: data.currency,
      });

      console.log('Club created:', clubRes.data);
      const clubId = clubRes.data.data.id;

      // Create groups
      const groupsToCreate = data.groups.filter(g => g.title.trim());
      console.log('Creating groups:', groupsToCreate);
      
      for (const group of groupsToCreate) {
        console.log('Creating group:', group);
        try {
          const groupRes = await groupsApi.create({
            club_id: clubId,
            title: group.title,
            sport: group.sport || '',
            price: group.price || 0,
            capacity: group.capacity || 20,
          });
          console.log('Group created:', groupRes.data);
        } catch (groupErr: any) {
          console.error('Failed to create group:', groupErr.response?.data || groupErr);
          setError(`Ошибка создания группы "${group.title}": ${groupErr.response?.data?.error?.message || groupErr.message}`);
          setIsLoading(false);
          return;
        }
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Error:', err.response?.data || err);
      setError(err.response?.data?.error?.message || 'Ошибка создания клуба');
    } finally {
      setIsLoading(false);
    }
  };

  const addGroup = () => {
    setData({
      ...data,
      groups: [...data.groups, { title: '', sport: '', price: 15000, capacity: 20 }],
    });
  };

  const updateGroup = (index: number, field: string, value: any) => {
    const groups = [...data.groups];
    groups[index] = { ...groups[index], [field]: value };
    setData({ ...data, groups });
  };

  const removeGroup = (index: number) => {
    if (data.groups.length > 1) {
      const groups = data.groups.filter((_, i) => i !== index);
      setData({ ...data, groups });
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return data.clubName.trim().length > 0;
      case 2:
        return data.groups.some(g => g.title.trim().length > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Тренер+</h1>
          <p className="text-gray-600">Настройка вашего клуба</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 ${
                    s < step ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="card p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Club Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Ваш клуб</h2>
                  <p className="text-gray-500 text-sm">Основная информация</p>
                </div>
              </div>

              <div>
                <label className="label">Название клуба *</label>
                <input
                  type="text"
                  className="input mt-1"
                  placeholder="Hockey Club Almaty"
                  value={data.clubName}
                  onChange={(e) => setData({ ...data, clubName: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Адрес</label>
                <input
                  type="text"
                  className="input mt-1"
                  placeholder="ул. Абая 150, Алматы"
                  value={data.clubAddress}
                  onChange={(e) => setData({ ...data, clubAddress: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Телефон</label>
                <input
                  type="tel"
                  className="input mt-1"
                  placeholder="+7 777 123 45 67"
                  value={data.clubPhone}
                  onChange={(e) => setData({ ...data, clubPhone: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Валюта</label>
                <select
                  className="input mt-1"
                  value={data.currency}
                  onChange={(e) => setData({ ...data, currency: e.target.value })}
                >
                  <option value="KZT">₸ Тенге (KZT)</option>
                  <option value="RUB">₽ Рубль (RUB)</option>
                  <option value="USD">$ Доллар (USD)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Groups */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Группы</h2>
                  <p className="text-gray-500 text-sm">Добавьте тренировочные группы</p>
                </div>
              </div>

              {data.groups.map((group, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Группа {index + 1}</span>
                    {data.groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroup(index)}
                        className="text-red-500 text-sm hover:underline"
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="label">Название *</label>
                    <input
                      type="text"
                      className="input mt-1"
                      placeholder="U12 Хоккей"
                      value={group.title}
                      onChange={(e) => updateGroup(index, 'title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Вид спорта</label>
                    <input
                      type="text"
                      className="input mt-1"
                      placeholder="Хоккей"
                      value={group.sport}
                      onChange={(e) => updateGroup(index, 'sport', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Вместимость</label>
                      <input
                        type="number"
                        className="input mt-1"
                        placeholder="20"
                        value={group.capacity}
                        onChange={(e) => updateGroup(index, 'capacity', parseInt(e.target.value) || 20)}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="label">Цена (₸)</label>
                      <input
                        type="number"
                        className="input mt-1"
                        placeholder="15000"
                        value={group.price}
                        onChange={(e) => updateGroup(index, 'price', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addGroup}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + Добавить ещё группу
              </button>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Всё готово!</h2>
                  <p className="text-gray-500 text-sm">Проверьте данные</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">{data.clubName}</h3>
                  {data.clubAddress && <p className="text-sm text-gray-600">{data.clubAddress}</p>}
                  {data.clubPhone && <p className="text-sm text-gray-600">{data.clubPhone}</p>}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Группы ({data.groups.filter(g => g.title).length})</h4>
                  <div className="space-y-2">
                    {data.groups
                      .filter(g => g.title)
                      .map((group, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{group.title}</span>
                            <span className="text-gray-500 text-sm ml-2">({group.capacity} чел.)</span>
                          </div>
                          <span className="text-gray-600">{group.price.toLocaleString()} ₸</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button 
                type="button"
                onClick={handleBack} 
                className="btn-outline flex-1 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid() || isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Создание...'
              ) : step === totalSteps ? (
                'Создать клуб'
              ) : (
                <>
                  Далее
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip */}
        {step < totalSteps && (
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gray-700"
          >
            Пропустить настройку
          </button>
        )}
      </div>
    </div>
  );
}
