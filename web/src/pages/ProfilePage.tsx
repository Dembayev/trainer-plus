import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Zap, LogOut, Menu, X, User, Mail, Phone, MapPin, Camera, Save, ArrowLeft, Building, Globe } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    bio: user?.bio || '',
    company: user?.company || '',
    website: user?.website || '',
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Файл слишком большой. Максимум 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('phone', form.phone);
      formData.append('city', form.city);
      formData.append('bio', form.bio);
      formData.append('company', form.company);
      formData.append('website', form.website);
      
      if (fileInputRef.current?.files?.[0]) {
        formData.append('avatar', fileInputRef.current.files[0]);
      }

      await api.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      
      setSuccess('Профиль успешно обновлён!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Назад</span>
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">Тренер+</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-gray-400">{user?.name}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white"><LogOut className="w-5 h-5" /></button>
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Настройки профиля</h1>
        <p className="text-gray-400 mb-8">Управляйте своими личными данными</p>

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <Save className="w-5 h-5" /> {success}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Section */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Фото профиля</h2>
            <div className="flex items-center gap-6">
              <div 
                onClick={handleAvatarClick}
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center cursor-pointer group overflow-hidden"
              >
                {avatarPreview || user?.avatar ? (
                  <img src={avatarPreview || user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{getInitials(user?.name || 'U')}</span>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8" />
                </div>
              </div>
              <div>
                <button 
                  type="button" 
                  onClick={handleAvatarClick}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-medium transition-all"
                >
                  Загрузить фото
                </button>
                <p className="text-gray-500 text-sm mt-2">JPG, PNG. Максимум 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Личная информация</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Имя *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={form.email}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">Email изменить нельзя</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Телефон</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+7 777 123 4567"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Город</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Алматы"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Профессиональная информация</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Название клуба / компании</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Спортивный клуб 'Чемпион'"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Веб-сайт</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">О себе</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Расскажите о себе, вашем опыте и специализации..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link to="/dashboard" className="px-6 py-3 rounded-xl border border-white/10 font-semibold hover:bg-white/5 transition-all">
              Отмена
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
