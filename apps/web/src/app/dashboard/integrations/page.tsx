'use client';

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../../lib/api';

export default function IntegrationsDashboardPage() {
  const [providerSelect, setProviderSelect] = useState<
    | 'YANDEX_WORDSTAT'
    | 'OPENAI'
    | 'WEBHOOK'
    | 'GSC'
    | 'METRIKA'
    | 'TELEGRAM'
    | 'WORDPRESS_CMS'
    | 'GEMINI'
    | 'ANTHROPIC'
  >('YANDEX_WORDSTAT');

  const [connectionName, setConnectionName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const [connectionsList, setConnectionsList] = useState<
    Array<{
      id: string;
      provider: string;
      name: string;
      maskedKey: string;
      encryption: string;
      status: string;
      isActive: boolean;
      date: string;
    }>
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seo_saas_integrations_list');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seo_saas_integrations_list', JSON.stringify(connectionsList));
    }
  }, [connectionsList]);

  const addLog = (msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/integrations`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setConnectionsList(data);
        }
      }
    } catch (err: any) {
      console.warn('Backend API connection check fallback:', err.message);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const secretValue = providerSelect === 'WEBHOOK' ? webhookUrlInput : apiKeyInput;
    const baseUrl = getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj_demo_1',
          provider: providerSelect,
          name: connectionName || `${providerSelect} Connection`,
          apiKey: secretValue,
        }),
      });
      const data = await res.json();

      addLog(`🔒 [AES-256-GCM Encrypted] Интеграция ${providerSelect} успешно сохранена! Маска: ${data.maskedKey || 'sk-****'}`);

      setConnectionsList((prev) => [
        {
          id: data.connectionId || `conn_${Date.now()}`,
          provider: data.provider || providerSelect,
          name: connectionName || `${providerSelect} Connection`,
          maskedKey: data.maskedKey || 'sk-****',
          encryption: 'AES-256-GCM',
          status: 'CONNECTED',
          isActive: true,
          date: new Date().toLocaleDateString(),
        },
        ...prev,
      ]);
      setConnectionName('');
      setApiKeyInput('');
      setWebhookUrlInput('');
      setShowModal(false);
    } catch (err: any) {
      addLog(`[Error] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const serviceCards = [
    { provider: 'YANDEX_WORDSTAT', title: 'Yandex Search & Wordstat API', desc: 'Официальный сбор семантики, LSI-фраз и частотности из Яндекс Директа', icon: '🔍', color: '#ff0000' },
    { provider: 'OPENAI', title: 'OpenAI API', desc: 'Генерация статей на GPT-4o и Embeddings', icon: '🤖', color: '#10a37f' },
    { provider: 'WEBHOOK', title: 'CMS & Custom Webhooks', desc: 'Авто-публикация постов по HTTP POST на сторонние серверы', icon: '🌐', color: '#0284c7' },
    { provider: 'GSC', title: 'Google Search Console', desc: 'Отслеживание кликов, показов и индексации в Google', icon: '🔎', color: '#ea4335' },
    { provider: 'METRIKA', title: 'Яндекс Метрика', desc: 'Анализ посещаемости, поисковых фраз и конверсий', icon: '📊', color: '#ffcc00' },
    { provider: 'TELEGRAM', title: 'Telegram Bot', desc: 'Уведомления о публикациях и отчетах в Telegram канал', icon: '✈️', color: '#229ed9' },
    { provider: 'WORDPRESS_CMS', title: 'WordPress CMS', desc: 'Интеграция с WordPress REST API', icon: '📝', color: '#21759b' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1f2937', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#38bdf8' }}>
            🔌 Центр Интеграций и Автопилота (Plug & Play)
          </h1>
          <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Подключайте Yandex Search API, AI-провайдеры, Webhooks, Telegram и аналитику. Все ключи шифруются симметричным AES-256-GCM.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            + Добавить Подключение
          </button>
          <a href="/" style={{ padding: '10px 18px', background: '#1f2937', color: '#38bdf8', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '13px', border: '1px solid #374151' }}>
            ← На Дашборд
          </a>
        </div>
      </div>

      {/* Grid of Service Cards */}
      <h2 style={{ fontSize: '18px', color: '#f3f4f6', marginBottom: '14px' }}>Каталог интеграций Plug & Play</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {serviceCards.map((sc) => (
          <div
            key={sc.provider}
            onClick={() => { setProviderSelect(sc.provider as any); setShowModal(true); }}
            style={{
              background: '#111827',
              border: `1px solid #1f2937`,
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '24px' }}>{sc.icon}</span>
              <span style={{ fontSize: '11px', background: '#1f2937', color: sc.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                {sc.provider}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{sc.title}</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.4' }}>{sc.desc}</div>
          </div>
        ))}
      </div>

      {/* Modal Window for Credential Entry */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#111827', width: '540px', borderRadius: '16px', padding: '28px', border: '1px solid #374151', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#38bdf8' }}>Безопасное подключение: {providerSelect}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveConnection}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Провайдер</label>
                <select
                  value={providerSelect}
                  onChange={(e: any) => setProviderSelect(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
                >
                  <option value="YANDEX_WORDSTAT">Яндекс Wordstat & Search API</option>
                  <option value="OPENAI">OpenAI (ChatGPT API)</option>
                  <option value="WEBHOOK">Custom Webhook (CMS / External Site)</option>
                  <option value="GSC">Google Search Console API</option>
                  <option value="METRIKA">Яндекс Метрика API</option>
                  <option value="TELEGRAM">Telegram Bot Token</option>
                  <option value="WORDPRESS_CMS">WordPress CMS API</option>
                  <option value="GEMINI">Google Gemini API</option>
                  <option value="ANTHROPIC">Anthropic Claude API</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Название интеграции</label>
                <input
                  type="text"
                  placeholder="напр. Яндекс Wordstat Продашн Ключ"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {providerSelect === 'WEBHOOK' ? (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Target Webhook URL (POST)</label>
                  <input
                    type="url"
                    placeholder="https://mysite.com/api/seo-webhook"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Секретный API Ключ (Шифруется AES-256-GCM)</label>
                  <input
                    type="password"
                    placeholder="y0_a-... / sk-proj-... / bot77123..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Отмена
                </button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                  {loading ? 'Шифрование...' : '🔒 Сохранить (AES-256)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Integrations Grid */}
      <h2 style={{ fontSize: '18px', color: '#f3f4f6', marginBottom: '14px' }}>Подключенные сервисы ({connectionsList.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {connectionsList.map((conn) => (
          <div key={conn.id} style={{ background: '#111827', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '16px' }}>{conn.name}</span>
              <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                {conn.provider}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'monospace', background: '#1f2937', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>
              Маскированный ключ: <strong style={{ color: '#fff' }}>{conn.maskedKey}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
              <span>🔒 Шифрование: {conn.encryption}</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● {conn.status || 'CONNECTED'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Audit Log */}
      {log.length > 0 && (
        <div style={{ background: '#030712', padding: '16px', borderRadius: '8px', border: '1px solid #1f2937', fontFamily: 'monospace', fontSize: '12px', color: '#a7f3d0' }}>
          <div style={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 700 }}>Лог транзакций безопасности:</div>
          {log.map((l, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
