import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  Search, Bell, MessageSquare, Users, ChevronRight, Menu,
  LogIn, Plus, MessagesSquare, ShieldCheck, Clock3
} from 'lucide-react';

const sampleCategories = [
  { id: 'general', name: 'Общение', description: 'Общие разговоры и знакомство участников', threads: 128, posts: 942, icon: '💬' },
  { id: 'news', name: 'Новости и объявления', description: 'Важные новости сообщества и обновления', threads: 42, posts: 186, icon: '📢' },
  { id: 'support', name: 'Вопросы и помощь', description: 'Помощь, инструкции и решение проблем', threads: 76, posts: 314, icon: '🛠️' },
  { id: 'market', name: 'Торговая площадка', description: 'Покупка, продажа, обмен и предложения', threads: 53, posts: 207, icon: '🛒' },
];

function App() {
  const [categories, setCategories] = useState(sampleCategories);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    setLoading(true);
    supabase.from('categories').select('id,name,description,sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data?.length) {
          setCategories(data.map((item) => ({
            ...item, threads: 0, posts: 0, icon: '💬'
          })));
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="app-shell">
      <div className="topline">
        <div className="container top-line-inner">
          <span>Форум сообщества</span>
          <span className="top-links">Правила <span>·</span> Помощь <span>·</span> Контакты</span>
        </div>
      </div>

      <header className="header">
        <div className="container header-inner">
          <button className="mobile-menu icon-button" aria-label="Открыть меню"><Menu size={20} /></button>
          <a className="brand" href="#">
            <span className="brand-mark"><MessagesSquare size={23} /></span>
            <span><strong>XenForo</strong><small>COMMUNITY FORUM</small></span>
          </a>
          <nav className="main-nav">
            <a className="active" href="#forums">Форумы</a>
            <a href="#whats-new">Что нового</a>
            <a href="#members">Участники</a>
          </nav>
          <div className="header-actions">
            <button className="icon-button" aria-label="Поиск"><Search size={19} /></button>
            <button className="icon-button" aria-label="Уведомления"><Bell size={19} /></button>
            <button className="login-button"><LogIn size={16} /> Войти</button>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <section className="welcome">
          <div>
            <div className="eyebrow"><span className="live-dot" /> СООБЩЕСТВО</div>
            <h1>Добро пожаловать на форум</h1>
            <p>Место для общения, обмена опытом и новых знакомств.</p>
            <div className="welcome-actions">
              <button className="primary-button"><Plus size={17} /> Создать тему</button>
              <button className="secondary-button">Регистрация</button>
            </div>
          </div>
          <div className="welcome-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><MessagesSquare size={76} strokeWidth={1.2} /></div>
        </section>

        <div className="breadcrumb"><span>Главная</span><ChevronRight size={14} /><strong>Форумы</strong></div>

        <div className="content-grid" id="forums">
          <section className="forum-column">
            <div className="section-heading">
              <div><h2>Форумы</h2><p>Обсуждения и разделы сообщества</p></div>
              <button className="text-button">Отметить прочитанным</button>
            </div>
            <div className="category-list">
              {categories.map((category) => (
                <article className="category-card" key={category.id}>
                  <div className="category-icon">{category.icon || '💬'}</div>
                  <div className="category-main">
                    <a href={`#${category.id}`} className="category-title">{category.name}</a>
                    <p>{category.description}</p>
                    <div className="category-meta"><span><MessageSquare size={13} /> {category.threads} тем</span><span><MessagesSquare size={13} /> {category.posts} сообщений</span></div>
                  </div>
                  <div className="category-last"><span className="last-label">Последнее сообщение</span><strong>Пока нет сообщений</strong><small>Будьте первым!</small></div>
                  <ChevronRight className="category-chevron" size={18} />
                </article>
              ))}
              {loading && <div className="loading-note">Загружаем разделы…</div>}
            </div>

            <div className="section-heading whats-new-heading" id="whats-new">
              <div><h2>Последние обсуждения</h2><p>Недавняя активность на форуме</p></div>
              <button className="text-button">Все обсуждения <ChevronRight size={14} /></button>
            </div>
            <div className="empty-state">
              <div className="empty-icon"><MessageSquare size={24} /></div>
              <strong>Здесь скоро появятся обсуждения</strong>
              <span>Подключите Supabase и создайте первую тему.</span>
            </div>
          </section>

          <aside className="sidebar">
            <div className="side-card stats-card">
              <h3>Статистика форума</h3>
              <div className="stat-row"><span><MessagesSquare size={16} /> Темы</span><strong>299</strong></div>
              <div className="stat-row"><span><MessageSquare size={16} /> Сообщения</span><strong>1 649</strong></div>
              <div className="stat-row"><span><Users size={16} /> Участники</span><strong>—</strong></div>
              <div className="stat-row"><span><ShieldCheck size={16} /> Новый участник</span><strong>—</strong></div>
            </div>
            <div className="side-card online-card">
              <h3>Сейчас на форуме</h3>
              <div className="online-number"><span className="live-dot" /> 1</div>
              <p>Гость просматривает форум</p>
            </div>
            <div className="side-card help-card">
              <div className="help-icon"><Clock3 size={18} /></div>
              <div><strong>Впервые здесь?</strong><p>Ознакомьтесь с правилами сообщества и начните общение.</p><a href="#rules">Подробнее <ChevronRight size={13} /></a></div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner"><span>© {new Date().getFullYear()} XenForo Copy</span><span>Работает на React и Supabase</span></div>
      </footer>
      {!isSupabaseConfigured && <div className="setup-hint">Демонстрационный режим · Для подключения базы добавьте переменные Supabase</div>}
    </div>
  );
}

export default App;