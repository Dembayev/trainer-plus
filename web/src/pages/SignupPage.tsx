import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setIsLoading(true);
    try {
      await signup(email, password, name);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-red-600/20 to-orange-600/30" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-500/40 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-orange-500/40 rounded-full blur-[128px]" />
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6">Начни <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">бесплатно</span></h2>
            <div className="text-left space-y-4 max-w-sm">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center"><Check className="w-5 h-5" /></div>
                <div><div className="font-semibold">До 15 учеников бесплатно</div><div className="text-sm text-gray-400">Навсегда</div></div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-lg flex items-center justify-center"><Check className="w-5 h-5" /></div>
                <div><div className="font-semibold">Настройка за 3 минуты</div><div className="text-sm text-gray-400">Простой интерфейс</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center"><Zap className="w-7 h-7 text-white" /></div>
            <span className="text-2xl font-bold">Тренер+</span>
          </Link>
          <h1 className="text-4xl font-bold mb-2">Создать аккаунт</h1>
          <p className="text-gray-400 mb-8">Начните управлять клубом уже сегодня</p>
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Имя</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition-all" required />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-red-600 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Создаём...</> : <>Создать аккаунт<ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
          <p className="text-center text-gray-400 mt-8">Уже есть аккаунт? <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Войти</Link></p>
        </div>
      </div>
    </div>
  );
}
