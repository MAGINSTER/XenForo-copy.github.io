import { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import {
  Search, Bell, MessageSquare, Users, ChevronRight, Menu, LogIn, LogOut,
  Plus, MessagesSquare, ShieldCheck, Clock3, X, ArrowLeft, Send, UserRound,
  LockKeyhole, Mail, UserPlus, RefreshCw, Trash2, Pin, Lock, Settings, FolderPlus
} from 'lucide-react';


const BBCodeToolbar = ({ onInsert }) => {
  const tools = [
    ['B', 'b', 'Жирный'], ['I', 'i', 'Курсив'], ['U', 'u', 'Подчёркнутый'],
    ['S', 's', 'Зачёркнутый'], ['Цитата', 'quote', 'Цитата'],
    ['Код', 'code', 'Код'], ['Список', 'list', 'Список'],
    ['Ссылка', 'url', 'Ссылка'], ['Изображение', 'img', 'Изображение'],
    ['Цвет', 'color', 'Цвет текста']
  ];
  return <div className="bbcode-toolbar" aria-label="BB-коды">
    {tools.map(([label, tag, title]) => <button type="button" key={tag} title={title} onClick={() => onInsert(tag)}>{label}</button>)}
    <span>BB-коды</span>
  </div>;
};

function parseBBCode(source) {
  const root = { tag: 'root', children: [] };
  const stack = [root];
  const tokenPattern = /\[(\*|\/?(?:b|i|u|s|strike|url|img|email|quote|code|spoiler|color|size|center|left|right|list)(?:=[^\]]*)?)\]/gi;
  let lastIndex = 0;
  let match;
  while ((match = tokenPattern.exec(source || '')) !== null) {
    if (match.index > lastIndex) stack[stack.length - 1].children.push({ text: source.slice(lastIndex, match.index) });
    const raw = match[1];
    if (raw === '*') {
      const listIndex = stack.map((node) => node.tag).lastIndexOf('list');
      if (listIndex > 0) {
        stack.length = listIndex + 1;
        const item = { tag: 'li', attr: '', children: [] };
        stack[listIndex].children.push(item);
        stack.push(item);
      }
      lastIndex = tokenPattern.lastIndex;
      continue;
    }
    if (raw.startsWith('/')) {
      const closingTag = raw.slice(1).toLowerCase();
      const closingIndex = stack.map((node) => node.tag).lastIndexOf(closingTag);
      if (closingIndex > 0) stack.length = closingIndex;
    } else {
      const separator = raw.indexOf('=');
      const tag = (separator === -1 ? raw : raw.slice(0, separator)).toLowerCase();
      const attr = separator === -1 ? '' : raw.slice(separator + 1).trim();
      const node = { tag, attr, children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    lastIndex = tokenPattern.lastIndex;
  }
  if (lastIndex < (source || '').length) stack[stack.length - 1].children.push({ text: source.slice(lastIndex) });
  return root.children;
}

function safeWebUrl(value) {
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderBBNodes(nodes, keyPrefix = 'bb') {
  return nodes.map((node, index) => {
    const key = keyPrefix + '-' + index;
    if (node.text !== undefined) {
      return node.text.split('\n').map((line, lineIndex) => <span key={key + '-' + lineIndex}>{line}{lineIndex < node.text.split('\n').length - 1 && <br />}</span>);
    }
    const children = renderBBNodes(node.children || [], key);
    const plainText = (node.children || []).map((child) => child.text ?? '').join('').trim();
    switch (node.tag) {
      case 'b': return <strong key={key}>{children}</strong>;
      case 'i': return <em key={key}>{children}</em>;
      case 'u': return <u key={key}>{children}</u>;
      case 's':
      case 'strike': return <s key={key}>{children}</s>;
      case 'url': {
        const href = safeWebUrl(node.attr || plainText);
        return href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{children.length ? children : href}</a> : <span key={key}>{children}</span>;
      }
      case 'email': {
        const email = node.attr || plainText;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? <a key={key} href={'mailto:' + email}>{children.length ? children : email}</a> : <span key={key}>{children}</span>;
      }
      case 'img': {
        const src = safeWebUrl(plainText);
        return src && src.startsWith('https://') ? <img key={key} className="bbcode-image" src={src} alt="Изображение из сообщения" loading="lazy" /> : <span key={key}>{children}</span>;
      }
      case 'quote': return <blockquote key={key} className="bbcode-quote">{node.attr && <cite>{node.attr}</cite>}{children}</blockquote>;
      case 'code': return <pre key={key} className="bbcode-code"><code>{(node.children || []).map((child) => child.text ?? '').join('')}</code></pre>;
      case 'spoiler': return <details key={key} className="bbcode-spoiler"><summary>Показать скрытый текст</summary><div>{children}</div></details>;
      case 'color': {
        const color = /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(node.attr) ? node.attr : null;
        return color ? <span key={key} style={{ color }}>{children}</span> : <span key={key}>{children}</span>;
      }
      case 'size': {
        const size = /^(8|9|10|11|12|14|16|18|20|22|24|28|32|36)(px)?$/i.test(node.attr) ? (node.attr.endsWith('px') ? node.attr : node.attr + 'px') : null;
        return size ? <span key={key} style={{ fontSize: size }}>{children}</span> : <span key={key}>{children}</span>;
      }
      case 'center': return <div key={key} style={{ textAlign: 'center' }}>{children}</div>;
      case 'left': return <div key={key} style={{ textAlign: 'left' }}>{children}</div>;
      case 'right': return <div key={key} style={{ textAlign: 'right' }}>{children}</div>;
      case 'list': {
        const items = (node.children || []).filter((child) => child.tag === 'li');
        const listItems = items.length ? items : [{ tag: 'li', children: node.children || [] }];
        return node.attr === '1' || node.attr.toLowerCase() === 'decimal'
          ? <ol key={key}>{listItems.map((item, i) => <li key={key + '-li-' + i}>{renderBBNodes(item.children || [], key + '-li-' + i)}</li>)}</ol>
          : <ul key={key}>{listItems.map((item, i) => <li key={key + '-li-' + i}>{renderBBNodes(item.children || [], key + '-li-' + i)}</li>)}</ul>;
      }
      case 'li': return <li key={key}>{children}</li>;
      default: return <span key={key}>{children}</span>;
    }
  });
}

function BBCodeContent({ value }) {
  return <div className="bbcode-content">{renderBBNodes(parseBBCode(value))}</div>;
}

function insertBBCode(textareaRef, setValue, tag) {
  const textarea = textareaRef.current;
  if (!textarea) return;
  let open = '[' + tag + ']';
  let close = '[/' + tag + ']';
  if (tag === 'url' || tag === 'img') {
    const url = window.prompt(tag === 'url' ? 'Введите адрес ссылки:' : 'Введите HTTPS-адрес изображения:');
    if (!url) return;
    if (!safeWebUrl(url) || (tag === 'img' && !url.trim().toLowerCase().startsWith('https://'))) {
      window.alert('Укажите корректный ' + (tag === 'img' ? 'HTTPS-адрес изображения.' : 'адрес ссылки.'));
      return;
    }
    open = tag === 'url' ? '[url=' + url.trim() + ']' : '[img]';
    close = '[/' + tag + ']';
    if (tag === 'img') {
      const insertion = open + url.trim() + close;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      setValue(value.slice(0, start) + insertion + value.slice(end));
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      });
      return;
    }
  } else if (tag === 'color') {
    const color = window.prompt('Цвет текста (например, #d32f2f):', '#d32f2f');
    if (!color || !/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(color.trim())) return;
    open = '[color=' + color.trim() + ']';
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const placeholder = selected || 'текст';
  const insertion = open + placeholder + close;
  setValue(value.slice(0, start) + insertion + value.slice(end));
  const cursor = start + open.length + placeholder.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selected ? cursor : start + open.length, selected ? cursor : start + open.length + placeholder.length);
  });
}

const dateLabel = (value) => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(new Date(value));

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', bio: '' });
  const [categories, setCategories] = useState([]);
  const [threads, setThreads] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [threadOpen, setThreadOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [threadForm, setThreadForm] = useState({ title: '', body: '', category_id: '', prefix: '' });
  const quickThreadBodyRef = useRef(null);
  const [reply, setReply] = useState('');
  const replyTextareaRef = useRef(null);
  const threadBodyTextareaRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', parent_id: '' });
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from('profiles')
        .select('id,username,avatar_url,bio,role')
        .eq('id', session.user.id).maybeSingle();
      if (active) {
        const nextProfile = data || {
          id: session.user.id,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Участник',
          bio: '',
          role: 'member'
        };
        setProfile(nextProfile);
        setProfileForm({ username: nextProfile.username || '', bio: nextProfile.bio || '' });
      }
    }
    loadProfile();
    return () => { active = false; };
  }, [session?.user?.id]);

  async function loadForum() {
    setLoading(true);
    const [categoryResult, threadResult] = await Promise.all([
      supabase.from('categories').select('id,name,description,sort_order,parent_id,node_type,link_url,xenforo_node_id,display_thread_count,display_post_count,last_thread_title,last_post_author,last_post_at,last_thread_url').order('sort_order', { ascending: true }),
      supabase.from('threads')
        .select('id,category_id,author_id,title,prefix,is_pinned,is_locked,created_at,updated_at,author:profiles!threads_author_id_fkey(username,avatar_url,role),category:categories!threads_category_id_fkey(name),posts(count)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60)
    ]);
    if (categoryResult.error) setMessage('Не удалось загрузить разделы: ' + categoryResult.error.message);
    else setCategories(categoryResult.data || []);
    if (threadResult.error) setMessage('Не удалось загрузить темы: ' + threadResult.error.message);
    else setThreads(threadResult.data || []);
    setLoading(false);
  }

  useEffect(() => { loadForum(); }, []);

  async function loadPosts(threadId) {
    const { data, error } = await supabase.from('posts')
      .select('id,body,created_at,updated_at,author:profiles!posts_author_id_fkey(username,avatar_url,role)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) setMessage('Не удалось загрузить сообщения: ' + error.message);
    else setPosts(data || []);
  }

  useEffect(() => {
    if (selectedThread?.id) loadPosts(selectedThread.id);
    else setPosts([]);
  }, [selectedThread?.id]);

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: {
            data: { username: authForm.username.trim() },
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Аккаунт создан. Проверьте почту и подтвердите адрес, затем войдите на форум.');
          setAuthMode('login');
        } else {
          setAuthOpen(false);
          setMessage('Добро пожаловать! Аккаунт создан.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password
        });
        if (error) throw error;
        setAuthOpen(false);
        setMessage('Вы успешно вошли на форум.');
      }
    } catch (error) {
      setMessage(error.message || 'Не удалось выполнить запрос.');
    } finally {
      setBusy(false);
    }
  }

  function openProfile() {
    if (!session?.user) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setProfileForm({ username: profile?.username || '', bio: profile?.bio || '' });
    setProfileOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!session?.user) return;
    const username = profileForm.username.trim();
    if (username.length < 3 || username.length > 32) {
      setMessage('Имя пользователя должно содержать от 3 до 32 символов.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.from('profiles')
      .update({ username, bio: profileForm.bio.trim() || null })
      .eq('id', session.user.id)
      .select('id,username,avatar_url,bio,role')
      .single();
    if (error) {
      setMessage(error.code === '23505' ? 'Это имя пользователя уже занято.' : 'Не удалось сохранить профиль: ' + error.message);
    } else {
      setProfile(data);
      setProfileOpen(false);
      setMessage('Профиль успешно обновлён.');
    }
    setBusy(false);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    else {
      setSelectedThread(null);
      setSelectedCategory(null);
      setMessage('Вы вышли из аккаунта.');
    }
  }

  async function deleteAccount() {
    if (!session?.user) return;
    const confirmed = window.confirm('Удалить аккаунт навсегда? Профиль, темы и сообщения будут удалены. Это действие нельзя отменить.');
    if (!confirmed) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      setMessage('Не удалось удалить аккаунт: ' + error.message);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
    setProfileOpen(false);
    setSelectedThread(null);
    setSelectedCategory(null);
    setMessage('Аккаунт удалён.');
    setBusy(false);
    await loadForum();
  }

  async function toggleThreadField(thread, field) {
    if (!isStaff) return;
    const { error } = await supabase.from('threads')
      .update({ [field]: !thread[field] })
      .eq('id', thread.id);
    if (error) {
      setMessage('Не удалось изменить тему: ' + error.message);
      return;
    }
    const updated = { ...thread, [field]: !thread[field] };
    if (selectedThread?.id === thread.id) setSelectedThread(updated);
    await loadForum();
    setMessage(field === 'is_pinned'
      ? (updated[field] ? 'Тема закреплена.' : 'Закрепление снято.')
      : (updated[field] ? 'Тема закрыта.' : 'Тема открыта.'));
  }

  async function deleteThread(thread) {
    if (!isStaff || !window.confirm('Удалить тему и все её сообщения?')) return;
    const { error } = await supabase.from('threads').delete().eq('id', thread.id);
    if (error) {
      setMessage('Не удалось удалить тему: ' + error.message);
      return;
    }
    if (selectedThread?.id === thread.id) setSelectedThread(null);
    await loadForum();
    setMessage('Тема удалена.');
  }

  async function openAdminPanel() {
    if (!isAdmin) return;
    setAdminPanelOpen(true);
    const { data, error } = await supabase.from('profiles')
      .select('id,username,role,created_at')
      .order('created_at', { ascending: false });
    if (error) setMessage('Не удалось загрузить участников: ' + error.message);
    else setAdminUsers(data || []);
  }

  async function createCategory(event) {
    event.preventDefault();
    if (!isAdmin) return;
    const name = categoryForm.name.trim();
    if (name.length < 2 || name.length > 80) {
      setMessage('Название раздела должно содержать от 2 до 80 символов.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('categories').insert({
      name,
      description: categoryForm.description.trim(),
      parent_id: categoryForm.parent_id || null,
      sort_order: categories.filter((item) => item.parent_id === (categoryForm.parent_id || null)).length + 1
    });
    if (error) setMessage('Не удалось создать раздел: ' + error.message);
    else {
      setCategoryForm({ name: '', description: '', parent_id: '' });
      await loadForum();
      setMessage('Раздел создан.');
    }
    setBusy(false);
  }

  async function deleteCategory(category) {
    if (!isAdmin || !window.confirm('Удалить раздел «' + category.name + '»? Все темы и сообщения в нём также будут удалены.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) setMessage('Не удалось удалить раздел: ' + error.message);
    else {
      if (selectedCategory?.id === category.id) setSelectedCategory(null);
      await loadForum();
      setMessage('Раздел удалён.');
    }
  }

  async function changeUserRole(user, role) {
    if (!isAdmin || user.id === session?.user?.id && role !== 'admin') {
      if (user.id === session?.user?.id && role !== 'admin') setMessage('Нельзя снять роль администратора с самого себя.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    if (error) setMessage('Не удалось изменить роль: ' + error.message);
    else {
      setAdminUsers((items) => items.map((item) => item.id === user.id ? { ...item, role } : item));
      if (user.id === session?.user?.id) setProfile((current) => ({ ...current, role }));
      setMessage('Роль участника обновлена.');
    }
  }

  async function createThread(event) {
    event.preventDefault();
    if (!session?.user) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setMessage('');
    const categoryId = threadForm.category_id || selectedCategory?.id || categories[0]?.id;
    const { data: created, error } = await supabase.from('threads').insert({
      category_id: categoryId,
      author_id: session.user.id,
      title: threadForm.title.trim(),
      prefix: threadForm.prefix || null
    }).select('id').single();
    if (error) {
      setMessage('Не удалось создать тему: ' + error.message);
      setBusy(false);
      return;
    }
    const { error: postError } = await supabase.from('posts').insert({
      thread_id: created.id,
      author_id: session.user.id,
      body: threadForm.body.trim()
    });
    setThreadOpen(false);
    setThreadForm({ title: '', body: '', category_id: '', prefix: '' });
    await loadForum();
    const { data: fullThread } = await supabase.from('threads')
      .select('id,category_id,author_id,title,is_pinned,is_locked,created_at,updated_at,author:profiles!threads_author_id_fkey(username,avatar_url,role),category:categories!threads_category_id_fkey(name),posts(count)')
      .eq('id', created.id).single();
    if (fullThread) {
      setSelectedCategory(null);
      setSelectedThread(fullThread);
    }
    if (postError) setMessage('Тема создана, но первое сообщение не сохранилось: ' + postError.message);
    else setMessage('Тема опубликована.');
    setBusy(false);
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!session?.user || !selectedThread || !reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.from('posts').insert({
      thread_id: selectedThread.id,
      author_id: session.user.id,
      body: reply.trim()
    });
    if (error) setMessage('Не удалось отправить ответ: ' + error.message);
    else {
      setReply('');
      await loadPosts(selectedThread.id);
      await loadForum();
    }
    setBusy(false);
  }

  const visibleThreads = threads.filter((thread) => {
    const inCategory = !selectedCategory || thread.category_id === selectedCategory.id;
    const matches = !search.trim() || thread.title.toLowerCase().includes(search.toLowerCase());
    return inCategory && matches;
  });
  const totalPosts = threads.reduce((sum, thread) => sum + (thread.posts?.[0]?.count || 0), 0);
  const currentThread = selectedThread
    ? threads.find((thread) => thread.id === selectedThread.id) || selectedThread
    : null;

  function openCategory(category) {
    if (category.node_type === 'link' && category.link_url) {
      window.open(category.link_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelectedThread(null);
    setSelectedCategory(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openThread(thread) {
    setSelectedCategory(null);
    setSelectedThread(thread);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
          <a className="brand" href="#" onClick={() => { setSelectedCategory(null); setSelectedThread(null); }}>
            <span className="brand-mark"><MessagesSquare size={23} /></span>
            <span><strong>XenForo</strong><small>COMMUNITY FORUM</small></span>
          </a>
          <nav className="main-nav">
            <a className={!selectedThread ? 'active' : ''} href="#forums" onClick={() => { setSelectedCategory(null); setSelectedThread(null); }}>Форумы</a>
            <a href="#whats-new" onClick={() => { setSelectedCategory(null); setSelectedThread(null); }}>Что нового</a>
            <a href="#members" onClick={(e) => { e.preventDefault(); openProfile(); }}>Участники</a>
          </nav>
          <div className="header-actions">
            <label className="header-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск тем" /></label>
            <button className="icon-button" aria-label="Обновить" onClick={loadForum}><RefreshCw size={17} /></button>
            {session ? (
              <div className="account-actions">
                {isAdmin && <button type="button" className="login-button" onClick={openAdminPanel}><Settings size={15} /> Админ-панель</button> }
                <button type="button" className="account-name" onClick={openProfile} title="Открыть профиль"><UserRound size={15} /> {profile?.username || 'Участник'}</button>
                <button type="button" className="login-button" onClick={openProfile}><UserRound size={15} /> Профиль</button>
                <button type="button" className="login-button" onClick={signOut}><LogOut size={15} /> Выйти</button>
              </div>
            ) : (
              <button className="login-button" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}><LogIn size={16} /> Войти</button>
            )}
          </div>
        </div>
      </header>

      <main className="container main-content">
        {!selectedThread && !selectedCategory && (
          <section className="welcome">
            <div>
              <div className="eyebrow"><span className="live-dot" /> СООБЩЕСТВО</div>
              <h1>Добро пожаловать на форум</h1>
              <p>Место для общения, обмена опытом и новых знакомств.</p>
              <div className="welcome-actions">
                <button className="primary-button" onClick={() => session ? setThreadOpen(true) : (setAuthMode('login'), setAuthOpen(true))}><Plus size={17} /> Создать тему</button>
                {!session && <button className="secondary-button" onClick={() => { setAuthMode('register'); setAuthOpen(true); }}>Регистрация</button>}
              </div>
            </div>
            <div className="welcome-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><MessagesSquare size={76} strokeWidth={1.2} /></div>
          </section>
        )}

        <div className="breadcrumb">
          <button onClick={() => { setSelectedCategory(null); setSelectedThread(null); }}>Главная</button>
          <ChevronRight size={14} />
          {selectedThread ? <><button onClick={() => { setSelectedThread(null); }}>Форумы</button><ChevronRight size={14} /><strong>{currentThread?.title}</strong></>
            : selectedCategory ? <><button onClick={() => setSelectedCategory(null)}>Форумы</button><ChevronRight size={14} /><strong>{selectedCategory.name}</strong></>
            : <strong>Форумы</strong>}
        </div>

        {message && <div className="notice" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Закрыть"><X size={15} /></button></div>}

        {selectedThread && currentThread ? (
          <section className="thread-view">
            <button className="back-link" onClick={() => { setSelectedThread(null); setSelectedCategory(categories.find((c) => c.id === currentThread.category_id) || null); }}><ArrowLeft size={15} /> Назад к разделу</button>
            <div className="thread-heading">
              <div className="eyebrow">{currentThread.category?.name || 'ОБСУЖДЕНИЕ'}</div>
              <h1>{currentThread.title}</h1>
              <div className="thread-subline">Автор: <strong>{currentThread.author?.username || 'Участник'}</strong> · {dateLabel(currentThread.created_at)} · {posts.length} сообщений</div>
            {isStaff && <div className="moderation-actions">
              <button className="text-button" onClick={() => toggleThreadField(currentThread, 'is_pinned')}><Pin size={14} /> {currentThread.is_pinned ? 'Открепить' : 'Закрепить'}</button>
              <button className="text-button" onClick={() => toggleThreadField(currentThread, 'is_locked')}><Lock size={14} /> {currentThread.is_locked ? 'Открыть тему' : 'Закрыть тему'}</button>
              <button className="text-button danger-text" onClick={() => deleteThread(currentThread)}><Trash2 size={14} /> Удалить тему</button>
            </div>}
            </div>
            <div className="post-list">
              {posts.map((post, index) => (
                <article className="post-card" key={post.id}>
                  <aside className="post-author">
                    <div className="avatar">{(post.author?.username || 'У').slice(0, 1).toUpperCase()}</div>
                    <strong>{post.author?.username || 'Участник'}</strong>
                    {post.author?.role && post.author.role !== 'member' && <span className="role-label">{post.author.role === 'admin' ? 'Администратор' : 'Модератор'}</span>}
                    <small>#{index + 1}</small>
                  </aside>
                  <div className="post-content">
                    <div className="post-date">{dateLabel(post.created_at)}</div>
                    <div className="post-body"><BBCodeContent value={post.body} /></div>
                  </div>
                </article>
              ))}
              {!posts.length && <div className="empty-state"><strong>Пока нет сообщений</strong><span>Станьте первым, кто ответит в этой теме.</span></div>}
            </div>
            {currentThread.is_locked ? <div className="locked-note"><LockKeyhole size={16} /> Тема закрыта для ответов.</div> : (
              <form className="reply-box" onSubmit={submitReply}>
                <h3>Написать ответ</h3>
                {session ? <><BBCodeToolbar onInsert={(tag) => insertBBCode(replyTextareaRef, setReply, tag)} /><textarea ref={replyTextareaRef} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ваше сообщение…" rows={4} required maxLength={20000} /><button className="primary-button" disabled={busy || !reply.trim()}><Send size={15} /> Отправить ответ</button></>
                  : <p>Чтобы ответить, <button type="button" className="inline-link" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>войдите в аккаунт</button>.</p>}
              </form>
            )}
          </section>
        ) : (
          <div className="content-grid" id="forums">
            <section className="forum-column">
              <div className="section-heading">
                <div><h2>{selectedCategory ? selectedCategory.name : 'Форумы'}</h2><p>{selectedCategory ? selectedCategory.description : 'Обсуждения и разделы сообщества'}</p></div>
                {selectedCategory ? <button className="text-button" onClick={() => setSelectedCategory(null)}>Все разделы</button> : <button className="text-button" onClick={loadForum}>Обновить</button>}
              </div>
              {!selectedCategory && (
                <div className="category-list">
                  {categories.filter((category) => !category.parent_id).map((category, index) => {
                    const categoryThreads = threads.filter((thread) => thread.category_id === category.id);
                    
                    const countPosts = category.display_post_count ?? categoryThreads.reduce((sum, thread) => sum + (thread.posts?.[0]?.count || 0), 0);
                    const threadCount = category.display_thread_count ?? categoryThreads.length;
                    const last = categoryThreads[0];
                    const lastTitle = category.last_thread_title || last?.title;
                    const lastAuthor = category.last_post_author || last?.author?.username;
                    return (
                      <article className="category-card" key={category.id} onClick={() => openCategory(category)}>
                        <div className="category-icon">{category.node_type === 'link' ? '🔗' : ['💬', '📢', '🛠️', '🛒'][index % 4]}</div>
                        <div className="category-main">
                          <button className="category-title" onClick={() => openCategory(category)}>{category.name}</button>
                          <p>{category.description}</p>
                          <div className="category-meta"><span><MessageSquare size={13} /> {threadCount} тем</span><span><MessagesSquare size={13} /> {countPosts} сообщений</span></div>
                        </div>
                        <div className="category-last"><span className="last-label">Последнее обсуждение</span><strong>{category.last_thread_url ? <a href={category.last_thread_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{lastTitle}</a> : (lastTitle || 'Пока нет сообщений')}</strong><small>{lastAuthor || 'Будьте первым!'}{category.last_post_at ? ' · ' + dateLabel(category.last_post_at) : ''}</small></div>
                        <ChevronRight className="category-chevron" size={18} />
                      </article>
                    );
                  })}
                  {loading && <div className="loading-note">Загружаем разделы…</div>}
                  {!loading && !categories.length && <div className="loading-note">Разделы пока не созданы.</div>}
                </div>
              )}

              {selectedCategory && categories.some((category) => category.parent_id === selectedCategory.id) && <div className="category-list nested-category-list">{categories.filter((category) => category.parent_id === selectedCategory.id).sort((a, b) => a.sort_order - b.sort_order).map((child) => {
                const childThreads = threads.filter((thread) => thread.category_id === child.id);
                const childPosts = child.display_post_count ?? childThreads.reduce((sum, thread) => sum + (thread.posts?.[0]?.count || 0), 0);
                const childCount = child.display_thread_count ?? childThreads.length;
                const lastChildThread = childThreads[0];
                return <article className="category-card xenforo-node-card" key={child.id} onClick={() => openCategory(child)}>
                  <div className="category-icon">{child.node_type === 'link' ? '🔗' : '📁'}</div>
                  <div className="category-main">
                    <button className="category-title" onClick={() => openCategory(child)}>{child.name}</button>
                    {child.description && <p>{child.description}</p>}
                    {child.node_type !== 'link' && <div className="category-meta"><span><MessageSquare size={13} /> {childCount} тем</span><span><MessagesSquare size={13} /> {childPosts} сообщений</span></div>}
                  </div>
                  <div className="category-last"><span className="last-label">{child.node_type === 'link' ? 'Внешняя ссылка' : 'Последнее обсуждение'}</span><strong>{child.last_thread_title || lastChildThread?.title || (child.node_type === 'link' ? 'Открыть ресурс' : 'Пока нет сообщений')}</strong><small>{child.last_post_author || lastChildThread?.author?.username || (child.node_type === 'link' ? child.link_url : 'Будьте первым!')}</small></div>
                  <ChevronRight className="category-chevron" size={18} />
                </article>;
              })}</div>}
{selectedCategory?.xenforo_node_id === 4 && <section className="quick-thread-panel">
                <div className="section-heading"><div><h2>Создать тему</h2><p>Быстрая публикация в разделе «LSPD»</p></div></div>
                {session ? <form className="quick-thread-form" onSubmit={createThread}>
                  <input required minLength={3} maxLength={180} aria-label="Заголовок" placeholder="Заголовок" value={threadForm.title} onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value, category_id: threadForm.category_id || selectedCategory.id })} />
                  <select aria-label="Префикс" value={threadForm.prefix} onChange={(e) => setThreadForm({ ...threadForm, prefix: e.target.value })}>
                    <option value="">(Без префикса)</option><optgroup label="Управление темами"><option value="Важно">Важно</option><option value="Информация">Информация</option><option value="Правила">Правила</option></optgroup>
                  </select>
                  <BBCodeToolbar onInsert={(tag) => insertBBCode(quickThreadBodyRef, (value) => setThreadForm((current) => ({ ...current, body: value, category_id: current.category_id || selectedCategory.id })), tag)} />
                  <textarea ref={quickThreadBodyRef} required rows={5} maxLength={20000} placeholder="Текст сообщения…" value={threadForm.body} onChange={(e) => setThreadForm({ ...threadForm, body: e.target.value, category_id: threadForm.category_id || selectedCategory.id })} />
                  <button className="primary-button" disabled={busy}>{busy ? 'Публикуем…' : 'Создать тему'}</button>
                </form> : <p>Чтобы создать тему, <button type="button" className="inline-link" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>войдите в аккаунт</button>.</p>}
              </section>}
              <div className="section-heading whats-new-heading" id="whats-new">
                <div><h2>{selectedCategory ? 'Темы раздела' : 'Последние обсуждения'}</h2><p>{selectedCategory ? 'Все темы выбранного раздела' : 'Недавняя активность на форуме'}</p></div>
                {session && <button className="text-button" onClick={() => { setThreadForm({ ...threadForm, category_id: selectedCategory?.id || '' }); setThreadOpen(true); }}><Plus size={14} /> Создать тему</button>}
              </div>
              <div className="thread-list">
                {visibleThreads.map((thread) => (
                  <article className="thread-row" key={thread.id} onClick={() => openThread(thread)}>
                    <div className="thread-avatar">{(thread.author?.username || 'У').slice(0, 1).toUpperCase()}</div>
                    <div className="thread-row-main">
                      <button className="thread-title" onClick={() => openThread(thread)}>{thread.is_pinned ? '📌 ' : ''}{thread.title}</button>
                      <p>{thread.prefix && <span className="thread-prefix">{thread.prefix}</span>} {thread.category?.name || 'Раздел'} · {thread.author?.username || 'Участник'} · {dateLabel(thread.created_at)}</p>
                    </div>
                    <div className="thread-replies"><strong>{thread.posts?.[0]?.count || 0}</strong><span>сообщ.</span></div>
                    {isStaff && <div className="thread-row-tools" onClick={(e) => e.stopPropagation()}>
                      <button className="mini-tool" title={thread.is_pinned ? 'Открепить' : 'Закрепить'} onClick={() => toggleThreadField(thread, 'is_pinned')}><Pin size={14} /></button>
                      <button className="mini-tool" title={thread.is_locked ? 'Открыть' : 'Закрыть'} onClick={() => toggleThreadField(thread, 'is_locked')}><Lock size={14} /></button>
                    </div>}
                    <ChevronRight size={17} />
                  </article>
                ))}
                {!loading && visibleThreads.length === 0 && <div className="empty-state"><div className="empty-icon"><MessageSquare size={24} /></div><strong>Здесь пока нет тем</strong><span>{session ? 'Создайте первое обсуждение в этом разделе.' : 'Войдите, чтобы начать обсуждение.'}</span></div>}
                {loading && <div className="loading-note">Загружаем обсуждения…</div>}
              </div>
            </section>

            <aside className="sidebar">
              <div className="side-card stats-card">
                <h3>Статистика форума</h3>
                <div className="stat-row"><span><MessagesSquare size={16} /> Темы</span><strong>{threads.length}</strong></div>
                <div className="stat-row"><span><MessageSquare size={16} /> Сообщения</span><strong>{totalPosts}</strong></div>
                <div className="stat-row"><span><Users size={16} /> Разделы</span><strong>{categories.length}</strong></div>
                <div className="stat-row"><span><ShieldCheck size={16} /> Участники</span><strong>—</strong></div>
              </div>
              <div className="side-card online-card">
                <h3>Ваш аккаунт</h3>
                {session ? <><div className="online-number"><span className="live-dot" /> {profile?.username || 'Участник'}</div><p>Вы вошли в систему.</p><button type="button" className="side-action" onClick={openProfile}>Открыть профиль</button></> : <><div className="online-number"><span className="live-dot" /> Гость</div><p>Войдите или зарегистрируйтесь, чтобы писать.</p><button className="side-action" onClick={() => { setAuthMode('register'); setAuthOpen(true); }}>Создать аккаунт</button></>}
              </div>
              <div className="side-card help-card">
                <div className="help-icon"><Clock3 size={18} /></div>
                <div><strong>Впервые здесь?</strong><p>Ознакомьтесь с правилами сообщества и начните общение.</p><a href="#rules">Подробнее <ChevronRight size={13} /></a></div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container footer-inner"><span>© {new Date().getFullYear()} XenForo Copy</span><span>Работает на React и Supabase</span></div>
      </footer>

      {authOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Закрыть"><X size={18} /></button>
            <div className="modal-symbol"><UserRound size={23} /></div>
            <h2 id="auth-title">{authMode === 'register' ? 'Регистрация' : 'Вход на форум'}</h2>
            <p className="modal-description">{authMode === 'register' ? 'Создайте аккаунт, чтобы участвовать в обсуждениях.' : 'Войдите, чтобы создавать темы и отвечать.'}</p>
            <form className="modal-form" onSubmit={submitAuth}>
              {authMode === 'register' && <label><span>Имя пользователя</span><div className="field-wrap"><UserPlus size={16} /><input required minLength={3} maxLength={32} value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })} placeholder="Ваш никнейм" /></div></label>}
              <label><span>Электронная почта</span><div className="field-wrap"><Mail size={16} /><input type="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="name@example.com" /></div></label>
              <label><span>Пароль</span><div className="field-wrap"><LockKeyhole size={16} /><input type="password" required minLength={6} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Не менее 6 символов" /></div></label>
              <button className="primary-button modal-submit" disabled={busy}>{busy ? 'Подождите…' : authMode === 'register' ? 'Зарегистрироваться' : 'Войти'}</button>
            </form>
            <div className="modal-switch">{authMode === 'register' ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'} <button onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}>{authMode === 'register' ? 'Войти' : 'Зарегистрироваться'}</button></div>
          </section>
        </div>
      )}

      {profileOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setProfileOpen(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <button className="modal-close" onClick={() => setProfileOpen(false)} aria-label="Закрыть"><X size={18} /></button>
            <div className="modal-symbol"><UserRound size={23} /></div>
            <h2 id="profile-title">Мой профиль</h2>
            <p className="modal-description">Измените имя пользователя и информацию о себе.</p>
            <form className="modal-form" onSubmit={saveProfile}>
              <label><span>Имя пользователя</span><input required minLength={3} maxLength={32} value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} placeholder="Ваш никнейм" /></label>
              <label><span>О себе</span><textarea rows={4} maxLength={500} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Расскажите немного о себе…" /></label>
              <div className="profile-meta">Роль: {profile?.role === 'admin' ? 'Администратор' : profile?.role === 'moderator' ? 'Модератор' : 'Участник'}</div>
              <button className="primary-button modal-submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить профиль'}</button>
              <button type="button" className="danger-button modal-submit" disabled={busy} onClick={deleteAccount}><Trash2 size={15} /> Удалить аккаунт</button>
            </form>
          </section>
        </div>
      )}

      {adminPanelOpen && isAdmin && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAdminPanelOpen(false); }}>
          <section className="modal-card admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title">
            <button className="modal-close" onClick={() => setAdminPanelOpen(false)} aria-label="Закрыть"><X size={18} /></button>
            <div className="modal-symbol"><Settings size={23} /></div>
            <h2 id="admin-title">Панель администратора</h2>
            <p className="modal-description">Управление разделами, темами и участниками форума.</p>

            <section className="admin-section">
              <h3><FolderPlus size={17} /> Создать форум или подфорум</h3>
              <form className="admin-category-form" onSubmit={createCategory}>
                <input required minLength={2} maxLength={80} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Название раздела" />
                <input maxLength={240} value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Краткое описание" />
                <select value={categoryForm.parent_id} onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}><option value="">Главный форум</option>{categories.filter((item) => item.node_type !== 'link').map((item) => <option key={item.id} value={item.id}>Подфорум: {item.name}</option>)}</select>
                <button className="primary-button" disabled={busy}><Plus size={15} /> Добавить</button>
              </form>
              <div className="admin-list">
                {categories.map((category) => <div className="admin-list-row" key={category.id}>
                  <div><strong>{category.name}</strong><small>{category.parent_id ? '↳ ' : ''}{category.description || 'Без описания'}</small></div>
                  <button className="mini-tool danger-text" title="Удалить раздел" onClick={() => deleteCategory(category)}><Trash2 size={15} /></button>
                </div>)}
              </div>
            </section>

            <section className="admin-section">
              <h3><Users size={17} /> Участники и роли</h3>
              <div className="admin-list">
                {adminUsers.map((user) => <div className="admin-list-row" key={user.id}>
                  <div><strong>{user.username}</strong><small>{user.role === 'admin' ? 'Администратор' : user.role === 'moderator' ? 'Модератор' : 'Участник'}</small></div>
                  <select aria-label={'Роль: ' + user.username} value={user.role} disabled={user.id === session?.user?.id} onChange={(e) => changeUserRole(user, e.target.value)}>
                    <option value="member">Участник</option><option value="moderator">Модератор</option><option value="admin">Администратор</option>
                  </select>
                </div>)}
                {!adminUsers.length && <small>Участники не найдены.</small>}
              </div>
            </section>

            <section className="admin-section">
              <h3><MessagesSquare size={17} /> Управление темами</h3>
              <div className="admin-list">
                {threads.map((thread) => <div className="admin-list-row" key={thread.id}>
                  <div><strong>{thread.title}</strong><small>{thread.category?.name || 'Раздел'} · {thread.author?.username || 'Участник'}{thread.is_locked ? ' · Закрыта' : ''}{thread.is_pinned ? ' · Закреплена' : ''}</small></div>
                  <div className="admin-row-actions">
                    <button className="mini-tool" title={thread.is_pinned ? 'Открепить' : 'Закрепить'} onClick={() => toggleThreadField(thread, 'is_pinned')}><Pin size={14} /></button>
                    <button className="mini-tool" title={thread.is_locked ? 'Открыть' : 'Закрыть'} onClick={() => toggleThreadField(thread, 'is_locked')}><Lock size={14} /></button>
                    <button className="mini-tool danger-text" title="Удалить тему" onClick={() => deleteThread(thread)}><Trash2 size={14} /></button>
                  </div>
                </div>)}
                {!threads.length && <small>Тем пока нет.</small>}
              </div>
            </section>
          </section>
        </div>
      )}

      {threadOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setThreadOpen(false); }}>
          <section className="modal-card thread-modal" role="dialog" aria-modal="true" aria-labelledby="thread-modal-title">
            <button className="modal-close" onClick={() => setThreadOpen(false)} aria-label="Закрыть"><X size={18} /></button>
            <div className="modal-symbol"><MessagesSquare size={23} /></div>
            <h2 id="thread-modal-title">Создать тему</h2>
            <p className="modal-description">Выберите раздел и напишите первое сообщение.</p>
            <form className="modal-form" onSubmit={createThread}>
              <label><span>Раздел</span><select required value={threadForm.category_id || selectedCategory?.id || ''} onChange={(e) => setThreadForm({ ...threadForm, category_id: e.target.value })}><option value="">Выберите раздел</option>{categories.filter((category) => category.node_type !== 'link').map((category) => <option value={category.id} key={category.id}>{category.parent_id ? '— ' : ''}{category.name}</option>)}</select></label>
              <label><span>Префикс</span><select value={threadForm.prefix} onChange={(e) => setThreadForm({ ...threadForm, prefix: e.target.value })}><option value="">(Без префикса)</option><optgroup label="Управление темами"><option value="Важно">Важно</option><option value="Информация">Информация</option><option value="Правила">Правила</option></optgroup></select></label><label><span>Заголовок темы</span><input required minLength={3} maxLength={180} value={threadForm.title} onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })} placeholder="О чём хотите поговорить?" /></label>
              <label><span>Сообщение</span><BBCodeToolbar onInsert={(tag) => insertBBCode(threadBodyTextareaRef, (value) => setThreadForm((current) => ({ ...current, body: value })), tag)} /><textarea ref={threadBodyTextareaRef} required maxLength={20000} rows={5} value={threadForm.body} onChange={(e) => setThreadForm({ ...threadForm, body: e.target.value })} placeholder="Напишите первое сообщение…" /></label>
              <button className="primary-button modal-submit" disabled={busy || !categories.length}>{busy ? 'Публикуем…' : 'Опубликовать тему'}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
