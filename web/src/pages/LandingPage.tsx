import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, CreditCard, BarChart3, Check, ChevronRight, Star, Zap, Shield, Smartphone, Play, ArrowRight, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Тренер+</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Возможности</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Тарифы</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Отзывы</a>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">Войти</Link>
              <Link to="/signup" className="bg-gradient-to-r from-orange-500 to-red-600 px-5 py-2.5 rounded-full font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                Начать бесплатно
              </Link>
            </div>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/10 px-4 py-6 space-y-4">
            <a href="#features" className="block text-gray-400 hover:text-white">Возможности</a>
            <a href="#pricing" className="block text-gray-400 hover:text-white">Тарифы</a>
            <Link to="/login" className="block text-gray-400 hover:text-white">Войти</Link>
            <Link to="/signup" className="block bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 rounded-full font-semibold text-center">
              Начать бесплатно
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-red-600/10 to-purple-600/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/30 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[128px]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-white/10">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Уже 500+ тренеров используют</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Управляй клубом.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 bg-clip-text text-transparent">
              Тренируй чемпионов.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Полная система для управления спортивным клубом: ученики, абонементы, расписание, посещаемость и финансы — всё в одном месте.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/signup" className="group bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-orange-500/25 transition-all flex items-center gap-2">
              Начать бесплатно
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-gray-300 hover:text-white border border-white/20 hover:border-white/40 transition-all">
              <Play className="w-5 h-5" />
              Смотреть демо
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">500+</div>
              <div className="text-gray-500 text-sm">Тренеров</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-500 bg-clip-text text-transparent">10K+</div>
              <div className="text-gray-500 text-sm">Учеников</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">50K+</div>
              <div className="text-gray-500 text-sm">Тренировок</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Всё что нужно для <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">успеха</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Мощные инструменты для управления вашим спортивным клубом</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-orange-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Управление учениками</h3>
              <p className="text-gray-400">Полная база учеников с контактами, историей посещений и статистикой прогресса.</p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-red-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Умное расписание</h3>
              <p className="text-gray-400">Гибкое расписание с повторяющимися занятиями и автоматическими напоминаниями.</p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-purple-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                <CreditCard className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Абонементы и оплаты</h3>
              <p className="text-gray-400">Автоматический учёт абонементов, онлайн-оплата и контроль задолженностей.</p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-blue-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Аналитика и отчёты</h3>
              <p className="text-gray-400">Детальная статистика по доходам, посещаемости и эффективности групп.</p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-green-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Мобильное приложение</h3>
              <p className="text-gray-400">Отмечайте посещаемость прямо с телефона. Работает офлайн.</p>
            </div>

            <div className="group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-yellow-500/50 transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Безопасность данных</h3>
              <p className="text-gray-400">Все данные зашифрованы и хранятся на защищённых серверах.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Простые и понятные <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">тарифы</span>
            </h2>
            <div className="inline-flex items-center gap-4 bg-white/5 p-1.5 rounded-full mt-8">
              <button onClick={() => setBillingPeriod('monthly')} className={`px-6 py-2 rounded-full font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                Ежемесячно
              </button>
              <button onClick={() => setBillingPeriod('yearly')} className={`px-6 py-2 rounded-full font-medium transition-all ${billingPeriod === 'yearly' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                Ежегодно <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
              <div className="text-gray-400 font-medium mb-2">Старт</div>
              <div className="text-4xl font-bold mb-2">Бесплатно</div>
              <div className="text-gray-500 mb-6">Навсегда</div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500" /><span className="text-gray-300">До 15 учеников</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500" /><span className="text-gray-300">1 группа</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500" /><span className="text-gray-300">Базовая аналитика</span></li>
              </ul>
              <Link to="/signup" className="block w-full py-3 text-center rounded-full border border-white/20 font-semibold hover:bg-white/5 transition-all">
                Начать бесплатно
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/50 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-1 rounded-full text-sm font-semibold">Популярный</div>
              <div className="text-orange-400 font-medium mb-2">Про</div>
              <div className="text-4xl font-bold mb-2">{billingPeriod === 'monthly' ? '4 990 ₸' : '3 990 ₸'}</div>
              <div className="text-gray-500 mb-6">в месяц</div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500" /><span className="text-gray-300">До 100 учеников</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500" /><span className="text-gray-300">Неограниченно групп</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500" /><span className="text-gray-300">Онлайн-оплаты</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-orange-500" /><span className="text-gray-300">Расширенная аналитика</span></li>
              </ul>
              <Link to="/signup" className="block w-full py-3 text-center rounded-full bg-gradient-to-r from-orange-500 to-red-600 font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                Начать 14-дневный триал
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
              <div className="text-gray-400 font-medium mb-2">Бизнес</div>
              <div className="text-4xl font-bold mb-2">{billingPeriod === 'monthly' ? '14 990 ₸' : '11 990 ₸'}</div>
              <div className="text-gray-500 mb-6">в месяц</div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-purple-500" /><span className="text-gray-300">Безлимит учеников</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-purple-500" /><span className="text-gray-300">Несколько филиалов</span></li>
                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-purple-500" /><span className="text-gray-300">API доступ</span></li>
              </ul>
              <Link to="/signup" className="block w-full py-3 text-center rounded-full border border-white/20 font-semibold hover:bg-white/5 transition-all">
                Связаться с нами
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-600/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Тренеры <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">любят нас</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (<Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />))}
              </div>
              <p className="text-gray-300 mb-6">"Раньше тратил по 3 часа в день на учёт. Теперь всё автоматизировано!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center font-bold">АК</div>
                <div>
                  <div className="font-semibold">Алмас Касымов</div>
                  <div className="text-gray-500 text-sm">Тренер по боксу, Алматы</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (<Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />))}
              </div>
              <p className="text-gray-300 mb-6">"Родители в восторге — видят прогресс детей онлайн. Рекомендую!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center font-bold">МН</div>
                <div>
                  <div className="font-semibold">Мария Назарова</div>
                  <div className="text-gray-500 text-sm">Школа гимнастики, Астана</div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (<Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />))}
              </div>
              <p className="text-gray-300 mb-6">"Наконец-то нормальная система для Казахстана! Спасибо!"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center font-bold">ЕС</div>
                <div>
                  <div className="font-semibold">Ерлан Сатыбалдиев</div>
                  <div className="text-gray-500 text-sm">Хоккейный клуб, Караганда</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 via-red-600/10 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Готовы <span className="bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 bg-clip-text text-transparent">вырасти</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-10">Присоединяйтесь к 500+ тренерам, которые уже используют Тренер+</p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 px-10 py-5 rounded-full font-bold text-xl hover:shadow-2xl hover:shadow-orange-500/25 transition-all">
            Начать бесплатно <ChevronRight className="w-6 h-6" />
          </Link>
          <p className="text-gray-500 mt-4">Бесплатно навсегда • Без кредитной карты</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          © 2025 Тренер+. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
