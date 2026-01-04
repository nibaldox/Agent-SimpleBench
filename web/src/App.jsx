import React, { useState, useEffect } from 'react';
import { BenchmarkDashboard } from './components/BenchmarkDashboard';
import { ChatInterface } from './components/ChatInterface';
import { Activity, MessageSquare, Sparkles, Moon, Sun, Globe } from 'lucide-react';
import './modern.css';

function App() {
  const [activeTab, setActiveTab] = useState('benchmark');
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('english');

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Español' },
    { value: 'french', label: 'Français' },
    { value: 'german', label: 'Deutsch' },
    { value: 'italian', label: 'Italiano' },
    { value: 'portuguese', label: 'Português' },
    { value: 'dutch', label: 'Nederlands' },
    { value: 'polish', label: 'Polski' },
    { value: 'turkish', label: 'Türkçe' },
    { value: 'swedish', label: 'Svenska' },
    { value: 'arabic', label: 'العربية' },
    { value: 'hindi', label: 'हिन्दी' },
    { value: 'chinese', label: '中文' },
    { value: 'japanese', label: '日本語' },
    { value: 'korean', label: '한국어' },
    { value: 'russian', label: 'Русский' },
    { value: 'greek', label: 'Ελληνικά' },
    { value: 'danish', label: 'Dansk' },
    { value: 'norwegian', label: 'Norsk' },
    { value: 'finnish', label: 'Suomi' },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <div className="logo-icon">AB</div>
            <span>AgentBench</span>
          </div>

          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'benchmark' ? 'active' : ''}`}
              onClick={() => setActiveTab('benchmark')}
            >
              <Activity className="tab-icon" size={16} />
              <span>Benchmark</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="tab-icon" size={16} />
              <span>Chat</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'creator' ? 'active' : ''}`}
              onClick={() => setActiveTab('creator')}
            >
              <Sparkles className="tab-icon" size={16} />
              <span>Test Creator</span>
            </button>
          </nav>
        </div>

        <div className="header-right">
          {/* Language Selector */}
          <div className="flex items-center gap-sm">
            <Globe size={16} style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="form-select"
              style={{ width: '140px' }}
            >
              {languageOptions.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Status */}
          <div className="flex items-center gap-sm">
            <span className="status-dot online"></span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="content-wrapper animate-fade-in" key={activeTab}>
          {activeTab === 'chat' ? (
            <ChatInterface language={language} />
          ) : (
            <BenchmarkDashboard
              initialTab={activeTab === 'creator' ? 'creator' : 'dashboard'}
              language={language}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
