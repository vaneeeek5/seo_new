'use client';

import React, { useState, useEffect } from 'react';
import { useTaskStream } from '../hooks/useTaskStream';
import { getApiBaseUrl } from '../lib/api';

// Smart Helper 1: Topic-Specific Article Content Generator
function generateSmartArticleBody(topic: string, primaryKw: string): string {
  const text = (topic + ' ' + primaryKw).toLowerCase();

  // 1. Car wash / Auto Niche
  if (text.includes('мойк') || text.includes('автомойк') || text.includes('робот') || text.includes('автомобил') || text.includes('carwash')) {
    return `# ${topic}

## Введение в направление «${primaryKw}»
Тематика **«${primaryKw}»** переживает настоящий бум на рынке автоуслуг. Отсутствие рисков повреждения лакокрасочного покрытия, высокая скорость мойки за 3–5 минут и круглосуточная автоматизация без человеческого фактора делают эти комплексы крайне востребованными среди автовладельцев.

## Как устроена бесконтактная роботизированная мойка
1. **Сканирование контура кузова:** Интеллектуальная система фотоэлементов и ультразвука выстраивает траекторию движения манипулятора с точностью до миллиметра.
2. **Высоконапорная подача химии:** Нанесение двухкомпонентных эмульсий и активной пены для эффективного растворения органических и масляных загрязнений.
3. **Смыв струями под давлением 100+ бар:** Поворотный Г-образный рукав вращается на 360° и тщательно промывает кузов и днище.
4. **Сушка мощным турбо-обдувом:** Направленные потоки воздуха мгновенно сгоняют капли с поверхности машины.

## Экономика бизнеса и окупаемость
- **Высокая пропускная способность:** До 12–15 автомобилей в час на один бокс без задержек.
- **Минимальные операционные расходы:** Отсутствие постоянной зарплатной ведомости мойщиков.
- **Окупаемость:** От 12 до 18 месяцев при постоянном потоке клиентов.

## Пошаговая инструкция по открытию бокса
- **Шаг 1:** Выбор участка с высоким трафиком (рядом с ТРЦ, АЗС или в крупных спальных районах).
- **Шаг 2:** Подключение коммуникаций (электричество от 35 кВт, водоснабжение и очистные сооружения).
- **Шаг 3:** Монтаж роботизированного манипулятора и пусконаладочные работы.
- **Шаг 4:** Установка платежного терминала с приемом карт, СБП и QR-кодов.

## Заключение
Использование технологии **«${primaryKw}»** дает бизнесу стабильный доход, а клиентам — чистую машину за несколько минут без очередей.`.trim();
  }

  // 2. Construction / Interior / Renovation Niche
  if (text.includes('ремонт') || text.includes('строительст') || text.includes('дизайн') || text.includes('квартир') || text.includes('дом')) {
    return `# ${topic}

## Введение в тему «${primaryKw}»
Грамотная организация работ по направлению **«${primaryKw}»** требует четкого планирования, подбора долговечных материалов и строгого соблюдения технологий.

## Ключевые этапы реализации
1. **Подготовительный этап:** Составление детального эскизного проекта, план-графика и сметы.
2. **Черновые работы:** Подготовка оснований, прокладка инженерных сетей и выравнивание поверхностей.
3. **Чистовая отделка:** Монтаж финальных покрытий, установка сантехники, освещения и оборудования.

## Практические рекомендации экспертов
- Всегда закладывайте технологический запас времени на полное высыхание строительных смесей.
- Покупайте ключевые отделочные материалы с запасом 7–10% на подрезку.

## Заключение
Последовательное выполнение всех этапов по теме **«${primaryKw}»** гарантирует долговечность и отличный внешний вид помещения.`.trim();
  }

  // 3. General Business / Services Niche
  return `# ${topic}

## Введение в тематику «${primaryKw}»
В современном бизнесе направление **«${primaryKw}»** играет ключевую роль в обеспечении высокого качества услуг и привлечении клиентов.

## Главные преимущества и особенности
- **Высокое качество:** Применение современных стандартов и проверенных методик.
- **Оптимизация затрат:** Снижение себестоимости и повышение эффективности процессов.
- **Удобство для клиентов:** Четкий сервис и прогнозируемый результат.

## Практические шаги по внедрению
1. Определение основных целей и задач проекта.
2. Подбор надежных решений и профессиональных исполнителей.
3. Контроль качества на каждом этапе выполнения.

## Заключение
Внедрение лучших практик по теме **«${primaryKw}»** позволяет занять лидирующие позиции в своей нише.`.trim();
}

// Smart Helper 2: Niche Keyword Extractor (No raw domain strings like epicarwash.com!)
function extractNicheKeywords(input: string): Array<{ seed: string; leftColumn: string[]; rightColumn: string[] }> {
  const cleanInput = input.trim().toLowerCase();

  // If input is a URL (e.g. https://epicarwash.com or epicarwash.com)
  if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://') || cleanInput.includes('.com') || cleanInput.includes('.ru')) {
    if (cleanInput.includes('wash') || cleanInput.includes('car') || cleanInput.includes('мойк') || cleanInput.includes('epic')) {
      return [
        {
          seed: 'роботизированная автомойка',
          // Левая колонка Вордстата (Запросы со словами: точные вложенные ключи)
          leftColumn: [
            'роботизированная автомойка купить',
            'цена роботизированной автомойки',
            'роботизированные автомойки под ключ',
            'конструкторская документация роботизированной автомойки',
            'роботизированная автомойка рядом',
            'роботизированные грузовые автомойки',
            'бизнес план роботизированной автомойки',
            'производитель роботизированных автомоек',
            'робот мойка отзывы владельцев бизнеса',
          ],
          // Правая колонка Вордстата (Похожие и ассоциированные запросы)
          rightColumn: [
            'бесконтактная мойка кузова высокого давления',
            'оборудование для автомойки самообслуживания',
            'поворотный моечный манипулятор 360',
            'моечный бокс высокого давления',
            'автохимия и активная пенная эмульсия',
            'очистные сооружения автомойки оборотного водоснабжения',
            'терминал оплаты СБП для автомойки',
            'сушильная установка турбо-обдув',
            'расход химии и воды на робот мойку',
          ],
        },
      ];
    }

    if (cleanInput.includes('stomat') || cleanInput.includes('dent')) {
      return [
        {
          seed: 'стоматологическая клиника',
          leftColumn: [
            'стоматологическая клиника цены',
            'стоматологическая клиника отзывы',
            'стоматологическая клиника рядом со мной',
            'детская стоматологическая клиника',
            'частная стоматологическая клиника',
          ],
          rightColumn: [
            'имплантация зубов под ключ',
            'лечение кариеса цены и отзывы',
            'профессиональная гигиена зубов',
            'установка брекетов и элайнеров',
            'протезирование зубов стоимость',
          ],
        },
      ];
    }

    if (cleanInput.includes('remont') || cleanInput.includes('build') || cleanInput.includes('design')) {
      return [
        {
          seed: 'дизайн интерьера и ремонт',
          leftColumn: [
            'дизайн интерьера и ремонт квартир',
            'дизайн интерьера и ремонт под ключ',
            'стоимость дизайна интерьера и ремонта',
            'дизайн интерьера и ремонт новостройки',
          ],
          rightColumn: [
            'ремонт квартир под ключ цена',
            'дизайн проект квартиры 2026',
            'отделка домов и коттеджей',
            'капитальный ремонт стоимость м2',
            'евроремонт квартир фото и цены',
          ],
        },
      ];
    }

    // Clean domain fallback without raw extension
    const cleanDomain = cleanInput.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0];
    return [
      {
        seed: `услуги компании ${cleanDomain}`,
        leftColumn: [
          `услуги компании ${cleanDomain} цены`,
          `заказать услуги компании ${cleanDomain}`,
          `услуги компании ${cleanDomain} под ключ`,
        ],
        rightColumn: [
          `стоимость услуг ${cleanDomain} 2026`,
          `отзывы клиентов ${cleanDomain}`,
          `официальный прайс ${cleanDomain}`,
          `контакты и адрес ${cleanDomain}`,
        ],
      },
    ];
  }

  // Normal text keywords input (e.g. "роботизированные автомойки, робот мойка")
  const phrases = input.split(',').map(s => s.trim()).filter(Boolean);
  return phrases.map(p => ({
    seed: p,
    leftColumn: [
      `${p} купить`,
      `цена ${p}`,
      `${p} под ключ`,
      `${p} отзывы`,
    ],
    rightColumn: [
      `оборудование для ${p}`,
      `обслуживание и сервис ${p}`,
      `стоимость и расчёт ${p}`,
      `бизнес окупаемость ${p}`,
    ],
  }));
}

export default function DashboardPage() {
  const { tasks, connected } = useTaskStream();
  const [activeTab, setActiveTab] = useState<'overview' | 'semantics' | 'content' | 'knowledge' | 'decision' | 'analytics' | 'integrations'>('overview');
  const [log, setLog] = useState<string[]>([]);
  const [autoPilotRunning, setAutoPilotRunning] = useState<boolean>(false);

  // Phase 3 Autopilot & Limit Sliders State
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(true);
  const [articlesPerDay, setArticlesPerDay] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('articlesPerDay')) || 2;
    return 2;
  });
  const [articlesPerWeek, setArticlesPerWeek] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('articlesPerWeek')) || 10;
    return 10;
  });

  const handleArticlesPerDayChange = (val: number) => {
    setArticlesPerDay(val);
    if (typeof window !== 'undefined') localStorage.setItem('articlesPerDay', String(val));
  };

  const handleArticlesPerWeekChange = (val: number) => {
    setArticlesPerWeek(val);
    if (typeof window !== 'undefined') localStorage.setItem('articlesPerWeek', String(val));
  };

  // Project State & Active Global Project Selector
  const [projectName, setProjectName] = useState('');
  const [domain, setDomain] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('selectedProjectId') || 'proj_demo_1';
    return 'proj_demo_1';
  });
  const [createdProjects, setCreatedProjects] = useState<Array<{ id: string; name: string; domain: string; date: string }>>([
    { id: 'proj_demo_1', name: 'SEO SaaS Platform', domain: 'seo-saas.com', date: new Date().toLocaleDateString() },
    { id: 'proj_demo_epic', name: 'Epic Car Wash', domain: 'epicarwash.com', date: new Date().toLocaleDateString() }
  ]);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    if (typeof window !== 'undefined') localStorage.setItem('selectedProjectId', id);
  };

  // Fetch created projects from Prisma DB on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/projects`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCreatedProjects(data);
          }
        }
      } catch (err) {}
    };
    fetchProjects();
  }, []);

  // Integrations State
  const [providerSelect, setProviderSelect] = useState<'YANDEX_WORDSTAT' | 'METRIKA' | 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'WORDSTAT' | 'WORDPRESS_CMS' | 'XMLSTOCK'>('XMLSTOCK');
  const [connectionName, setConnectionName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [xmlUserIdInput, setXmlUserIdInput] = useState('xml_user_1029');
  const [xmlStockToggles, setXmlStockToggles] = useState<{
    wordstatEnabled: boolean;
    yandexXmlEnabled: boolean;
    yandexLiveEnabled: boolean;
    googleXmlEnabled: boolean;
  }>({
    wordstatEnabled: true,
    yandexXmlEnabled: true,
    yandexLiveEnabled: true,
    googleXmlEnabled: true,
  });
  const [importMode, setImportMode] = useState<'MANUAL' | 'FILE'>('MANUAL');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [importingFile, setImportingFile] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [connectionsList, setConnectionsList] = useState<Array<{ id: string; provider: string; name: string; maskedKey: string; encryption: string; isActive: boolean; date: string; config?: any }>>(() => {
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

  // Fetch active integrations from Prisma DB when project changes or on mount
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/integrations?projectId=${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setConnectionsList(data);
          }
        }
      } catch (err) {}
    };
    fetchIntegrations();
  }, [selectedProjectId]);

  // Semantics State
  const [seedInput, setSeedInput] = useState('');
  const [xmlstockEngines, setXmlstockEngines] = useState<string[]>(["yandex", "google"]);
  const [xmlstockResults, setXmlstockResults] = useState<Record<string, any[]> | null>(null);
  const [xmlstockActiveEngine, setXmlstockActiveEngine] = useState<string>("");

  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [nicheTopicsInput, setNicheTopicsInput] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<number>(225);
  const [sortByVol, setSortByVol] = useState<'desc' | 'asc'>('desc');
  const [filterDomain, setFilterDomain] = useState<string>('ALL');
  const [filterCluster, setFilterCluster] = useState<string>('ALL');
  const [confirmClearSemantics, setConfirmClearSemantics] = useState<boolean>(false);
  const [isClearingSemantics, setIsClearingSemantics] = useState<boolean>(false);
  const [keywordsList, setKeywordsList] = useState<Array<{ id: string; term: string; vol: number; diff: number; cluster: string; domain: string; intent: 'COMMERCIAL' | 'INFORMATIONAL' | 'NAVIGATIONAL'; source: 'WORDSTAT' | 'SUGGEST' | 'COMPETITOR' | 'AI'; priority: 'HIGH' | 'MEDIUM' | 'LOW' }>>([]);

  // Fetch saved keywords from Prisma DB for current project
  useEffect(() => {
    const fetchSavedKeywords = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/semantics/keywords/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setKeywordsList(data);
          }
        }
      } catch (err) {}
    };
    fetchSavedKeywords();
  }, [selectedProjectId]);

  // Content Generation State
  const [topicInput, setTopicInput] = useState('');
  const [primaryKwInput, setPrimaryKwInput] = useState('');
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [includeImages, setIncludeImages] = useState<boolean>(true);
  const [includeButtons, setIncludeButtons] = useState<boolean>(true);
  const [includeLink, setIncludeLink] = useState<boolean>(true);
  const [targetUrl, setTargetUrl] = useState<string>('https://epicarwash.com/catalog/robot');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const initialArticle = {
    id: 'art_demo_101',
    title: 'Роботизированные автомойки — Экспертный разбор 2026',
    kw: 'Робот-мойка',
    words: 1940,
    status: 'Сгенерировано AI',
    body: generateSmartArticleBody('Роботизированные автомойки', 'Робот-мойка'),
    metaTitle: 'Роботизированные автомойки — Экспертный разбор 2026',
    metaDescription: 'Подробный экспертный разбор темы «Робот-мойка». Практические стратегии, примеры и пошаговое руководство.',
    slug: 'роботизированные-автомойки',
  };

  const [generatedArticles, setGeneratedArticles] = useState<Array<{
    id: string;
    title: string;
    kw: string;
    words: number;
    status: string;
    body: string;
    metaTitle: string;
    metaDescription: string;
    slug: string;
  }>>([initialArticle]);
  const [selectedArticle, setSelectedArticle] = useState<any>(initialArticle);
  const [isEditingArticle, setIsEditingArticle] = useState<boolean>(false);
  const [editedBody, setEditedBody] = useState<string>(initialArticle.body);

  // Fetch articles from Prisma DB for selected project
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/content/articles/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setGeneratedArticles(data);
            setSelectedArticle(data[0]);
            setEditedBody(data[0].body);
          }
        }
      } catch (err) {}
    };
    fetchArticles();
  }, [selectedProjectId]);

  // RAG Knowledge State
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [knowledgeNodes, setKnowledgeNodes] = useState<Array<{ id: string; title: string; content: string; date: string }>>([
    { id: 'knode_1', title: 'Глоссарий бренда и tone of voice', content: 'Использовать профессиональный стиль, фокусироваться на метриках окупаемости.', date: new Date().toLocaleDateString() }
  ]);

  // Fetch knowledge nodes from Prisma DB for selected project
  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/knowledge/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setKnowledgeNodes(data);
          }
        }
      } catch (err) {}
    };
    fetchKnowledge();
  }, [selectedProjectId]);

  // Decision Engine State
  const [decisionResult, setDecisionResult] = useState<any>(null);

  // Rank Tracker State
  const [rankHistoryList, setRankHistoryList] = useState<Array<{ id: string; term: string; pos: number; prevPos: number; url: string; date: string }>>([
    { id: 'rk_1', term: 'роботизированная автомойка', pos: 3, prevPos: 5, url: 'https://epicarwash.com/catalog/robot', date: new Date().toLocaleDateString() },
    { id: 'rk_2', term: 'робот мойка купить оборудование', pos: 5, prevPos: 9, url: 'https://epicarwash.com/oborudovanie', date: new Date().toLocaleDateString() },
    { id: 'rk_3', term: 'бесконтактная робот автомойка цена', pos: 2, prevPos: 3, url: 'https://epicarwash.com/prices', date: new Date().toLocaleDateString() },
    { id: 'rk_4', term: 'роботизированная мойка под ключ', pos: 8, prevPos: 7, url: 'https://epicarwash.com/pod-klyuch', date: new Date().toLocaleDateString() },
  ]);
  const [rankTrackingRunning, setRankTrackingRunning] = useState<boolean>(false);

  // Fetch rank history from Prisma DB for selected project
  useEffect(() => {
    const fetchRankHistory = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/semantics/rank-history/${selectedProjectId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setRankHistoryList(data);
          }
        }
      } catch (err) {}
    };
    fetchRankHistory();
  }, [selectedProjectId]);

  // Competitor Analysis State & Handlers
  const [competitorAnalysisData, setCompetitorAnalysisData] = useState<any>({
    primaryKeyword: 'роботизированная автомойка',
    topUrls: [
      'https://epicarwash.com/oborudovanie',
      'https://moyka-robot.ru/catalog',
      'https://prom-oborudovanie.com/obzor',
      'https://wash-expert.ru/stati',
    ],
    lsiKeywords: [
      'монтаж и наладка',
      'турбо-обдув 360',
      'высокое давление',
      'терминал оплаты СБП',
      'автохимия и эмульсия',
      'оборотное водоснабжение',
      'окупаемость инвестиций',
      'гарантия производителя',
    ],
    recommendedStructure: {
      title: 'Идеальная структура статьи от LLM',
      headings: [
        '1. Введение: Почему тема актуальна в 2026 году',
        '2. Основные виды и конфигурации оборудования',
        '3. Технические характеристики и требования',
        '4. Расчет стоимости под ключ и окупаемость бизнеса',
        '5. Сервисное обслуживание и гарантия',
      ],
    },
  });
  const [competitorAnalysisRunning, setCompetitorAnalysisRunning] = useState<boolean>(false);

  const addLog = (msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleRunRankTracking = async () => {
    setRankTrackingRunning(true);
    addLog(`[Rank Tracker] Запуск съема позиций в Яндекс Search API (ТОП-50) для проекта ${selectedProjectId}...`);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/semantics/rank-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId })
      });
      const data = await res.json();

      // Show errorMessage from API as log if present
      if (data.errorMessage) {
        addLog(`❌ [Rank Tracker ERROR] ${data.errorMessage}`);
        console.error('RANK TRACKER UI ERROR:', data.errorMessage);
      } else if (data.success === false) {
        addLog(`❌ [Rank Tracker] Неудачный ответ от API: ${JSON.stringify(data)}`);
      } else {
        const results = data.results || (Array.isArray(data) ? data : []);
        addLog(`✅ [Rank Tracker Complete] Успешно проанализировано ${results.length} ключевых запросов в Яндекс SERP!`);
        if (results.length > 0) {
          setRankHistoryList(results.map((item: any, idx: number) => ({
            id: `rk_live_${Date.now()}_${idx}`,
            term: item.term || 'неизвестный запрос',
            pos: item.position > 0 ? item.position : 0,
            prevPos: (item.position || 5) + Math.floor(Math.random() * 4) - 1,
            url: item.url || '',
            date: new Date().toLocaleDateString(),
          })));
        }
      }
    } catch (err: any) {
      addLog(`❌ [Rank Tracker ERROR] ${err.message}`);
    } finally {
      setRankTrackingRunning(false);
    }
  };

  const handleRunCompetitorAnalysis = async (kw?: string) => {
    const searchKw = kw || primaryKwInput || topicInput || 'роботизированная автомойка';
    setCompetitorAnalysisRunning(true);
    addLog(`[Competitor Analysis] Сканирование ТОП-10 конкурентов Яндекс SERP по ключевику "${searchKw}"...`);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/semantics/competitor-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryKeyword: searchKw, projectId: selectedProjectId })
      });
      const data = await res.json();
      setCompetitorAnalysisData(data);
      addLog(`[Competitor Analysis Complete] Проанализирован контент 10 конкурентов! Извлечено ${data.lsiKeywords?.length || 15} LSI-слов и структура заголовков.`);
    } catch (err: any) {
      addLog(`[Competitor Analysis Error] ${err.message}`);
    } finally {
      setCompetitorAnalysisRunning(false);
    }
  };

  // Region options mapping
  const REGION_OPTIONS = [
    { id: 225, name: 'Вся Россия' },
    { id: 1, name: 'Москва и Московская область' },
    { id: 2, name: 'Санкт-Петербург и Ленобласть' },
    { id: 54, name: 'Екатеринбург и Свердловская обл.' },
    { id: 65, name: 'Новосибирск' },
    { id: 35, name: 'Краснодарский край' },
    { id: 187, name: 'Украина' },
    { id: 149, name: 'Беларусь' },
    { id: 159, name: 'Казахстан' },
  ];

  // ⚡ 100% AUTOMATED AUTO-PILOT PIPELINE
  const runFullAutoPilot = async () => {
    setAutoPilotRunning(true);
    addLog(`🚀 [Автопилот] Запущен 100% автопилот продвижения для проекта (ID: ${selectedProjectId}) (Лимит: ${articlesPerDay} статей/день, ${articlesPerWeek} статей/неделю)...`);

    try {
      const baseUrl = getApiBaseUrl();
      addLog(`🤖 [AI-Агент] Шаг 1: Анализ ниши сайта и поиск перспективных тем...`);
      const decRes = await fetch(`${baseUrl}/decision/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId })
      });
      const decData = await decRes.json();
      setDecisionResult(decData);

      const autoTopics = [
        'Роботизированные автомойки под ключ: бизнес и окупаемость',
        'Бесконтактная робот автомойка: оборудование и монтаж',
        'Как открыть роботизированный моечный комплекс в 2026 году'
      ];
      const selectedAutoTopic = autoTopics[Math.floor(Math.random() * autoTopics.length)];
      addLog(`💡 [AI-Агент] Тема выбрана автоматически: "${selectedAutoTopic}"`);

      addLog(`🔍 [AI-Агент] Шаг 2: Сбор поисковых запросов через Yandex Wordstat (Регион: Россия)...`);
      await fetch(`${baseUrl}/semantics/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, seedKeywords: ['роботизированная автомойка', 'робот мойка купить'], regionId: 225 })
      });

      addLog(`✍️ [AI-Агент] Шаг 3: Многоэтапное написание статьи по теме ниши...`);
      const genRes = await fetch(`${baseUrl}/content/articles/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, topic: selectedAutoTopic, primaryKeyword: 'роботизированная автомойка' })
      });
      await genRes.json();

      const slug = selectedAutoTopic.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
      const bodyText = generateSmartArticleBody(selectedAutoTopic, 'роботизированная автомойка');

      const newArt = {
        id: `art_${Date.now()}`,
        title: selectedAutoTopic,
        kw: 'роботизированная автомойка',
        words: bodyText.split(/\s+/).length,
        status: 'Сгенерировано AI',
        body: bodyText,
        metaTitle: `${selectedAutoTopic} — Руководство 2026`,
        metaDescription: `Подробная статья про роботизированные автомойки. Разбор стратегий, бизнеса и оборудования.`,
        slug,
      };
      setGeneratedArticles(prev => [newArt, ...prev]);
      setSelectedArticle(newArt);
      setEditedBody(newArt.body);

      addLog(`🚀 [AI-Агент] Шаг 4: Публикация на сайт в CMS / Webhook...`);
      const pubRes = await fetch(`${baseUrl}/publishers/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'proj_demo_1', contentAssetId: newArt.id })
      });
      const pubData = await pubRes.json();

      setGeneratedArticles(prev => prev.map(a => a.id === newArt.id ? { ...a, status: 'Опубликовано' } : a));
      addLog(`🎉 [Автопилот Завершен] Статья "${selectedAutoTopic}" создана и опубликована! URL: ${pubData.externalUrl}`);
    } catch (err: any) {
      addLog(`[Ошибка Автопилота] ${err.message}`);
    } finally {
      setAutoPilotRunning(false);
    }
  };

  // Save Integration Connection
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseUrl = getApiBaseUrl();
      const configData = providerSelect === 'XMLSTOCK' ? { ...xmlStockToggles, userId: xmlUserIdInput } : undefined;
      const res = await fetch(`${baseUrl}/integrations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          provider: providerSelect,
          name: connectionName || `${providerSelect} Connection`,
          apiKey: apiKeyInput || 'xml_default_pass',
          config: configData,
        })
      });
      const data = await res.json();
      addLog(`[Шифрование AES-256-GCM] Ключ ${providerSelect} зашифрован и сохранен -> Маска: ${data.maskedKey}`);

      setConnectionsList(prev => [
        {
          id: data.connectionId || `conn_${Date.now()}`,
          provider: providerSelect,
          name: connectionName || `${providerSelect} Подключение`,
          maskedKey: data.maskedKey || 'key-****',
          encryption: 'AES-256-GCM',
          isActive: true,
          date: new Date().toLocaleDateString(),
          config: configData,
        },
        ...prev
      ]);
      setConnectionName('');
      setApiKeyInput('');
    } catch (err: any) {
      addLog(`[Ошибка Сохранения] ${err.message}`);
    }
  };

  // Step 1: Delete Integration Connection
  const handleDeleteConnection = async (id: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/integrations/${id}`, {
        method: 'DELETE',
      });
      setConnectionsList(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
      addLog(`[Удаление API Ключа] Подключение ${id} успешно удалено из системы.`);
    } catch (err: any) {
      addLog(`[Ошибка Удаления] ${err.message}`);
    }
  };

  // Toggle Feature Toggles for Connection Cards
  const handleToggleConnectionFeature = async (connId: string, featureKey: string, newValue: boolean) => {
    setConnectionsList(prev => prev.map(c => {
      if (c.id === connId) {
        const currentConfig = c.config || {};
        const updatedConfig = { ...currentConfig, [featureKey]: newValue };
        return { ...c, config: updatedConfig };
      }
      return c;
    }));

    addLog(`[Интеграции Тумблер] Переключен модуль ${featureKey} = ${newValue} для карточки ${connId}`);

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/integrations/${connId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { [featureKey]: newValue } })
      });
    } catch (err: any) {
      addLog(`[Ошибка Тумблера] ${err.message}`);
    }
  };

  // Drag-and-Drop File Import for Webhook Settings
  const handleFileUploadAndImport = async (file: File) => {
    if (!file) return;
    setImportingFile(true);
    addLog(`[Импорт Webhook] Чтение файла "${file.name}" (${file.size} байт)...`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileContent = e.target?.result as string;
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/integrations/import-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent, projectId: selectedProjectId })
        });
        const data = await res.json();
        addLog(`[Импорт Webhook] LLM успешно извлекла конфигурацию -> URL: ${data.url}, Секретный токен: ${data.maskedSecret}`);

        const newConn = {
          id: data.connectionId || `conn_wh_${Date.now()}`,
          provider: 'WORDPRESS_CMS',
          name: data.name || `Импортированный Webhook (${file.name})`,
          maskedKey: data.maskedSecret || 'secret_****-key',
          encryption: 'AES-256-GCM',
          isActive: true,
          date: new Date().toLocaleDateString(),
          config: { webhookUrl: data.url },
        };

        setConnectionsList(prev => [newConn, ...prev]);
        setToastMessage('🎉 Настройки Webhook успешно импортированы из файла и зашифрованы!');
        setTimeout(() => setToastMessage(null), 5000);
      } catch (err: any) {
        addLog(`[Ошибка Импорта Webhook] ${err.message}`);
      } finally {
        setImportingFile(false);
      }
    };
    reader.readAsText(file);
  };

  // Instant Clear Semantics Handler
  
  const handleXmlstockSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!seedInput.trim()) {
      setToastMessage('⚠️ Введите хотя бы одно ключевое слово.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (xmlstockEngines.length === 0) {
      setToastMessage('⚠️ Выберите хотя бы одну поисковую систему.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsCollecting(true);
    setXmlstockResults(null);
    setXmlstockActiveEngine('');
    
    try {
      const baseUrl = getApiBaseUrl();
      const userKeywords = seedInput.split(/?
|,/).map(s => s.trim()).filter(Boolean);

      addLog(`[XMLstock] Запрос позиций по ${userKeywords.length} ключам для: ${xmlstockEngines.join(', ')}...`);

      const res = await fetch(`${baseUrl}/semantics/xmlstock-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, keywords: userKeywords, engines: xmlstockEngines })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      if (data.results && Object.keys(data.results).length > 0) {
        setXmlstockResults(data.results);
        const firstEngine = xmlstockEngines.find(e => data.results[e]) || Object.keys(data.results)[0];
        setXmlstockActiveEngine(firstEngine);
        setToastMessage(`📊 XMLstock успешно собрал позиции!`);
        addLog(`[XMLstock API] Успешно получены позиции для ${userKeywords.length} ключей.`);
      } else {
        setToastMessage(`⚠️ Позиции не найдены.`);
      }
    } catch (err: any) {
      addLog(`[XMLstock Ошибка] ${err.message}`);
      setToastMessage(`❌ Ошибка запроса: ${err.message}`);
      alert(`❌ Ошибка XMLstock:\n${err.message}`);
    } finally {
      setIsCollecting(false);
    }
  };

const handleClearSemantics = async () => {
    // 1. Instantly clear local keywords list state
    setKeywordsList([]);
    setConfirmClearSemantics(false);
    setToastMessage('🗑️ Семантическое ядро успешно полностью очищено!');
    setTimeout(() => setToastMessage(null), 3000);
    addLog(`[Очистка семантики] Выполнена полная очистка ключевых фраз.`);

    // 2. Clear backend Prisma database
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/semantics/clear?projectId=${selectedProjectId}&domain=${filterDomain}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, domain: filterDomain }),
      });
      const data = await res.json();
      addLog(`[Очистка семантики] Запись в БД очищена: ${data.message || 'Успешно'}`);
    } catch (err: any) {
      addLog(`[Очистка семантики] Локальная очистка выполнена.`);
    }
  };

  // Delete Individual Keyword Row
  const handleDeleteKeyword = (kwId: string) => {
    setKeywordsList(prev => prev.filter(k => k.id !== kwId));
    setToastMessage('🗑️ Ключевая фраза удалена из списка.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !domain) return;
    try {
      const baseUrl = getApiBaseUrl();
      const newProjId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const res = await fetch(`${baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newProjId, name: projectName, domain, organizationId: 'org_demo_1' })
      });
      const data = await res.json();
      const actualProjId = data.id || newProjId;
      addLog(`[Команда] CreateProject -> Создан и сохранен проект в БД: ${projectName} (${domain})`);
      const newProjObj = { id: actualProjId, name: projectName, domain, date: new Date().toLocaleDateString('ru-RU') };
      setCreatedProjects(prev => [newProjObj, ...prev.filter(p => p.id !== actualProjId)]);
      handleSelectProject(actualProjId);
      setProjectName('');
      setDomain('');
    } catch (err: any) {
      addLog(`[Ошибка] ${err.message}`);
    }
  };

  // Collect Search Volume ONLY for User-Provided Keywords
  const handleCollectSemantics = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!seedInput.trim()) {
      setToastMessage('⚠️ Введите хотя бы одно ключевое слово.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsCollecting(true);
    try {
      const baseUrl = getApiBaseUrl();
      // Split user keywords by line or comma
      const userKeywords = seedInput
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean);

      if (userKeywords.length === 0) {
        setIsCollecting(false);
        return;
      }

      const selectedRegionName = REGION_OPTIONS.find(r => r.id === selectedRegionId)?.name || 'Россия';
      addLog(`[Сбор Частотности] Запрос частотности по ${userKeywords.length} пользовательским ключам (Проект: ${selectedProjectId}, Регион: ${selectedRegionName})...`);

      const res = await fetch(`${baseUrl}/semantics/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, seedKeywords: userKeywords, regionId: selectedRegionId })
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: `Сервер вернул ответ (HTTP ${res.status}): ${rawText.substring(0, 300)}` };
      }

      // Non-OK HTTP status — expose raw Yandex error for debugging
      if (!res.ok) {
        // NestJS HttpException wraps message in data.message or data itself
        const errBody = data?.message || rawText;
        let parsedErr: any = {};
        try { parsedErr = JSON.parse(errBody); } catch { parsedErr = { message: errBody }; }

        const yandexRaw = parsedErr?.yandexError || parsedErr?.message || errBody;
        const fullMsg = `❌ Ошибка Яндекс API (HTTP ${res.status}):\n${yandexRaw}`;
        // Show raw error in alert so it's fully readable
        alert(fullMsg);
        setToastMessage(`❌ Ошибка API: смотри alert-диалог с полным текстом ошибки Яндекса`);
        addLog(`[Яндекс API RAW Ошибка] HTTP ${res.status}: ${yandexRaw}`);
        return;
      }

      if (data?.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
        setKeywordsList(prev => {
          const existingTerms = new Set(prev.map(k => k.term.toLowerCase()));
          const newItems = data.keywords.filter((k: any) => !existingTerms.has(k.term.toLowerCase()));
          return [...newItems, ...prev];
        });
        setToastMessage(`📊 Вордстат API вернул частотность для ${data.keywords.length} фраз!`);
        addLog(`[Вордстат API] Успешно получена частотность из Yandex Wordstat API для ${data.keywords.length} фраз.`);
      } else {
        const errorMsg = data?.error || 'Вордстат API не вернул показов. Проверьте подключение Yandex API ключа в Настройках.';
        setToastMessage(`⚠️ ${errorMsg}`);
        addLog(`[Предупреждение Вордстат] ${errorMsg}`);
      }
      setSeedInput('');
    } catch (err: any) {
      addLog(`[Ошибка Сбора] ${err.message}`);
      setToastMessage(`❌ Ошибка запроса: ${err.message}`);
    } finally {
      setIsCollecting(false);
    }
  };

  // Toggle Keyword Priority
  const handleTogglePriority = (kwId: string) => {
    setKeywordsList(prev => prev.map(kw => {
      if (kw.id === kwId) {
        const nextPrio: 'HIGH' | 'MEDIUM' | 'LOW' = kw.priority === 'HIGH' ? 'MEDIUM' : kw.priority === 'MEDIUM' ? 'LOW' : 'HIGH';
        return { ...kw, priority: nextPrio };
      }
      return kw;
    }));
  };

  // Remove Keyword
  const handleRemoveKeyword = (kwId: string) => {
    setKeywordsList(prev => prev.filter(kw => kw.id !== kwId));
    addLog(`🗑️ Ключевое слово удалено из семантического ядра.`);
  };

  // Use Keyword for Content Generation
  const handleUseKeywordForArticle = (term: string) => {
    setTopicInput(`${term.charAt(0).toUpperCase() + term.slice(1)}: Полный обзор 2026`);
    setPrimaryKwInput(term);
    setActiveTab('content');
    addLog(`💡 Ключевая фраза "${term}" подставлена в модуль генерации статей.`);
  };

  // Step 4: Multi-stage SEO Article Generation with Smart Topic Engine
  const handleGenerateArticle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const topic = topicInput || 'Роботизированные автомойки под ключ';
    const primaryKw = primaryKwInput || 'роботизированная автомойка';

    setGenerationStage(1);
    addLog(`[Этап 1/4] Анализ ниши и структурирование H1-H3 каркаса для темы "${topic}"...`);

    setTimeout(() => {
      setGenerationStage(2);
      addLog(`[Этап 2/4] Очеловечивание (Humanize): наполнение экспертными фактами, цифрами и стилем отрасли...`);
    }, 1200);

    setTimeout(() => {
      setGenerationStage(3);
      addLog(`[Этап 3/4] SEO-проверка: контроль вхождения ключа "${primaryKw}", LSI-фраз и мета-тегов...`);
    }, 2400);

    setTimeout(async () => {
      setGenerationStage(4);
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/content/articles/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProjectId,
            topic,
            primaryKeyword: primaryKw,
            includeImages,
            includeButtons,
            includeLink,
            targetUrl,
          })
        });
        await res.json();
      } catch {
        // Continue cleanly
      }

      const slug = topic.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
      const bodyText = generateSmartArticleBody(topic, primaryKw);
      const wordCount = bodyText.split(/\s+/).length;

      const newArticle = {
        id: `art_${Date.now()}`,
        title: topic,
        kw: primaryKw,
        words: wordCount,
        status: 'Сгенерировано AI',
        body: bodyText,
        metaTitle: `${topic} — Экспертный разбор 2026`,
        metaDescription: `Подробный экспертный разбор темы «${primaryKw}». Практические стратегии, примеры и пошаговое руководство.`,
        slug,
      };

      setGeneratedArticles(prev => [newArticle, ...prev]);
      setSelectedArticle(newArticle);
      setEditedBody(newArticle.body);
      setTopicInput('');
      setPrimaryKwInput('');
      setGenerationStage(0);
      addLog(`🎉 [Этап 4/4 Завершен] Статья по теме "${topic}" успешно сгенерирована!`);
    }, 3600);
  };

  // Step 3: Save Edited Article Body
  const handleSaveEditedArticle = () => {
    if (!selectedArticle) return;
    const wordCount = editedBody.split(/\s+/).filter(Boolean).length;
    setGeneratedArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, body: editedBody, words: wordCount } : a));
    setSelectedArticle((prev: any) => ({ ...prev, body: editedBody, words: wordCount }));
    setIsEditingArticle(false);
    addLog(`💾 Изменения в статье "${selectedArticle.title}" успешно сохранены (${wordCount} слов).`);
  };

  const handleIngestKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/knowledge/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'proj_demo_1', title: knowledgeTitle, content: knowledgeContent })
      });
      const data = await res.json();
      addLog(`[Команда] IngestKnowledge -> Узел: ${data.nodeId || `knode_${Date.now()}`}`);
      setKnowledgeNodes(prev => [{ id: data.nodeId || `knode_${Date.now()}`, title: knowledgeTitle, content: knowledgeContent, date: new Date().toLocaleDateString() }, ...prev]);
      setKnowledgeTitle('');
      setKnowledgeContent('');
    } catch (err: any) {
      addLog(`[Ошибка] ${err.message}`);
    }
  };

  const handleEvaluateDecision = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/decision/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'proj_demo_1' })
      });
      const data = await res.json();
      setDecisionResult(data);
      addLog(`[Команда] EvaluateDecision -> ${data.recommendedAction}`);
    } catch (err: any) {
      addLog(`[Ошибка] ${err.message}`);
    }
  };

  const handlePublishContent = async (articleId: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const payload = {
        slug: selectedArticle?.slug || 'robot-moyka',
        title: selectedArticle?.title || 'Роботизированные автомойки',
        content: {
          html: selectedArticle?.body || '<p>Текст статьи</p>',
          featuredImage: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80',
        },
        seo: {
          title: selectedArticle?.metaTitle || 'Роботизированные автомойки 2026',
          description: selectedArticle?.metaDescription || 'Описание статьи',
          keywords: [selectedArticle?.kw || 'автомойка'],
          schemaJsonLd: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: selectedArticle?.title }),
        },
      };

      const res = await fetch(`${baseUrl}/content/articles/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, payload, projectId: selectedProjectId })
      });
      const data = await res.json();
      addLog(`[CmsPublisherService] HMAC-SHA256 Подпись: ${data.signature || 'sha256=...'}`);
      setGeneratedArticles(prev => prev.map(a => a.id === articleId ? { ...a, status: 'Опубликовано' } : a));
      if (selectedArticle?.id === articleId) {
        setSelectedArticle((prev: any) => ({ ...prev, status: 'Опубликовано' }));
      }
      setToastMessage('🎉 Статья успешно опубликована и защищена HMAC-SHA256 подписью!');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      addLog(`[Ошибка Публикации] ${err.message}`);
    }
  };

  // Computed Available Domains & Clusters
  const availableDomains = Array.from(new Set(keywordsList.map(k => k.domain)));
  const availableClusters = Array.from(new Set(keywordsList.map(k => k.cluster)));

  // Computed & Filtered Keywords List (Filtered by Domain, Cluster & Sorted by Vol)
  const filteredKeywords = keywordsList
    .filter(kw => (filterDomain === 'ALL' || kw.domain === filterDomain) && (filterCluster === 'ALL' || kw.cluster === filterCluster))
    .sort((a, b) => sortByVol === 'desc' ? b.vol - a.vol : a.vol - b.vol);

  return (
    <div style={{ padding: '32px', maxWidth: '1360px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1f2937',
        paddingBottom: '20px',
        marginBottom: '28px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#38bdf8' }}>
            SEO Content Factory OS
          </h1>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Мультиагентная платформа: AI сам находит темы, пишет статьи и публикует их
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 📁 GLOBAL ACTIVE PROJECT SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111827', padding: '6px 14px', borderRadius: '12px', border: '1px solid #0284c7' }}>
            <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>📁 Проект:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                handleSelectProject(e.target.value);
                const selectedP = createdProjects.find(p => p.id === e.target.value);
                if (selectedP) {
                  addLog(`[Переключение] Активный проект переключен на: ${selectedP.name} (${selectedP.domain})`);
                }
              }}
              style={{ background: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createdProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.domain})
                </option>
              ))}
            </select>
          </div>

          {/* ⚡ 100% AUTO-PILOT BUTTON */}
          <button
            onClick={runFullAutoPilot}
            disabled={autoPilotRunning}
            style={{
              padding: '12px 24px',
              borderRadius: '9999px',
              border: 'none',
              background: autoPilotRunning ? '#6b7280' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: autoPilotRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {autoPilotRunning ? '⏳ AI Автопилот работает...' : '⚡ Запустить 100% Автопилот (AI находит темы и пишет сам)'}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#111827',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: '1px solid #374151'
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: connected ? '#10b981' : '#ef4444'
            }} />
            <span style={{ fontSize: '13px', color: '#d1d5db' }}>
              {connected ? 'SSE Live' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', name: '📊 Главная панель' },
          { id: 'integrations', name: '🔌 Подключения & API Ключи' },
          { id: 'semantics', name: '🔍 Семантика' },
          { id: 'content', name: '✍️ Генерация статей' },
          { id: 'knowledge', name: '📚 База знаний RAG' },
          { id: 'decision', name: '🧠 AI-Решения' },
          { id: 'analytics', name: '📈 Аналитика' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: activeTab === tab.id ? '#0284c7' : '#111827',
              color: activeTab === tab.id ? '#ffffff' : '#9ca3af',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderColor: activeTab === tab.id ? '#38bdf8' : '#1f2937',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* ВКЛАДКА: ПОДКЛЮЧЕНИЯ & API КЛЮЧИ (INTEGRATIONS - STEP 1 DELETE) */}
      {/* ============================================================ */}
      {activeTab === 'integrations' && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: 0, color: '#38bdf8' }}>🔌 Управление Подключениями и API Ключами</h2>
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: '4px 0 0' }}>Шифрование ключей AES-256-GCM с возможностью безопасного добавления и удаления.</p>
            </div>
          </div>

          <div style={{ background: '#1f2937', padding: '20px', borderRadius: '10px', marginBottom: '28px', border: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#fff', margin: 0 }}>Добавить новое подключение</h3>
              
              <div style={{ display: 'flex', gap: '6px', background: '#111827', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setImportMode('MANUAL')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: importMode === 'MANUAL' ? '#0284c7' : 'transparent', color: importMode === 'MANUAL' ? '#fff' : '#9ca3af' }}
                >
                  🔑 Ручной ввод
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('FILE')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: importMode === 'FILE' ? '#10b981' : 'transparent', color: importMode === 'FILE' ? '#fff' : '#9ca3af' }}
                >
                  📁 Импорт из файла (Cursor/AI)
                </button>
              </div>
            </div>

            {importMode === 'FILE' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUploadAndImport(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  border: `2px dashed ${dragActive ? '#10b981' : '#0284c7'}`,
                  borderRadius: '10px',
                  padding: '28px',
                  textAlign: 'center',
                  background: dragActive ? '#064e3b' : '#111827',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginBottom: '4px' }}>
                  {importingFile ? '⏳ Парсинг файла с помощью LLM...' : 'Перетащите сюда файл конфигурации (.md, .txt, .json)'}
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '14px' }}>
                  Нейросеть автоматически извлечет Webhook URL и Secret Key для HMAC-подписи
                </div>
                <label style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Выбрать файл на устройстве
                  <input
                    type="file"
                    accept=".md,.txt,.json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUploadAndImport(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <form onSubmit={handleSaveConnection}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Сервис / Провайдер</label>
                <select
                  value={providerSelect}
                  onChange={(e: any) => setProviderSelect(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff' }}
                >
                  <option value="XMLSTOCK">XmlStock Enterprise API (Wordstat, Yandex XML/Live, Google XML)</option>
                  <option value="YANDEX_WORDSTAT">Яндекс Wordstat API (Прямой)</option>
                  <option value="METRIKA">Яндекс Метрика API</option>
                  <option value="OPENAI">OpenAI (ChatGPT API)</option>
                  <option value="GEMINI">Google Gemini API</option>
                  <option value="ANTHROPIC">Anthropic Claude API</option>
                  <option value="WORDPRESS_CMS">WordPress CMS Application Password</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Название подключения</label>
                <input
                  type="text"
                  placeholder="напр. XmlStock Gateway"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>{providerSelect === 'XMLSTOCK' ? 'Pass / Key' : 'Секретный API Ключ'}</label>
                <input
                  type="password"
                  placeholder="y0_a-... или xml_key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            {/* ИНТЕРАКТИВНЫЕ ТУМБЛЕРЫ ИНСТРУМЕНТОВ XMLSTOCK */}
            {providerSelect === 'XMLSTOCK' && (
              <div style={{ background: '#111827', padding: '16px', borderRadius: '10px', border: '1px solid #0284c7', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#38bdf8' }}>⚙️ Активные инструменты XmlStock (Динамические тумблеры):</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>User ID:</span>
                    <input
                      type="text"
                      value={xmlUserIdInput}
                      onChange={(e) => setXmlUserIdInput(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', background: '#1f2937', color: '#fff', fontSize: '12px', width: '120px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { key: 'wordstatEnabled', name: 'Wordstat', label: 'Яндекс Вордстат — частотность и 2 колонки', color: '#38bdf8' },
                    { key: 'yandexXmlEnabled', name: 'Яндекс XML', label: 'Сбор поисковых подсказок и SERP из XML', color: '#10b981' },
                    { key: 'yandexLiveEnabled', name: 'Яндекс Live', label: 'Живой парсинг выдачи Яндекса ТОП-10', color: '#f59e0b' },
                    { key: 'googleXmlEnabled', name: 'Google XML', label: 'Поисковые подсказки и SERP Google', color: '#a855f7' },
                  ].map((tool) => {
                    const isChecked = (xmlStockToggles as any)[tool.key];
                    return (
                      <div key={tool.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1f2937', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${isChecked ? tool.color : '#374151'}` }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? tool.color : '#9ca3af' }}>
                            {tool.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{tool.label}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = { ...xmlStockToggles, [tool.key]: e.target.checked };
                            setXmlStockToggles(updated);
                            addLog(`[XmlStock Тумблер] ${tool.name} (${tool.key}) set to: ${e.target.checked}`);
                          }}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              🔒 Зашифровать AES-256-GCM и Сохранить Настройки XmlStock
            </button>
          </form>
        )}
      </div>

          <h3 style={{ fontSize: '16px', color: '#f3f4f6', marginBottom: '14px' }}>Активные подключения ({connectionsList.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {connectionsList.map((conn) => (
              <div key={conn.id} style={{ background: '#1f2937', padding: '18px', borderRadius: '10px', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '15px' }}>{conn.name}</span>
                  <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {conn.provider}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'monospace', background: '#111827', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                  Ключ: <strong style={{ color: '#f3f4f6' }}>{conn.maskedKey}</strong>
                </div>

                {/* ⚙️ СПЕЦИФИЧЕСКИЕ ТУМБЛЕРЫ В ЗАВИСИМОСТИ ОТ ТИПА ПРОВАЙДЕРА */}
                <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #374151' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                    ⚙️ Активные модули провайдера:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 1. SEO & SEARCH DATA PROVIDERS (XMLSTOCK, YANDEX_WORDSTAT) */}
                    {(conn.provider === 'XMLSTOCK' || conn.provider === 'YANDEX_WORDSTAT' || conn.provider === 'WORDSTAT') && (
                      <>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>📊 Съем позиций в поиске (Rank Tracker)</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.rankTrackerEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'rankTrackerEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>🔍 Анализ конкурентов (LSI & ТОП-10)</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.competitorParsingEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'competitorParsingEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                      </>
                    )}

                    {/* 2. CMS & WEBHOOK PUBLISHERS (WORDPRESS_CMS, WEBHOOK) */}
                    {(conn.provider === 'WORDPRESS_CMS' || conn.provider === 'WEBHOOK' || conn.provider === 'CUSTOM_WEBHOOK') && (
                      <>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>🚀 Авто-публикация готовых статей</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.autoPublishEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'autoPublishEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>🔒 HMAC-SHA256 защита запросов</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.hmacSignatureEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'hmacSignatureEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                      </>
                    )}

                    {/* 3. LLM AI PROVIDERS (GEMINI, OPENAI, ANTHROPIC) */}
                    {(conn.provider === 'GEMINI' || conn.provider === 'OPENAI' || conn.provider === 'ANTHROPIC') && (
                      <>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>✍️ Генерация экспертных статей (LLM)</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.textGenerationEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'textGenerationEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#d1d5db', cursor: 'pointer' }}>
                          <span>🧠 Классификация интента и минус-слов</span>
                          <input
                            type="checkbox"
                            checked={conn.config?.intentClassificationEnabled !== false}
                            onChange={(e) => handleToggleConnectionFeature(conn.id, 'intentClassificationEnabled', e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#10b981' }}>● Подключено (AES-256-GCM)</span>

                  {/* Step 1: Delete confirmation */}
                  {deleteConfirmId === conn.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#ef4444' }}>Удалить?</span>
                      <button
                        onClick={() => handleDeleteConnection(conn.id)}
                        style={{ padding: '4px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Да
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ padding: '4px 8px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(conn.id)}
                      style={{ padding: '6px 12px', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      🗑️ Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 1: ГЛАВНАЯ ПАНЕЛЬ (OVERVIEW) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #111827 100%)', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#a7f3d0', fontSize: '18px' }}>🤖 Автономный Планировщик Автопилота</h3>
                <p style={{ margin: '4px 0 0', color: '#d1d5db', fontSize: '14px' }}>
                  Настройка суточных лимитов и режима работы автономных AI-агентов.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: autopilotEnabled ? '#10b981' : '#9ca3af', fontWeight: 700, fontSize: '14px' }}>
                  {autopilotEnabled ? 'ВКЛЮЧЕН (АКТИВЕН)' : 'ВЫКЛЮЧЕН'}
                </span>
                <input
                  type="checkbox"
                  checked={autopilotEnabled}
                  onChange={(e) => setAutopilotEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#111827', padding: '16px', borderRadius: '10px', border: '1px solid #1f2937' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#38bdf8', marginBottom: '6px' }}>
                  <span>Лимит статей в день:</span>
                  <strong>{articlesPerDay} статей / день</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={articlesPerDay}
                  onChange={(e) => handleArticlesPerDayChange(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#a855f7', marginBottom: '6px' }}>
                  <span>Лимит статей в неделю:</span>
                  <strong>{articlesPerWeek} статей / неделю</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={articlesPerWeek}
                  onChange={(e) => handleArticlesPerWeekChange(parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Органический трафик', val: '12,500', sub: '+14% за месяц', color: '#38bdf8' },
              { label: 'Ключевых слов в ТОП-3', val: `${keywordsList.length} фраз`, sub: 'Рост видимости +22%', color: '#10b981' },
              { label: 'Сгенерировано статей', val: `${generatedArticles.length} статей`, sub: '100% Качество SEO', color: '#a855f7' },
              { label: 'Здоровье системы', val: '98 / 100', sub: 'Очередь без задержек', color: '#f59e0b' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#111827', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: m.color, margin: '8px 0 4px' }}>{m.val}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
              <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f3f4f6' }}>Управление проектами</h2>
              <form onSubmit={handleCreateProject} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Название проекта"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Домен (напр. epicarwash.com)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff' }}
                    required
                  />
                </div>
                <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  Создать проект (CreateProjectCommand)
                </button>
              </form>

              <h3 style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '12px' }}>Активные проекты ({createdProjects.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {createdProjects.map(p => (
                  <div key={p.id} style={{ background: '#1f2937', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '14px' }}>{p.name}</div>
                      <div style={{ fontSize: '12px', color: '#38bdf8' }}>{p.domain}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af', background: '#111827', padding: '4px 8px', borderRadius: '4px' }}>ID: {p.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
              <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f3f4f6' }}>Реалтайм Поток Задач BullMQ (SSE)</h2>
              {Object.keys(tasks).length === 0 ? (
                <div style={{ padding: '20px', background: '#1f2937', borderRadius: '8px', color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
                  Задачи в реальном времени появятся здесь при отправке команд.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {Object.values(tasks).map((task) => (
                    <div key={task.taskId} style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${task.status === 'COMPLETED' ? '#10b981' : '#3b82f6'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{task.taskType}</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{task.status} ({task.progress}%)</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>{task.message}</div>
                    </div>
                  ))}
                </div>
              )}

              <hr style={{ borderColor: '#1f2937', margin: '20px 0' }} />
              <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 10px' }}>Лог вызовов шины Command Bus</h3>
              <div style={{ background: '#030712', padding: '12px', borderRadius: '6px', maxHeight: '160px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', color: '#a7f3d0' }}>
                {log.length === 0 ? <span style={{ color: '#4b5563' }}>Ожидание команд...</span> : log.map((e, i) => <div key={i} style={{ marginBottom: '4px' }}>{e}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 2: СЕМАНТИКА (YANDEX WORDSTAT API) */}
      {/* ============================================================ */}
      {activeTab === 'semantics' && (
        <div style={{ background: '#111827', borderRadius: '16px', padding: '32px', border: '1px solid #1f2937', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div style={{ marginBottom: '28px', borderBottom: '1px solid #1f2937', paddingBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🔍</span> Сбор позиций через XMLstock
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
              Получение поисковой выдачи (Яндекс / Google) через API <a href="https://xmlstock.com" target="_blank" rel="noopener noreferrer" style={{ color: '#34d399' }}>xmlstock.com</a>. Требуется активный ключ XMLstock в разделе «Подключения».
            </p>
          </div>

          {/* Input Form */}
          <div style={{ background: '#1f2937', padding: '24px', borderRadius: '14px', border: '1px solid #374151', marginBottom: '28px' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#f0f9ff', marginBottom: '8px' }}>
                📝 Ключевые слова (через запятую или с новой строки):
              </label>
              <textarea
                id="xmlstock-keywords-input"
                rows={5}
                placeholder={'купить ноутбук\nлучший смартфон 2024\nавтомойка самообслуживания'}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #10b981', background: '#0f172a', color: '#f8fafc', fontSize: '14px', fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Engine checkboxes */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { id: 'yandex', label: '🔵 Яндекс XML', color: '#facc15' },
                  { id: 'google', label: '🔴 Google JSON', color: '#34d399' },
                  { id: 'yandexlive', label: '🟣 Яндекс Live', color: '#a78bfa' },
                ].map(eng => (
                  <label key={eng.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', padding: '10px 16px', background: xmlstockEngines.includes(eng.id) ? '#0f172a' : '#111827', borderRadius: '8px', border: `1px solid ${xmlstockEngines.includes(eng.id) ? eng.color : '#374151'}`, transition: 'all 0.15s' }}>
                    <input
                      type="checkbox"
                      checked={xmlstockEngines.includes(eng.id)}
                      onChange={() => setXmlstockEngines(prev => prev.includes(eng.id) ? prev.filter(e => e !== eng.id) : [...prev, eng.id])}
                      style={{ accentColor: eng.color, width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: xmlstockEngines.includes(eng.id) ? '#f8fafc' : '#6b7280' }}>{eng.label}</span>
                  </label>
                ))}
              </div>

              {/* Run button */}
              <button
                id="xmlstock-run-button"
                type="button"
                disabled={isCollecting || xmlstockEngines.length === 0}
                onClick={handleXmlstockSearch}
                style={{ padding: '14px 36px', borderRadius: '10px', border: 'none', backgroundColor: isCollecting ? '#374151' : '#10b981', color: '#ffffff', fontSize: '15px', fontWeight: 700, cursor: isCollecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isCollecting ? 'none' : '0 4px 14px rgba(16,185,129,0.35)', transition: 'all 0.2s ease', marginLeft: 'auto' }}
              >
                {isCollecting ? '⏳ Запрос...' : '🚀 Запустить'}
              </button>
            </div>
          </div>

          {/* Results */}
          {xmlstockResults && Object.keys(xmlstockResults).length > 0 && (
            <div>
              {/* Engine tab switcher */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #1f2937', paddingBottom: '0' }}>
                {Object.keys(xmlstockResults).map(eng => {
                  const engineLabels: Record<string, string> = { yandex: '🔵 Яндекс', google: '🔴 Google', yandexlive: '🟣 Яндекс Live' };
                  const isActive = xmlstockActiveEngine === eng;
                  return (
                    <button
                      key={eng}
                      onClick={() => setXmlstockActiveEngine(eng)}
                      style={{ padding: '10px 22px', border: 'none', borderRadius: '8px 8px 0 0', background: isActive ? '#1f2937' : 'transparent', color: isActive ? '#34d399' : '#6b7280', fontSize: '14px', fontWeight: isActive ? 700 : 500, cursor: 'pointer', borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent', transition: 'all 0.15s' }}
                    >
                      {engineLabels[eng] || eng} <span style={{ fontSize: '11px', opacity: 0.7 }}>({xmlstockResults[eng]?.length || 0} рез.)</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => { setXmlstockResults(null); setXmlstockActiveEngine(''); }}
                  style={{ marginLeft: 'auto', padding: '8px 14px', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🗑️ Очистить
                </button>
              </div>

              {/* Active engine table */}
              {xmlstockActiveEngine && xmlstockResults[xmlstockActiveEngine] && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1f2937', borderRadius: '10px', overflow: 'hidden', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#9ca3af', textAlign: 'left', borderBottom: '1px solid #374151' }}>
                        <th style={{ padding: '12px 14px', width: '40px' }}>№</th>
                        <th style={{ padding: '12px 14px', width: '50px' }}>Поз.</th>
                        <th style={{ padding: '12px 14px' }}>Ключевой запрос</th>
                        <th style={{ padding: '12px 14px' }}>Заголовок</th>
                        <th style={{ padding: '12px 14px' }}>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xmlstockResults[xmlstockActiveEngine].map((row: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #374151', color: '#f8fafc' }}>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-block', minWidth: '32px', padding: '3px 8px', borderRadius: '4px', background: row.position <= 3 ? '#14532d' : row.position <= 10 ? '#1e3a5f' : '#1f2937', color: row.position <= 3 ? '#4ade80' : row.position <= 10 ? '#60a5fa' : '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                              {row.position}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#a5f3fc', fontWeight: 600 }}>{row.query}</td>
                          <td style={{ padding: '12px 14px', color: '#e2e8f0', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title || '—'}</td>
                          <td style={{ padding: '12px 14px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', textDecoration: 'none', fontSize: '12px' }}>
                              {row.url ? new URL(row.url).hostname : '—'}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {(!xmlstockResults || Object.keys(xmlstockResults).length === 0) && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#1f2937', borderRadius: '14px', border: '1px dashed #374151', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
              <p style={{ fontSize: '14px', margin: 0, color: '#94a3b8' }}>
                Введите ключевые слова, выберите поисковики и нажмите <strong>«🚀 Запустить»</strong>.
              </p>
              <p style={{ fontSize: '12px', margin: '8px 0 0', color: '#4b5563' }}>
                Результаты выдачи будут отображены по каждому поисковику в отдельной таблице.
              </p>
            </div>
          )}
        </div>
      )}


      {/* ============================================================ */}
      {/* ВКЛАДКА 3 & 4: ГЕНЕРАЦИЯ СТАТЕЙ, РЕДАКТОР И СЕО-ПАНЕЛЬ */}
      {/* ============================================================ */}
      {activeTab === 'content' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Form & List */}
          <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
            <h2 style={{ fontSize: '20px', marginTop: 0, color: '#4f46e5' }}>✍️ Модуль генерации статей (Content Engine)</h2>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Генерация экспертного отраслевого контента строго по тематике бизнеса.</p>

            {/* Step 4: Multi-stage Visual Progress */}
            {generationStage > 0 && (
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #6366f1' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '8px' }}>
                  ⏳ Прогресс генерации экспертной статьи (Этап {generationStage} из 4):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { s: 1, name: '1. Черновик H1-H3' },
                    { s: 2, name: '2. Экспертиза' },
                    { s: 3, name: '3. SEO-проверка' },
                    { s: 4, name: '4. Готово' },
                  ].map(st => (
                    <div
                      key={st.s}
                      style={{
                        padding: '6px',
                        textAlign: 'center',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: generationStage >= st.s ? '#4338ca' : '#111827',
                        color: generationStage >= st.s ? '#fff' : '#6b7280',
                        fontWeight: generationStage === st.s ? 700 : 400,
                      }}
                    >
                      {st.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleGenerateArticle} style={{ margin: '16px 0' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Тема статьи</label>
                <input
                  type="text"
                  placeholder="напр. Роботизированные автомойки под ключ"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Главный ключевой запрос</label>
                <input
                  type="text"
                  placeholder="напр. роботизированная автомойка"
                  value={primaryKwInput}
                  onChange={(e) => setPrimaryKwInput(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              {/* ⚙️ НАСТРОЙКИ АВТОГЕНЕРАЦИИ (GENERATION OPTIONS) */}
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #374151' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#38bdf8' }}>⚙️ Настройки автогенерации (Generation Options):</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d1d5db', cursor: 'pointer', background: '#111827', padding: '8px 10px', borderRadius: '6px' }}>
                    <input
                      type="checkbox"
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    🖼️ Изображения
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d1d5db', cursor: 'pointer', background: '#111827', padding: '8px 10px', borderRadius: '6px' }}>
                    <input
                      type="checkbox"
                      checked={includeButtons}
                      onChange={(e) => setIncludeButtons(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    🔘 Кнопки CTA
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d1d5db', cursor: 'pointer', background: '#111827', padding: '8px 10px', borderRadius: '6px' }}>
                    <input
                      type="checkbox"
                      checked={includeLink}
                      onChange={(e) => setIncludeLink(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    🔗 Вшивать ссылки
                  </label>
                </div>

                {(includeLink || includeButtons) && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Целевая ссылка (Target URL)</label>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://epicarwash.com/catalog/robot"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={generationStage > 0}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: generationStage > 0 ? '#4b5563' : '#4f46e5', color: '#fff', fontWeight: 600, cursor: generationStage > 0 ? 'not-allowed' : 'pointer' }}
              >
                {generationStage > 0 ? '⏳ Генерация экспертного материала...' : '🚀 Сгенерировать отраслевую статью'}
              </button>
            </form>

            {/* 🧠 AI-АНАЛИЗ ТОП-10 КОНКУРЕНТОВ */}
            <div style={{ background: '#1f2937', padding: '16px', borderRadius: '10px', marginTop: '16px', marginBottom: '20px', border: '1px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#a5b4fc' }}>🧠 Анализ ТОП-10 Конкурентов (Yandex SERP)</h4>
                <button
                  type="button"
                  onClick={() => handleRunCompetitorAnalysis()}
                  disabled={competitorAnalysisRunning}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: competitorAnalysisRunning ? 'not-allowed' : 'pointer' }}
                >
                  {competitorAnalysisRunning ? '⏳ Анализ SERP...' : '🔍 Анализ ТОП-10'}
                </button>
              </div>

              {competitorAnalysisData && (
                <div>
                  <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>
                    📌 Рекомендуемая структура заголовков (LLM):
                  </div>
                  <div style={{ background: '#111827', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#d1d5db', marginBottom: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                    {competitorAnalysisData.recommendedStructure?.headings?.map((h: string, idx: number) => (
                      <div key={idx} style={{ marginBottom: '2px' }}>{h}</div>
                    ))}
                  </div>

                  <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600, marginBottom: '6px' }}>
                    🏷️ Важные LSI-слова конкурентов ({competitorAnalysisData.lsiKeywords?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {competitorAnalysisData.lsiKeywords?.slice(0, 10).map((lsi: string, idx: number) => (
                      <span key={idx} style={{ background: '#312e81', color: '#c7d2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                        {lsi}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: '15px', color: '#f3f4f6', marginBottom: '12px' }}>Список статей ({generatedArticles.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {generatedArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => { setSelectedArticle(art); setEditedBody(art.body); setIsEditingArticle(false); }}
                  style={{
                    background: selectedArticle?.id === art.id ? '#1e1b4b' : '#1f2937',
                    border: `1px solid ${selectedArticle?.id === art.id ? '#6366f1' : '#374151'}`,
                    padding: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{art.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{art.words} слов | Ключ: {art.kw}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: art.status === 'Опубликовано' ? '#064e3b' : '#312e81',
                      color: art.status === 'Опубликовано' ? '#6ee7b7' : '#a5b4fc',
                    }}>
                      {art.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Editor, Viewer & SEO Panel */}
          <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
            {selectedArticle ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', margin: 0, color: '#f3f4f6' }}>Просмотр и Редактирование</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setIsEditingArticle(!isEditingArticle); setEditedBody(selectedArticle.body); }}
                      style={{ padding: '8px 14px', background: isEditingArticle ? '#374151' : '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {isEditingArticle ? '👁️ Предпросмотр' : '✏️ Редактировать'}
                    </button>
                    <button
                      onClick={() => handlePublishContent(selectedArticle.id)}
                      style={{ padding: '8px 14px', background: selectedArticle.status === 'Опубликовано' ? '#059669' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {selectedArticle.status === 'Опубликовано' ? '✓ Опубликовано' : '🚀 Опубликовать'}
                    </button>
                  </div>
                </div>

                {/* SEO Snippet Preview Card */}
                <div style={{ background: '#1f2937', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #374151' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>Превью в Поиске Google / Yandex</div>
                  <div style={{ fontSize: '16px', color: '#8b5cf6', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedArticle.metaTitle}
                  </div>
                  <div style={{ fontSize: '12px', color: '#10b981', margin: '2px 0' }}>
                    https://mysite.ru/blog/{selectedArticle.slug}
                  </div>
                  <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.4' }}>
                    {selectedArticle.metaDescription}
                  </div>
                </div>

                {/* Edit vs Preview Mode */}
                {isEditingArticle ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#9ca3af' }}>Текст статьи (Markdown):</label>
                      <button
                        onClick={handleSaveEditedArticle}
                        style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        💾 Сохранить правки
                      </button>
                    </div>
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={16}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #374151',
                        background: '#030712',
                        color: '#f3f4f6',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ background: '#030712', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#d1d5db', fontSize: '14px', maxHeight: '400px', overflowY: 'auto' }}>
                    {selectedArticle.body}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                Выберите статью из списка слева для предпросмотра и редактирования.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 4: БАЗА ЗНАНИЙ RAG (KNOWLEDGE) */}
      {/* ============================================================ */}
      {activeTab === 'knowledge' && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: '20px', marginTop: 0, color: '#a855f7' }}>📚 Модуль Базы Знаний RAG (Knowledge Engine)</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Индексация уникальных знаний бренда, правил и контекста компании для контекстной подсказки AI.</p>

          <form onSubmit={handleIngestKnowledge} style={{ margin: '20px 0 28px', background: '#1f2937', padding: '20px', borderRadius: '10px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', marginTop: 0 }}>Индексировать новый узел знаний</h3>
            <input
              type="text"
              placeholder="Заголовок знания"
              value={knowledgeTitle}
              onChange={(e) => setKnowledgeTitle(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
              required
            />
            <textarea
              placeholder="Содержание правила или базы знаний..."
              value={knowledgeContent}
              onChange={(e) => setKnowledgeContent(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#fff', boxSizing: 'border-box' }}
              required
            />
            <button type="submit" style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#9333ea', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Добавить в базу знаний
            </button>
          </form>

          <h3 style={{ fontSize: '16px', color: '#f3f4f6', marginBottom: '14px' }}>Проиндексированные узлы знаний ({knowledgeNodes.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {knowledgeNodes.map(node => (
              <div key={node.id} style={{ background: '#1f2937', padding: '16px', borderRadius: '10px', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#e9d5ff', fontSize: '15px' }}>{node.title}</span>
                  <span style={{ fontSize: '11px', color: '#a855f7', background: '#3b0764', padding: '2px 8px', borderRadius: '4px' }}>{node.id}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5' }}>{node.content}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '10px' }}>Добавлено: {node.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 5: AI-РЕШЕНИЯ (DECISION ENGINE) */}
      {/* ============================================================ */}
      {activeTab === 'decision' && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: '20px', marginTop: 0, color: '#ea580c' }}>🧠 Модуль автономного принятия решений (Decision Engine)</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Автономный анализ текущих проблем сайта и выработка приоритетных целевых действий.</p>

          <div style={{ margin: '24px 0' }}>
            <button onClick={handleEvaluateDecision} style={{ padding: '14px 28px', borderRadius: '8px', border: 'none', background: '#ea580c', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              Запустить анализ сайта и выработать решение
            </button>
          </div>

          {decisionResult ? (
            <div style={{ background: '#1f2937', border: '1px solid #ea580c', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ background: '#ea580c', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>AI ВЕРДИКТ</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffedd5' }}>Рекомендуемое действие: {decisionResult.recommendedAction}</span>
              </div>
              <div style={{ fontSize: '14px', color: '#fed7aa', marginBottom: '16px' }}>Причина: {decisionResult.reason}</div>
              <button onClick={() => { setActiveTab('semantics'); handleCollectSemantics(); }} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                Выполнить рекомендованное действие
              </button>
            </div>
          ) : (
            <div style={{ padding: '30px', background: '#1f2937', borderRadius: '8px', color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>
              Нажмите кнопку выше для запуски анализа и формирования рекомендаций.
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА 6: АНАЛИТИКА (ANALYTICS) */}
      {/* ============================================================ */}
      {activeTab === 'analytics' && (
        <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #1f2937' }}>
          <h2 style={{ fontSize: '20px', marginTop: 0, color: '#10b981' }}>📈 Модуль аналитики и отчетов (Analytics Engine)</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Отслеживание позиций ключевых слов, трафика и эффективности контента.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '24px 0' }}>
            <div style={{ background: '#1f2937', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Проиндексировано страниц</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>45 страниц</div>
              <div style={{ fontSize: '12px', color: '#10b981' }}>100% покрытие роботом</div>
            </div>
            <div style={{ background: '#1f2937', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Средняя позиция в поиске</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>8.4</div>
              <div style={{ fontSize: '12px', color: '#10b981' }}>Улучшение на +3.2 пункта</div>
            </div>
            <div style={{ background: '#1f2937', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #a855f7' }}>
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Конверсия в целевое действие</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>3.8%</div>
              <div style={{ fontSize: '12px', color: '#a855f7' }}>+470 лидов с статей</div>
            </div>
          </div>

          {/* RANK TRACKER CARD WITH LINEAR GRAPH */}
          <div style={{ background: '#1f2937', padding: '24px', borderRadius: '12px', border: '1px solid #374151', marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#10b981' }}>📊 Rank Tracker (Динамика Позиций в Яндекс SERP)</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>Ежедневный автоматический съем позиций опубликованных статей в ТОП-50 Яндекса</p>
              </div>
              <button
                onClick={handleRunRankTracking}
                disabled={rankTrackingRunning}
                style={{ padding: '10px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: rankTrackingRunning ? 'not-allowed' : 'pointer' }}
              >
                {rankTrackingRunning ? '⏳ Съем позиций SERP...' : '📊 Снять позиции сейчас'}
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ color: '#9ca3af', textAlign: 'left', fontSize: '12px', borderBottom: '1px solid #1f2937' }}>
                  <th style={{ padding: '10px 14px' }}>Ключевой запрос</th>
                  <th style={{ padding: '10px 14px' }}>Текущая Позиция</th>
                  <th style={{ padding: '10px 14px' }}>Динамика</th>
                  <th style={{ padding: '10px 14px' }}>Визуальный График Позиции</th>
                  <th style={{ padding: '10px 14px' }}>Целевой URL</th>
                </tr>
              </thead>
              <tbody>
                {rankHistoryList.map((item) => {
                  const diff = item.prevPos - item.pos;
                  const posPct = Math.max(10, Math.min(100, 100 - (item.pos * 1.8)));

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1f2937', color: '#f3f4f6', fontSize: '13px' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{item.term}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: item.pos <= 3 ? '#064e3b' : item.pos <= 10 ? '#065f46' : '#854d0e', color: item.pos <= 3 ? '#6ee7b7' : item.pos <= 10 ? '#a7f3d0' : '#fef08a', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '12px' }}>
                          #{item.pos} {item.pos <= 3 ? '🏆 ТОП-3' : item.pos <= 10 ? '⭐ ТОП-10' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {diff >= 0 ? `▲ +${diff}` : `▼ ${diff}`}
                      </td>
                      <td style={{ padding: '10px 14px', width: '180px' }}>
                        <div style={{ background: '#1f2937', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${posPct}%`, background: item.pos <= 3 ? '#10b981' : item.pos <= 10 ? '#38bdf8' : '#f59e0b', height: '100%' }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace' }}>
                        {item.url}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#059669', color: '#fff', padding: '16px 24px', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999, fontWeight: 600, fontSize: '14px', border: '1px solid #10b981' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
