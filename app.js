/* ==========================================================================
   LIFE-OS — Application Principale (Vanilla JS, IndexedDB, LocalStorage, PWA)
   ========================================================================== */

(() => {
  'use strict';

  const DB_NAME = 'LIFE_OS_DB';
  const DB_VERSION = 1;
  const PREFS_KEY = 'LIFE_OS_PREFS_V1';

  const STORES = [
    'tasks',
    'events',
    'focusSessions',
    'studyItems',
    'businessItems',
    'torahEntries',
    'personalItems',
    'habits',
    'crmPersonal',
    'crmBusiness',
    'goals',
    'notes'
  ];

  const DEFAULT_PRIORITIES = [
    {
      id: 'p1_bts_ol',
      rank: 1,
      title: 'BTS Opticien-Lunétier',
      items: [
        'Cours', 'Révisions', 'Exercices', 'Analyse de la vision',
        'Optique géométrique', 'Étude technique des systèmes optiques',
        'Gestion', 'Économie-droit', 'Préparation des examens'
      ]
    },
    {
      id: 'p2_autres_examens',
      rank: 2,
      title: 'Autres examens',
      items: ['Code de la route et permis B', 'Sofer Stam']
    },
    {
      id: 'p3_orpaz_style',
      rank: 3,
      title: 'ORPAZ-STYLE',
      items: [
        'Développement du site', 'Positionnement commercial', 'Judaïca',
        'Bijouterie', 'Gestion des produits', 'Marketing',
        'Communication', 'Développement commercial'
      ]
    },
    {
      id: 'p4_torah_spirituel',
      rank: 4,
      title: 'Torah et développement spirituel',
      items: [
        'Étude quotidienne', 'Daf Hayomi', 'Halakha', 'Guemara',
        'Moussar', 'Lecture du livre du Rav Shalom Arush', 'Tefila'
      ]
    },
    {
      id: 'p5_examen_civique',
      rank: 5,
      title: 'Examen civique',
      items: ['Préparation et révisions']
    }
  ];

  const BTS_SUBJECTS = [
    'Optique géométrique',
    'Analyse de la vision',
    'Étude technique des systèmes optiques',
    'Gestion',
    'Économie-droit',
    'Activités professionnelles'
  ];

  const TORAH_SECTIONS = [
    'Tefila',
    'Daf Hayomi',
    'Guemara',
    'Halakha',
    'Moussar',
    "Hok LéIsraël",
    "Na'h et commentaires",
    'Lecture personnelle'
  ];

  const BUSINESS_ACTIVITIES = [
    'Bijouterie en or et argent',
    "Achat-revente d'or",
    'Judaïca',
    'Produits et collections',
    'Kippot sur mesure pour événements juifs',
    'E-commerce',
    'Marketing et communication'
  ];

  const PERSONAL_SECTIONS = [
    'Sport',
    'Santé et bien-être',
    'Hygiène',
    'Sommeil',
    'Vie administrative',
    'Objectifs personnels',
    'Organisation quotidienne'
  ];

  const DEFAULT_PREFS = {
    theme: 'dark',
    userName: '',
    priorities: DEFAULT_PRIORITIES,
    focusConfig: {
      workMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      soundEnabled: true,
      notifyEnabled: true
    },
    planningConfig: {
      dayStartHour: 6,
      dayEndHour: 23,
      defaultBufferMin: 15,
      defaultTravelMin: 15
    },
    torahConfig: {
      locationName: '',
      latitude: '',
      longitude: '',
      manualPrayerTimes: '',
      shabbatNotice: 'Respect strict du Shabbat et des fêtes juives (aucune planification automatisée pendant Shabbat/Fêtes).'
    },
    notionSyncConfig: {
      enabled: false,
      backendProxyUrl: '',
      workspaceTitle: '',
      note: 'Architecture prête pour synchronisation future via backend sécurisé (aucun secret API stocké dans le navigateur).'
    }
  };

  /* ========================================================================
     State & Storage Layer
     ======================================================================== */
  const state = {
    db: null,
    prefs: loadPrefs(),
    currentSection: 'dashboard',
    planningView: 'day', // day | week | month
    planningDate: todayISO(),
    crmTab: 'personal', // personal | business
    businessTab: 'all', // all | judaica | father | commerce
    studySubject: BTS_SUBJECTS[0],
    torahSection: TORAH_SECTIONS[0],
    personalSection: PERSONAL_SECTIONS[0],
    data: {
      tasks: [],
      events: [],
      focusSessions: [],
      studyItems: [],
      businessItems: [],
      torahEntries: [],
      personalItems: [],
      habits: [],
      crmPersonal: [],
      crmBusiness: [],
      goals: [],
      notes: []
    },
    timer: {
      mode: 'work', // work | short_break | long_break | stopwatch
      status: 'idle', // idle | running | paused
      durationSec: 25 * 60,
      remainingSec: 25 * 60,
      elapsedStopwatchSec: 0,
      targetEndMs: null,
      segmentStartMs: null,
      linkedTaskId: '',
      sessionCount: 1,
      intervalId: null
    }
  };

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDateFR(dateStrOrObj = new Date()) {
    const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj + 'T12:00:00') : dateStrOrObj;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHTML(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return structuredClone(DEFAULT_PREFS);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_PREFS),
        ...parsed,
        priorities: Array.isArray(parsed.priorities) && parsed.priorities.length
          ? parsed.priorities
          : structuredClone(DEFAULT_PRIORITIES),
        focusConfig: { ...DEFAULT_PREFS.focusConfig, ...(parsed.focusConfig || {}) },
        planningConfig: { ...DEFAULT_PREFS.planningConfig, ...(parsed.planningConfig || {}) },
        torahConfig: { ...DEFAULT_PREFS.torahConfig, ...(parsed.torahConfig || {}) },
        notionSyncConfig: { ...DEFAULT_PREFS.notionSyncConfig, ...(parsed.notionSyncConfig || {}) }
      };
    } catch (err) {
      console.error('[LIFE-OS] Erreur lecture préférences LocalStorage:', err);
      return structuredClone(DEFAULT_PREFS);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
      showToast('Préférences enregistrées localement.');
    } catch (err) {
      console.error('[LIFE-OS] Erreur sauvegarde LocalStorage:', err);
      showToast('Erreur lors de la sauvegarde des préférences.', 'error');
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB non supporté par ce navigateur.'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        STORES.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = (event) => {
        resolve(event.target.result);
      };
      req.onerror = (event) => {
        reject(event.target.error || new Error('Ouverture IndexedDB impossible.'));
      };
    });
  }

  function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!state.db) {
        resolve(state.data[storeName] || []);
        return;
      }
      const tx = state.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(storeName, record) {
    const item = { ...record, id: record.id || uid(), updatedAt: new Date().toISOString() };
    state.data[storeName] = [
      ...state.data[storeName].filter((x) => x.id !== item.id),
      item
    ];
    if (state.db) {
      await new Promise((resolve, reject) => {
        const tx = state.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(item);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    renderAll();
    return item;
  }

  async function dbDelete(storeName, id) {
    state.data[storeName] = state.data[storeName].filter((x) => x.id !== id);
    if (state.db) {
      await new Promise((resolve, reject) => {
        const tx = state.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    renderAll();
  }

  async function loadAllStores() {
    for (const store of STORES) {
      state.data[store] = await dbGetAll(store);
    }
  }

  /* ========================================================================
     Theme & Network Status
     ======================================================================== */
  function resolveTheme(choice) {
    if (choice === 'light' || choice === 'dark') return choice;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(choice = state.prefs.theme) {
    state.prefs.theme = choice;
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
    const effective = resolveTheme(choice);
    document.documentElement.setAttribute('data-theme', effective);
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeChoice === choice);
    });
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', effective === 'dark' ? '#070d1b' : '#06b6d4');
    }
  }

  function updateNetworkStatus() {
    const pill = document.getElementById('network-status-pill');
    const text = document.getElementById('network-status-text');
    const online = navigator.onLine;
    if (!pill || !text) return;
    pill.classList.toggle('online', online);
    pill.classList.toggle('offline', !online);
    text.textContent = online ? 'En ligne · Local' : 'Hors ligne · Local';
  }

  /* ========================================================================
     Icons & UI Helpers
     ======================================================================== */
  const SVG_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    planning: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    focus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    studies: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    business: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    torah: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
    personal: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    crm: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    habits: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    goals: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>',
    settings: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
  };

  function hydrateIcons() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      const key = el.getAttribute('data-icon');
      if (SVG_ICONS[key]) {
        el.innerHTML = SVG_ICONS[key];
      }
    });
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  function openModal({ title, bodyHTML, footerHTML, onMount }) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');
    titleEl.textContent = title || 'Fenêtre';
    bodyEl.innerHTML = bodyHTML || '';
    footerEl.innerHTML = footerHTML || '<button type="button" class="btn btn-secondary" data-close-modal>Fermer</button>';
    overlay.classList.remove('hidden');
    footerEl.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', closeModal);
    });
    if (typeof onMount === 'function') {
      onMount(bodyEl, footerEl);
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  function confirmDelete(label, onConfirm) {
    openModal({
      title: 'Confirmer la suppression',
      bodyHTML: `<p style="margin:0;line-height:1.5;color:var(--text-secondary)">Êtes-vous sûr de vouloir supprimer définitivement : <strong style="color:var(--text-primary)">${escapeHTML(label)}</strong> ? Cette action est irréversible.</p>`,
      footerHTML: `
        <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
        <button type="button" id="btn-confirm-delete-action" class="btn btn-danger">Supprimer</button>
      `,
      onMount: (_b, footer) => {
        footer.querySelector('#btn-confirm-delete-action').addEventListener('click', async () => {
          closeModal();
          await onConfirm();
          showToast('Élément supprimé.');
        });
      }
    });
  }

  /* ========================================================================
     Navigation & Global Search
     ======================================================================== */
  const SECTION_TITLES = {
    dashboard: 'Dashboard — Centre de commande',
    tasks: 'Tâches',
    planning: 'Planning intelligent',
    focus: 'Mode Focus',
    studies: 'Études — BTS Opticien-Lunétier',
    business: 'Business — ORPAZ-STYLE.COM',
    torah: 'Torah & Vie spirituelle',
    personal: 'Vie personnelle',
    crm: 'CRM Hybride',
    habits: 'Habitudes',
    goals: 'Objectifs',
    analytics: 'Pilotage & Statistiques',
    settings: 'Paramètres'
  };

  function navigateTo(sectionKey) {
    if (!SECTION_TITLES[sectionKey]) sectionKey = 'dashboard';
    state.currentSection = sectionKey;

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === sectionKey);
    });
    document.querySelectorAll('.bottom-nav-btn[data-section]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === sectionKey);
    });
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === `section-${sectionKey}`);
    });

    document.getElementById('topbar-title').textContent = SECTION_TITLES[sectionKey];
    closeSidebarMobile();
    renderSection(sectionKey);
  }

  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
  }

  function openSidebarMobile() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('open');
  }

  function performGlobalSearch(query) {
    const q = (query || '').trim().toLowerCase();
    const box = document.getElementById('global-search-results');
    const clearBtn = document.getElementById('btn-clear-search');
    clearBtn.classList.toggle('hidden', !q);

    if (!q) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }

    const groups = [];

    const matchedTasks = state.data.tasks.filter((t) =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.domain || '').toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q)
    );
    if (matchedTasks.length) {
      groups.push({
        label: 'Tâches',
        items: matchedTasks.slice(0, 5).map((t) => ({
          title: t.title,
          meta: t.dueDate ? `Échéance : ${t.dueDate}` : (t.domain || 'Tâche'),
          section: 'tasks'
        }))
      });
    }

    const matchedProjects = [
      ...state.data.goals.map((g) => ({ title: g.title, meta: `Objectif · ${g.domain || ''}`, section: 'goals' })),
      ...state.data.businessItems
        .filter((b) => b.category === 'project' || b.category === 'product')
        .map((b) => ({ title: b.title, meta: `ORPAZ-STYLE · ${b.responsibility || ''}`, section: 'business' }))
    ].filter((x) => x.title.toLowerCase().includes(q) || x.meta.toLowerCase().includes(q));
    if (matchedProjects.length) {
      groups.push({ label: 'Projets & Objectifs', items: matchedProjects.slice(0, 5) });
    }

    const matchedEvents = state.data.events.filter((e) =>
      (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q)
    );
    if (matchedEvents.length) {
      groups.push({
        label: 'Événements',
        items: matchedEvents.slice(0, 5).map((e) => ({
          title: e.title,
          meta: `${e.date || ''} ${e.startTime || ''}`,
          section: 'planning'
        }))
      });
    }

    const matchedContacts = [
      ...state.data.crmPersonal.map((c) => ({ title: c.name, meta: `CRM Personnel · ${c.relation || ''}`, section: 'crm' })),
      ...state.data.crmBusiness.map((c) => ({ title: c.name, meta: `CRM ORPAZ-STYLE · ${c.role || ''}`, section: 'crm' }))
    ].filter((c) => c.title.toLowerCase().includes(q) || c.meta.toLowerCase().includes(q));
    if (matchedContacts.length) {
      groups.push({ label: 'Contacts', items: matchedContacts.slice(0, 5) });
    }

    const matchedNotes = state.data.notes.filter((n) =>
      (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
    );
    if (matchedNotes.length) {
      groups.push({
        label: 'Notes',
        items: matchedNotes.slice(0, 5).map((n) => ({
          title: n.title || 'Note sans titre',
          meta: (n.content || '').slice(0, 45),
          section: 'dashboard'
        }))
      });
    }

    const deadlines = state.data.tasks.filter((t) => !t.completed && t.dueDate && t.dueDate.toLowerCase().includes(q));
    if (deadlines.length) {
      groups.push({
        label: 'Échéances',
        items: deadlines.slice(0, 5).map((t) => ({
          title: t.title,
          meta: `Échéance ${t.dueDate}`,
          section: 'tasks'
        }))
      });
    }

    if (!groups.length) {
      box.innerHTML = `<div style="padding:14px;font-size:0.84rem;color:var(--text-muted)">Aucun résultat pour « ${escapeHTML(query)} ».</div>`;
      box.classList.remove('hidden');
      return;
    }

    box.innerHTML = groups
      .map(
        (g) => `
        <div class="search-result-group-title">${escapeHTML(g.label)}</div>
        ${g.items
          .map(
            (item) => `
          <button type="button" class="search-result-item" data-jump-section="${item.section}">
            <span>${escapeHTML(item.title)}</span>
            <span class="search-result-meta">${escapeHTML(item.meta)}</span>
          </button>
        `
          )
          .join('')}
      `
      )
      .join('');

    box.querySelectorAll('[data-jump-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(btn.getAttribute('data-jump-section'));
        box.classList.add('hidden');
      });
    });
    box.classList.remove('hidden');
  }

  /* ========================================================================
     Focus Timer Engine (Background-Accurate)
     ======================================================================== */
  function getModeDurationSec(mode) {
    const cfg = state.prefs.focusConfig;
    if (mode === 'short_break') return (cfg.shortBreakMin || 5) * 60;
    if (mode === 'long_break') return (cfg.longBreakMin || 15) * 60;
    if (mode === 'stopwatch') return 0;
    return (cfg.workMin || 25) * 60;
  }

  function setTimerMode(mode) {
    pauseTimer(true);
    state.timer.mode = mode;
    if (mode === 'stopwatch') {
      state.timer.durationSec = 0;
      state.timer.remainingSec = 0;
      state.timer.elapsedStopwatchSec = 0;
    } else {
      const sec = getModeDurationSec(mode);
      state.timer.durationSec = sec;
      state.timer.remainingSec = sec;
    }
    updateTimerDisplays();
  }

  function startTimer() {
    if (state.timer.status === 'running') return;
    const now = Date.now();
    state.timer.status = 'running';
    if (state.timer.mode === 'stopwatch') {
      state.timer.segmentStartMs = now;
    } else {
      if (state.timer.remainingSec <= 0) {
        state.timer.remainingSec = getModeDurationSec(state.timer.mode);
        state.timer.durationSec = state.timer.remainingSec;
      }
      state.timer.targetEndMs = now + state.timer.remainingSec * 1000;
    }
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = setInterval(tickTimer, 250);
    updateTimerDisplays();
  }

  function pauseTimer(silent = false) {
    if (state.timer.status !== 'running') return;
    const now = Date.now();
    if (state.timer.mode === 'stopwatch') {
      if (state.timer.segmentStartMs) {
        state.timer.elapsedStopwatchSec += Math.floor((now - state.timer.segmentStartMs) / 1000);
      }
      state.timer.segmentStartMs = null;
    } else if (state.timer.targetEndMs) {
      state.timer.remainingSec = Math.max(0, Math.round((state.timer.targetEndMs - now) / 1000));
      state.timer.targetEndMs = null;
    }
    state.timer.status = 'paused';
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    if (!silent) updateTimerDisplays();
  }

  function resetTimer() {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    state.timer.status = 'idle';
    state.timer.targetEndMs = null;
    state.timer.segmentStartMs = null;
    if (state.timer.mode === 'stopwatch') {
      state.timer.elapsedStopwatchSec = 0;
      state.timer.remainingSec = 0;
    } else {
      const sec = getModeDurationSec(state.timer.mode);
      state.timer.durationSec = sec;
      state.timer.remainingSec = sec;
    }
    updateTimerDisplays();
  }

  async function tickTimer() {
    if (state.timer.status !== 'running') return;
    const now = Date.now();

    if (state.timer.mode === 'stopwatch') {
      const liveSec = state.timer.elapsedStopwatchSec + Math.max(0, Math.floor((now - (state.timer.segmentStartMs || now)) / 1000));
      state.timer.remainingSec = liveSec;
      updateTimerDisplays();
      return;
    }

    const rem = Math.max(0, Math.round((state.timer.targetEndMs - now) / 1000));
    state.timer.remainingSec = rem;
    updateTimerDisplays();

    if (rem <= 0) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
      state.timer.status = 'idle';
      state.timer.targetEndMs = null;
      await handleTimerCompleted();
    }
  }

  async function handleTimerCompleted() {
    const completedSec = state.timer.mode === 'stopwatch'
      ? state.timer.elapsedStopwatchSec
      : state.timer.durationSec;
    const minutes = Math.max(1, Math.round(completedSec / 60));
    const linkedTask = state.data.tasks.find((t) => t.id === state.timer.linkedTaskId);

    const sessionRecord = {
      id: uid(),
      date: todayISO(),
      mode: state.timer.mode,
      durationMinutes: minutes,
      sessionNumber: state.timer.sessionCount,
      taskTitle: linkedTask ? linkedTask.title : 'Session libre',
      domain: linkedTask ? (linkedTask.domain || 'Focus') : 'Focus',
      completedAt: new Date().toISOString()
    };

    await dbPut('focusSessions', sessionRecord);

    if (state.timer.mode === 'work') {
      state.timer.sessionCount += 1;
      const nextMode = state.timer.sessionCount % 4 === 0 ? 'long_break' : 'short_break';
      setTimerMode(nextMode);
    } else {
      setTimerMode('work');
    }

    playNotificationSound();
    showToast(`Session Focus terminée (${minutes} min enregistrées).`);

    if (state.prefs.focusConfig.notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('LIFE-OS — Mode Focus', {
          body: `Session terminée (${minutes} min).`
        });
      } catch (_e) { /* ignore */ }
    }
  }

  function playNotificationSound() {
    if (!state.prefs.focusConfig.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (_e) { /* ignore audio errors */ }
  }

  function formatSecondsMMSS(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getModeLabelFR(mode) {
    if (mode === 'short_break') return 'Pause courte';
    if (mode === 'long_break') return 'Pause longue';
    if (mode === 'stopwatch') return 'Chronomètre';
    return 'Travail Focus';
  }

  function updateTimerDisplays() {
    const label = getModeLabelFR(state.timer.mode);
    const readout = formatSecondsMMSS(
      state.timer.mode === 'stopwatch' ? state.timer.remainingSec : state.timer.remainingSec
    );

    let progressRatio = 0;
    if (state.timer.mode === 'stopwatch') {
      progressRatio = (state.timer.remainingSec % 3600) / 3600;
    } else if (state.timer.durationSec > 0) {
      progressRatio = Math.min(1, Math.max(0, (state.timer.durationSec - state.timer.remainingSec) / state.timer.durationSec));
    }

    document.querySelectorAll('.js-timer-readout').forEach((el) => {
      el.textContent = readout;
    });
    document.querySelectorAll('.js-timer-mode-label').forEach((el) => {
      el.textContent = label;
    });
    document.querySelectorAll('.js-timer-session-num').forEach((el) => {
      el.textContent = `Session #${state.timer.sessionCount}`;
    });
    document.querySelectorAll('.js-timer-ring').forEach((circle) => {
      const r = parseFloat(circle.getAttribute('r') || '66');
      const circumference = 2 * Math.PI * r;
      circle.style.strokeDasharray = `${circumference}`;
      circle.style.strokeDashoffset = `${circumference * (1 - progressRatio)}`;
    });
    document.querySelectorAll('.js-timer-toggle-label').forEach((el) => {
      if (state.timer.status === 'running') el.textContent = 'Pause';
      else if (state.timer.status === 'paused') el.textContent = 'Reprendre';
      else el.textContent = 'Démarrer';
    });
  }

  function renderTimerWidgetHTML(compact = false) {
    const radius = compact ? 58 : 66;
    const viewBox = compact ? '0 0 140 140' : '0 0 160 160';
    const cx = compact ? 70 : 80;
    const cy = compact ? 70 : 80;
    const taskOptions = state.data.tasks
      .filter((t) => !t.completed)
      .map((t) => `<option value="${escapeHTML(t.id)}" ${state.timer.linkedTaskId === t.id ? 'selected' : ''}>${escapeHTML(t.title)}</option>`)
      .join('');

    return `
      <div>
        <div class="focus-ring-wrap ${compact ? 'compact' : ''}">
          <svg class="focus-ring-svg" viewBox="${viewBox}" aria-hidden="true">
            <defs>
              <linearGradient id="focusCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#06b6d4" />
                <stop offset="100%" stop-color="#22d3ee" />
              </linearGradient>
            </defs>
            <circle class="focus-ring-track" cx="${cx}" cy="${cy}" r="${radius}" />
            <circle class="focus-ring-progress js-timer-ring" cx="${cx}" cy="${cy}" r="${radius}" />
          </svg>
          <div class="focus-ring-center">
            <span class="focus-time-readout js-timer-readout">25:00</span>
            <span class="focus-mode-label js-timer-mode-label">Travail Focus</span>
            <span class="kpi-sub js-timer-session-num">Session #${state.timer.sessionCount}</span>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">
          <button type="button" class="tab-pill ${state.timer.mode === 'work' ? 'active' : ''}" data-timer-mode="work">Pomodoro</button>
          <button type="button" class="tab-pill ${state.timer.mode === 'short_break' ? 'active' : ''}" data-timer-mode="short_break">Pause courte</button>
          <button type="button" class="tab-pill ${state.timer.mode === 'long_break' ? 'active' : ''}" data-timer-mode="long_break">Pause longue</button>
          <button type="button" class="tab-pill ${state.timer.mode === 'stopwatch' ? 'active' : ''}" data-timer-mode="stopwatch">Chrono</button>
        </div>

        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
          <button type="button" class="btn btn-primary btn-sm" data-timer-action="toggle">
            <span class="js-timer-toggle-label">Démarrer</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" data-timer-action="reset">Réinitialiser</button>
        </div>

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Associer à une tâche</label>
          <select class="form-select js-timer-linked-task">
            <option value="">— Session libre —</option>
            ${taskOptions}
          </select>
        </div>
      </div>
    `;
  }

  function bindTimerEvents(container) {
    container.querySelectorAll('[data-timer-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTimerMode(btn.getAttribute('data-timer-mode'));
        renderSection(state.currentSection);
      });
    });
    container.querySelectorAll('[data-timer-action="toggle"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.timer.status === 'running') pauseTimer();
        else startTimer();
      });
    });
    container.querySelectorAll('[data-timer-action="reset"]').forEach((btn) => {
      btn.addEventListener('click', resetTimer);
    });
    container.querySelectorAll('.js-timer-linked-task').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        state.timer.linkedTaskId = e.target.value;
      });
    });
    updateTimerDisplays();
  }

  /* ========================================================================
     Smart Planning Engine
     ======================================================================== */
  function isReligiousOrProtected(ev) {
    const txt = `${ev.title || ''} ${ev.category || ''}`.toLowerCase();
    return Boolean(
      ev.protected ||
      ev.isReligious ||
      txt.includes('prière') ||
      txt.includes('tefila') ||
      txt.includes('shabbat') ||
      txt.includes('fête')
    );
  }

  function detectOverlaps(eventsForDate) {
    const sorted = [...eventsForDate]
      .filter((e) => e.startTime && e.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const overlapIds = new Set();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].startTime < sorted[i].endTime) {
          overlapIds.add(sorted[i].id);
          overlapIds.add(sorted[j].id);
        }
      }
    }
    return overlapIds;
  }

  function findNextFreeSlot(dateStr, durationMin = 60, afterTime = '08:00') {
    const dayEvents = state.data.events
      .filter((e) => e.date === dateStr && e.startTime && e.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const toMin = (hhmm) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

    let candidateStart = Math.max(toMin(afterTime), (state.prefs.planningConfig.dayStartHour || 6) * 60);
    const dayEnd = (state.prefs.planningConfig.dayEndHour || 23) * 60;

    for (const ev of dayEvents) {
      const evStart = toMin(ev.startTime);
      const evEnd = toMin(ev.endTime);
      if (candidateStart + durationMin <= evStart) {
        return { startTime: toHHMM(candidateStart), endTime: toHHMM(candidateStart + durationMin) };
      }
      if (evEnd > candidateStart) {
        candidateStart = evEnd + (state.prefs.planningConfig.defaultBufferMin || 15);
      }
    }

    if (candidateStart + durationMin <= dayEnd) {
      return { startTime: toHHMM(candidateStart), endTime: toHHMM(candidateStart + durationMin) };
    }
    return null;
  }

  async function runSmartAutoSchedule(dateStr) {
    const existing = state.data.events.filter((e) => e.date === dateStr);
    const baseBlocks = [
      { title: 'Réveil, hygiène & douche', startTime: '07:00', endTime: '07:45', category: 'Hygiène', protected: false, travelMin: 0, bufferMin: 10 },
      { title: 'Tefila & petit-déjeuner', startTime: '07:55', endTime: '09:00', category: 'Torah', protected: true, isReligious: true, travelMin: 0, bufferMin: 15 },
      { title: 'Déjeuner & pause récupération', startTime: '12:30', endTime: '13:30', category: 'Repas', protected: false, travelMin: 0, bufferMin: 15 },
      { title: 'Sport / activité physique', startTime: '17:30', endTime: '18:30', category: 'Sport', protected: false, travelMin: 15, bufferMin: 15 },
      { title: 'Dîner & détente', startTime: '19:45', endTime: '20:45', category: 'Repas', protected: false, travelMin: 0, bufferMin: 15 },
      { title: 'Sommeil & récupération nocturne', startTime: '22:45', endTime: '23:59', category: 'Sommeil', protected: false, travelMin: 0, bufferMin: 0 }
    ];

    let addedCount = 0;
    for (const b of baseBlocks) {
      const clash = existing.some((ex) => ex.startTime && ex.endTime && b.startTime < ex.endTime && b.endTime > ex.startTime);
      if (!clash) {
        await dbPut('events', {
          id: uid(),
          date: dateStr,
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
          priorityRank: b.category === 'Torah' ? 4 : 0,
          protected: b.protected,
          isReligious: Boolean(b.isReligious),
          travelMin: b.travelMin,
          bufferMin: b.bufferMin,
          recurring: 'none',
          reminderMin: 10
        });
        addedCount += 1;
      }
    }

    // Planifier les tâches ouvertes selon la hiérarchie des priorités
    const rankOrder = state.prefs.priorities.map((p) => p.title.toLowerCase());
    const openTasks = state.data.tasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        const ra = rankOrder.findIndex((x) => (a.domain || '').toLowerCase().includes(x));
        const rb = rankOrder.findIndex((x) => (b.domain || '').toLowerCase().includes(x));
        return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
      });

    for (const task of openTasks) {
      const dur = Number(task.estimatedMin) || 45;
      const slot = findNextFreeSlot(dateStr, dur, '09:15');
      if (slot) {
        await dbPut('events', {
          id: uid(),
          date: dateStr,
          title: task.title,
          startTime: slot.startTime,
          endTime: slot.endTime,
          category: task.domain || 'Tâche',
          priorityRank: 1,
          protected: false,
          isReligious: false,
          travelMin: state.prefs.planningConfig.defaultTravelMin || 15,
          bufferMin: state.prefs.planningConfig.defaultBufferMin || 15,
          recurring: 'none',
          reminderMin: 15
        });
        addedCount += 1;
      }
    }

    showToast(addedCount ? `${addedCount} créneau(x) organisé(s) intelligemment.` : 'Aucun nouveau créneau libre nécessaire.');
  }

  /* ========================================================================
     Modals for Creating & Editing Entities
     ======================================================================== */
  function openTaskModal(existingTask = null) {
    const isEdit = Boolean(existingTask);
    const domainOptions = state.prefs.priorities
      .map((p) => `<option value="${escapeHTML(p.title)}" ${existingTask?.domain === p.title ? 'selected' : ''}>Priorité ${p.rank} — ${escapeHTML(p.title)}</option>`)
      .join('');

    openModal({
      title: isEdit ? 'Modifier la tâche' : 'Nouvelle tâche',
      bodyHTML: `
        <form id="form-task">
          <div class="form-group">
            <label class="form-label" for="task-title">Titre de la tâche *</label>
            <input id="task-title" class="form-input" type="text" required value="${escapeHTML(existingTask?.title || '')}" placeholder="Ex. Réviser optique géométrique — Chapitre 3" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="task-domain">Domaine / Priorité</label>
              <select id="task-domain" class="form-select">
                ${domainOptions}
                <option value="Vie personnelle" ${existingTask?.domain === 'Vie personnelle' ? 'selected' : ''}>Vie personnelle</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="task-priority">Urgence / Priorité</label>
              <select id="task-priority" class="form-select">
                <option value="urgent" ${existingTask?.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
                <option value="high" ${existingTask?.priority === 'high' ? 'selected' : ''}>Haute</option>
                <option value="normal" ${(!existingTask?.priority || existingTask?.priority === 'normal') ? 'selected' : ''}>Normale</option>
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="task-due">Échéance</label>
              <input id="task-due" class="form-input" type="date" value="${escapeHTML(existingTask?.dueDate || todayISO())}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="task-est">Durée estimée (min)</label>
              <input id="task-est" class="form-input" type="number" min="5" step="5" value="${escapeHTML(String(existingTask?.estimatedMin || 45))}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="task-notes">Notes</label>
            <textarea id="task-notes" class="form-textarea" placeholder="Détails, ressources ou critères de réussite...">${escapeHTML(existingTask?.notes || '')}</textarea>
          </div>
        </form>
      `,
      footerHTML: `
        <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
        <button type="button" id="btn-save-task" class="btn btn-primary">Enregistrer</button>
      `,
      onMount: (body, footer) => {
        footer.querySelector('#btn-save-task').addEventListener('click', async () => {
          const title = body.querySelector('#task-title').value.trim();
          if (!title) {
            showToast('Veuillez saisir un titre de tâche.', 'error');
            return;
          }
          await dbPut('tasks', {
            ...(existingTask || {}),
            id: existingTask?.id || uid(),
            title,
            domain: body.querySelector('#task-domain').value,
            priority: body.querySelector('#task-priority').value,
            dueDate: body.querySelector('#task-due').value,
            estimatedMin: Number(body.querySelector('#task-est').value) || 30,
            notes: body.querySelector('#task-notes').value.trim(),
            completed: existingTask?.completed || false
          });
          closeModal();
          showToast(isEdit ? 'Tâche mise à jour.' : 'Tâche ajoutée.');
        });
      }
    });
  }

  function openEventModal(existingEvent = null, presetDate = null) {
    const isEdit = Boolean(existingEvent);
    openModal({
      title: isEdit ? 'Modifier le bloc horaire' : 'Nouvel événement / bloc de planning',
      bodyHTML: `
        <form id="form-event">
          <div class="form-group">
            <label class="form-label" for="ev-title">Intitulé *</label>
            <input id="ev-title" class="form-input" type="text" required value="${escapeHTML(existingEvent?.title || '')}" placeholder="Ex. Cours / Révision BTS OL" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="ev-date">Date</label>
              <input id="ev-date" class="form-input" type="date" value="${escapeHTML(existingEvent?.date || presetDate || state.planningDate || todayISO())}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="ev-cat">Catégorie</label>
              <select id="ev-cat" class="form-select">
                ${['Études', 'Travail', 'Projet', 'Torah', 'Repas', 'Déplacement', 'Sport', 'Hygiène', 'Pause', 'Sommeil', 'Récupération']
                  .map((c) => `<option value="${c}" ${existingEvent?.category === c ? 'selected' : ''}>${c}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="ev-start">Début</label>
              <input id="ev-start" class="form-input" type="time" value="${escapeHTML(existingEvent?.startTime || '09:00')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="ev-end">Fin</label>
              <input id="ev-end" class="form-input" type="time" value="${escapeHTML(existingEvent?.endTime || '10:30')}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="ev-travel">Temps de déplacement (min)</label>
              <input id="ev-travel" class="form-input" type="number" min="0" step="5" value="${escapeHTML(String(existingEvent?.travelMin ?? state.prefs.planningConfig.defaultTravelMin ?? 15))}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="ev-buffer">Temps tampon (min)</label>
              <input id="ev-buffer" class="form-input" type="number" min="0" step="5" value="${escapeHTML(String(existingEvent?.bufferMin ?? state.prefs.planningConfig.defaultBufferMin ?? 15))}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="ev-rec">Récurrence</label>
              <select id="ev-rec" class="form-select">
                <option value="none" ${(!existingEvent?.recurring || existingEvent?.recurring === 'none') ? 'selected' : ''}>Ponctuel</option>
                <option value="daily" ${existingEvent?.recurring === 'daily' ? 'selected' : ''}>Quotidien</option>
                <option value="weekly" ${existingEvent?.recurring === 'weekly' ? 'selected' : ''}>Hebdomadaire</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="ev-rem">Rappel (min avant)</label>
              <input id="ev-rem" class="form-input" type="number" min="0" step="5" value="${escapeHTML(String(existingEvent?.reminderMin ?? 10))}" />
            </div>
          </div>
          <div class="form-group" style="flex-direction:row;align-items:center;gap:8px">
            <input id="ev-prot" type="checkbox" ${existingEvent?.protected ? 'checked' : ''} />
            <label for="ev-prot" class="form-label" style="margin:0">Obligation religieuse / Événement protégé (ne jamais déplacer automatiquement)</label>
          </div>
        </form>
      `,
      footerHTML: `
        <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
        <button type="button" id="btn-save-event" class="btn btn-primary">Enregistrer</button>
      `,
      onMount: (body, footer) => {
        footer.querySelector('#btn-save-event').addEventListener('click', async () => {
          const title = body.querySelector('#ev-title').value.trim();
          if (!title) {
            showToast('Veuillez saisir un intitulé.', 'error');
            return;
          }
          const dateVal = body.querySelector('#ev-date').value || todayISO();
          const startTime = body.querySelector('#ev-start').value;
          const endTime = body.querySelector('#ev-end').value;
          const cat = body.querySelector('#ev-cat').value;
          const isProt = body.querySelector('#ev-prot').checked || cat === 'Torah';

          // Détection chevauchement et suggestion alternative si nécessaire
          const sameDay = state.data.events.filter((e) => e.date === dateVal && e.id !== existingEvent?.id);
          const hasClash = sameDay.some((e) => e.startTime && e.endTime && startTime < e.endTime && endTime > e.startTime);

          await dbPut('events', {
            ...(existingEvent || {}),
            id: existingEvent?.id || uid(),
            title,
            date: dateVal,
            category: cat,
            startTime,
            endTime,
            travelMin: Number(body.querySelector('#ev-travel').value) || 0,
            bufferMin: Number(body.querySelector('#ev-buffer').value) || 0,
            recurring: body.querySelector('#ev-rec').value,
            reminderMin: Number(body.querySelector('#ev-rem').value) || 0,
            protected: isProt,
            isReligious: cat === 'Torah'
          });
          closeModal();

          if (hasClash) {
            const alt = findNextFreeSlot(dateVal, 60, endTime || '14:00');
            showToast(
              alt
                ? `Chevauchement détecté. Créneau libre suggéré : ${alt.startTime}–${alt.endTime}.`
                : 'Chevauchement détecté sur ce créneau.',
              'error'
            );
          } else {
            showToast('Bloc horaire enregistré.');
          }
        });
      }
    });
  }

  function openQuickNoteModal() {
    openModal({
      title: 'Nouvelle note',
      bodyHTML: `
        <div class="form-group">
          <label class="form-label" for="note-title">Titre</label>
          <input id="note-title" class="form-input" type="text" placeholder="Titre de la note" />
        </div>
        <div class="form-group">
          <label class="form-label" for="note-content">Contenu *</label>
          <textarea id="note-content" class="form-textarea" placeholder="Écrivez votre note ici..."></textarea>
        </div>
      `,
      footerHTML: `
        <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
        <button type="button" id="btn-save-note" class="btn btn-primary">Enregistrer</button>
      `,
      onMount: (body, footer) => {
        footer.querySelector('#btn-save-note').addEventListener('click', async () => {
          const content = body.querySelector('#note-content').value.trim();
          if (!content) {
            showToast('Le contenu de la note est vide.', 'error');
            return;
          }
          await dbPut('notes', {
            id: uid(),
            title: body.querySelector('#note-title').value.trim() || 'Note rapide',
            content,
            date: todayISO()
          });
          closeModal();
          showToast('Note enregistrée.');
        });
      }
    });
  }

  /* ========================================================================
     Section Renderers (All 13 Sections)
     ======================================================================== */
  function computeStats() {
    const tasks = state.data.tasks;
    const completedTasks = tasks.filter((t) => t.completed);
    const remainingTasks = tasks.filter((t) => !t.completed);
    const today = todayISO();
    const overdueTasks = remainingTasks.filter((t) => t.dueDate && t.dueDate < today);
    const urgentTasks = remainingTasks.filter((t) => t.priority === 'urgent');
    const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

    const focusSessions = state.data.focusSessions;
    const focusMinutes = focusSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

    const studyMinutes = state.data.studyItems.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
    const businessMinutes = state.data.businessItems.reduce((acc, b) => acc + (Number(b.minutes) || 0), 0);
    const torahMinutes = state.data.torahEntries.reduce((acc, t) => acc + (Number(t.minutes) || 0), 0);

    const achievedGoals = state.data.goals.filter((g) => Number(g.progress) >= 100).length;
    const habitCompletions = state.data.habits.reduce((acc, h) => acc + ((h.history && h.history.length) || 0), 0);

    return {
      totalTasks: tasks.length,
      completedCount: completedTasks.length,
      remainingCount: remainingTasks.length,
      overdueTasks,
      urgentTasks,
      remainingTasks,
      completionRate,
      focusSessionsCount: focusSessions.length,
      focusMinutes,
      studyMinutes,
      businessMinutes,
      torahMinutes,
      achievedGoals,
      habitCompletions
    };
  }

  function renderDashboard() {
    const el = document.getElementById('section-dashboard');
    const stats = computeStats();
    const greetingName = state.prefs.userName ? `, ${escapeHTML(state.prefs.userName)}` : '';
    const todayEvents = state.data.events
      .filter((e) => e.date === todayISO())
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const nextEvent = todayEvents[0];

    const upcomingTasks = stats.remainingTasks.slice(0, 5);
    const upcomingDeadlines = [...stats.remainingTasks]
      .filter((t) => t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);

    el.innerHTML = `
      <div class="dashboard-top-grid">
        <div class="card">
          <div class="card-header" style="margin-bottom:10px">
            <div>
              <h2 class="section-heading" style="font-size:1.35rem">Bonjour${greetingName}</h2>
              <p class="section-subtitle">${escapeHTML(formatDateFR(new Date()))} — Centre de commande LIFE-OS</p>
            </div>
            <span class="badge badge-cyan">Progression : ${stats.completionRate}%</span>
          </div>

          <div class="progress-track" style="margin-bottom:16px">
            <div class="progress-fill" style="width:${stats.completionRate}%"></div>
          </div>

          <div class="kpi-label" style="margin-bottom:8px">Actions rapides</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
            <button type="button" class="btn btn-primary btn-sm" id="qa-add-task">+ Ajouter une tâche</button>
            <button type="button" class="btn btn-secondary btn-sm" id="qa-add-event">+ Ajouter un événement</button>
            <button type="button" class="btn btn-secondary btn-sm" id="qa-start-focus">▶ Démarrer Focus</button>
            <button type="button" class="btn btn-secondary btn-sm" id="qa-add-note">✎ Ajouter une note</button>
            <button type="button" class="btn btn-ghost btn-sm" id="qa-open-calendar">Consulter le calendrier</button>
          </div>

          <div class="grid-4" style="gap:10px">
            <div class="card" style="padding:12px;background:var(--bg-card-elevated)">
              <div class="kpi-label">Taux réalisation</div>
              <div class="kpi-value" style="font-size:1.3rem">${stats.completionRate}%</div>
              <div class="kpi-sub">${stats.completedCount}/${stats.totalTasks} tâches</div>
            </div>
            <div class="card" style="padding:12px;background:var(--bg-card-elevated)">
              <div class="kpi-label">Tâches restantes</div>
              <div class="kpi-value" style="font-size:1.3rem">${stats.remainingCount}</div>
              <div class="kpi-sub">${stats.overdueTasks.length} en retard</div>
            </div>
            <div class="card" style="padding:12px;background:var(--bg-card-elevated)">
              <div class="kpi-label">Sessions Focus</div>
              <div class="kpi-value" style="font-size:1.3rem">${stats.focusSessionsCount}</div>
              <div class="kpi-sub">${stats.focusMinutes} min cumulées</div>
            </div>
            <div class="card" style="padding:12px;background:var(--bg-card-elevated)">
              <div class="kpi-label">Temps domaines</div>
              <div class="kpi-value" style="font-size:1.3rem">${stats.studyMinutes + stats.businessMinutes + stats.torahMinutes}m</div>
              <div class="kpi-sub">Études · Biz · Torah</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Minuteur Focus</h3>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-go-focus-full">Ouvrir Mode Focus</button>
          </div>
          ${renderTimerWidgetHTML(true)}
        </div>
      </div>

      <div class="dashboard-main-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Vue quotidienne — Prochaines tâches & urgences</h3>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-go-tasks">Voir tout</button>
          </div>
          ${
            upcomingTasks.length
              ? `<div class="item-list">${upcomingTasks
                  .map(
                    (t) => `
                  <div class="list-row">
                    <div class="list-row-main">
                      <button type="button" class="task-checkbox ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}" aria-label="Marquer comme terminée">${t.completed ? '✓' : ''}</button>
                      <div>
                        <div class="row-title ${t.completed ? 'completed' : ''}">${escapeHTML(t.title)}</div>
                        <div class="row-meta">
                          <span class="badge ${t.priority === 'urgent' ? 'badge-urgent' : t.priority === 'high' ? 'badge-high' : 'badge-normal'}">${escapeHTML(t.priority || 'normal')}</span>
                          ${t.domain ? `<span>${escapeHTML(t.domain)}</span>` : ''}
                          ${t.dueDate ? `<span>· Échéance ${escapeHTML(t.dueDate)}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join('')}</div>`
              : `<div class="empty-state">
                  <div class="empty-state-title">Aucune tâche en attente</div>
                  <div class="empty-state-desc">Ajoutez votre première tâche pour démarrer le pilotage quotidien.</div>
                  <button type="button" class="btn btn-primary btn-sm" id="empty-dash-add-task">+ Créer une tâche</button>
                </div>`
          }
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Prochain événement, retards & échéances</h3>
          </div>
          <div style="margin-bottom:14px;padding:10px 12px;border-radius:var(--radius-md);background:var(--bg-card-elevated);border:1px solid var(--border-subtle)">
            <div class="kpi-label">Prochain événement du jour</div>
            ${
              nextEvent
                ? `<div style="font-weight:700;margin-top:3px">${escapeHTML(nextEvent.title)}</div><div class="kpi-sub">${escapeHTML(nextEvent.startTime || '')} – ${escapeHTML(nextEvent.endTime || '')} · ${escapeHTML(nextEvent.category || '')}</div>`
                : `<div class="kpi-sub" style="margin-top:3px">Aucun événement planifié aujourd'hui.</div>`
            }
          </div>

          <div class="kpi-label" style="margin-bottom:6px">Activités en retard (${stats.overdueTasks.length})</div>
          ${
            stats.overdueTasks.length
              ? `<div class="item-list" style="margin-bottom:12px">${stats.overdueTasks
                  .slice(0, 3)
                  .map(
                    (t) => `<div class="list-row" style="padding:8px 12px;border-color:rgba(239,68,68,0.35)"><span class="row-title" style="font-size:0.84rem">${escapeHTML(t.title)}</span><span class="badge badge-urgent">${escapeHTML(t.dueDate)}</span></div>`
                  )
                  .join('')}</div>`
              : `<div class="kpi-sub" style="margin-bottom:12px">Aucune activité en retard.</div>`
          }

          <div class="kpi-label" style="margin-bottom:6px">Prochaines échéances</div>
          ${
            upcomingDeadlines.length
              ? `<div class="item-list">${upcomingDeadlines
                  .map(
                    (t) => `<div class="list-row" style="padding:8px 12px"><span class="row-title" style="font-size:0.84rem">${escapeHTML(t.title)}</span><span class="badge badge-cyan">${escapeHTML(t.dueDate)}</span></div>`
                  )
                  .join('')}</div>`
              : `<div class="kpi-sub">Aucune échéance enregistrée.</div>`
          }
        </div>
      </div>
    `;

    bindTimerEvents(el);
    el.querySelector('#qa-add-task')?.addEventListener('click', () => openTaskModal());
    el.querySelector('#empty-dash-add-task')?.addEventListener('click', () => openTaskModal());
    el.querySelector('#qa-add-event')?.addEventListener('click', () => openEventModal());
    el.querySelector('#qa-start-focus')?.addEventListener('click', () => {
      startTimer();
      showToast('Session Focus démarrée.');
    });
    el.querySelector('#qa-add-note')?.addEventListener('click', openQuickNoteModal);
    el.querySelector('#qa-open-calendar')?.addEventListener('click', () => navigateTo('planning'));
    el.querySelector('#btn-go-focus-full')?.addEventListener('click', () => navigateTo('focus'));
    el.querySelector('#btn-go-tasks')?.addEventListener('click', () => navigateTo('tasks'));
    bindTaskToggleButtons(el);
  }

  function bindTaskToggleButtons(root) {
    root.querySelectorAll('[data-toggle-task]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle-task');
        const t = state.data.tasks.find((x) => x.id === id);
        if (!t) return;
        await dbPut('tasks', { ...t, completed: !t.completed });
      });
    });
  }

  function renderTasksSection() {
    const el = document.getElementById('section-tasks');
    const tasks = state.data.tasks;
    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Gestion des tâches</h2>
          <p class="section-subtitle">Création, modification, priorités, échéances et suivi de réalisation.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-new-task-page">+ Nouvelle tâche</button>
      </div>
      <div class="card">
        ${
          tasks.length
            ? `<div class="item-list">${tasks
                .map(
                  (t) => `
                <div class="list-row">
                  <div class="list-row-main">
                    <button type="button" class="task-checkbox ${t.completed ? 'checked' : ''}" data-toggle-task="${t.id}">${t.completed ? '✓' : ''}</button>
                    <div>
                      <div class="row-title ${t.completed ? 'completed' : ''}">${escapeHTML(t.title)}</div>
                      <div class="row-meta">
                        <span class="badge ${t.priority === 'urgent' ? 'badge-urgent' : t.priority === 'high' ? 'badge-high' : 'badge-normal'}">${escapeHTML(t.priority || 'normal')}</span>
                        ${t.domain ? `<span class="badge badge-cyan">${escapeHTML(t.domain)}</span>` : ''}
                        ${t.dueDate ? `<span>Échéance : ${escapeHTML(t.dueDate)}</span>` : ''}
                        ${t.estimatedMin ? `<span>· ${escapeHTML(String(t.estimatedMin))} min</span>` : ''}
                      </div>
                      ${t.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(t.notes)}</div>` : ''}
                    </div>
                  </div>
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-sm" data-edit-task="${t.id}">Modifier</button>
                    <button type="button" class="btn btn-danger btn-sm" data-del-task="${t.id}">Supprimer</button>
                  </div>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune tâche enregistrée</div>
                <div class="empty-state-desc">Commencez par créer une tâche liée à vos priorités (BTS OL, ORPAZ-STYLE, Torah...).</div>
                <button type="button" class="btn btn-primary btn-sm" id="btn-empty-task">+ Ajouter une tâche</button>
              </div>`
        }
      </div>
    `;
    el.querySelector('#btn-new-task-page')?.addEventListener('click', () => openTaskModal());
    el.querySelector('#btn-empty-task')?.addEventListener('click', () => openTaskModal());
    bindTaskToggleButtons(el);
    el.querySelectorAll('[data-edit-task]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = state.data.tasks.find((x) => x.id === btn.getAttribute('data-edit-task'));
        if (t) openTaskModal(t);
      });
    });
    el.querySelectorAll('[data-del-task]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = state.data.tasks.find((x) => x.id === btn.getAttribute('data-del-task'));
        if (t) confirmDelete(t.title, () => dbDelete('tasks', t.id));
      });
    });
  }

  function renderPlanningSection() {
    const el = document.getElementById('section-planning');
    const dateStr = state.planningDate || todayISO();
    const dayEvents = state.data.events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const overlapIds = detectOverlaps(dayEvents);

    let viewContentHTML = '';
    if (state.planningView === 'day') {
      viewContentHTML = dayEvents.length
        ? `<div class="item-list">${dayEvents
            .map((ev) => {
              const protectedFlag = isReligiousOrProtected(ev);
              const isOverlap = overlapIds.has(ev.id);
              return `
                <div class="planning-block ${protectedFlag ? 'locked' : ''} ${isOverlap ? 'overlap' : ''}">
                  <div>
                    <div style="font-weight:700;font-size:0.9rem">
                      <span style="font-family:var(--font-mono);color:var(--accent);margin-right:6px">${escapeHTML(ev.startTime || '--:--')} – ${escapeHTML(ev.endTime || '--:--')}</span>
                      ${escapeHTML(ev.title)}
                    </div>
                    <div class="row-meta">
                      <span class="badge badge-cyan">${escapeHTML(ev.category || 'Bloc')}</span>
                      ${protectedFlag ? `<span class="badge badge-high">Protégé (non déplacé auto)</span>` : ''}
                      ${isOverlap ? `<span class="badge badge-urgent">Chevauchement</span>` : ''}
                      ${ev.travelMin ? `<span>Déplacement : ${ev.travelMin} min</span>` : ''}
                      ${ev.bufferMin ? `<span>· Tampon : ${ev.bufferMin} min</span>` : ''}
                      ${ev.recurring && ev.recurring !== 'none' ? `<span>· Récurrent (${ev.recurring})</span>` : ''}
                    </div>
                  </div>
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-sm" data-edit-ev="${ev.id}">Modifier</button>
                    <button type="button" class="btn btn-danger btn-sm" data-del-ev="${ev.id}">Suppr.</button>
                  </div>
                </div>
              `;
            })
            .join('')}</div>`
        : `<div class="empty-state">
            <div class="empty-state-title">Aucun créneau planifié pour le ${escapeHTML(dateStr)}</div>
            <div class="empty-state-desc">Ajoutez un bloc horaire ou lancez l'organisation intelligente des créneaux (repas, repos, priorités, déplacements).</div>
          </div>`;
    } else if (state.planningView === 'week') {
      const base = new Date(dateStr + 'T12:00:00');
      const dayOfWeek = (base.getDay() + 6) % 7;
      const monday = new Date(base);
      monday.setDate(base.getDate() - dayOfWeek);
      const cols = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const evs = state.data.events.filter((e) => e.date === iso).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        cols.push(`
          <div class="week-day-col">
            <div class="week-day-header">
              <span>${d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span>${d.getDate()}/${d.getMonth() + 1}</span>
            </div>
            ${
              evs.length
                ? evs.map((e) => `<div style="padding:6px 8px;margin-bottom:6px;border-radius:8px;background:var(--bg-card);border-left:3px solid var(--accent);font-size:0.76rem"><strong>${escapeHTML(e.startTime || '')}</strong> ${escapeHTML(e.title)}</div>`).join('')
                : `<div class="kpi-sub">Libre</div>`
            }
          </div>
        `);
      }
      viewContentHTML = `<div class="week-grid">${cols.join('')}</div>`;
    } else {
      const d = new Date(dateStr + 'T12:00:00');
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startPad = (firstDay.getDay() + 6) % 7;
      const cells = [];
      for (let i = 0; i < startPad; i++) {
        cells.push(`<div class="month-cell" style="opacity:0.35"></div>`);
      }
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = state.data.events.filter((e) => e.date === iso).length;
        cells.push(`
          <div class="month-cell ${iso === todayISO() ? 'today' : ''}">
            <div style="font-weight:700">${day}</div>
            ${count ? `<span class="badge badge-cyan" style="margin-top:6px">${count} bloc(s)</span>` : ''}
          </div>
        `);
      }
      viewContentHTML = `<div class="month-grid">${cells.join('')}</div>`;
    }

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Planning intelligent</h2>
          <p class="section-subtitle">Créneaux organisés avec priorités, repas, hygiène, sport, sommeil, déplacements et tampons.</p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <input type="date" id="planning-date-input" class="form-input" style="width:auto" value="${escapeHTML(dateStr)}" />
          <button type="button" class="btn btn-secondary btn-sm" id="btn-smart-schedule">✦ Auto-planifier la journée</button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-add-planning-block">+ Bloc horaire</button>
        </div>
      </div>

      <div class="tabs-bar">
        <button type="button" class="tab-pill ${state.planningView === 'day' ? 'active' : ''}" data-pview="day">Vue quotidienne</button>
        <button type="button" class="tab-pill ${state.planningView === 'week' ? 'active' : ''}" data-pview="week">Vue hebdomadaire</button>
        <button type="button" class="tab-pill ${state.planningView === 'month' ? 'active' : ''}" data-pview="month">Vue mensuelle</button>
      </div>

      <div class="card">
        ${viewContentHTML}
      </div>
    `;

    el.querySelector('#planning-date-input')?.addEventListener('change', (e) => {
      state.planningDate = e.target.value || todayISO();
      renderPlanningSection();
    });
    el.querySelector('#btn-add-planning-block')?.addEventListener('click', () => openEventModal(null, dateStr));
    el.querySelector('#btn-smart-schedule')?.addEventListener('click', () => runSmartAutoSchedule(dateStr));
    el.querySelectorAll('[data-pview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.planningView = btn.getAttribute('data-pview');
        renderPlanningSection();
      });
    });
    el.querySelectorAll('[data-edit-ev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ev = state.data.events.find((x) => x.id === btn.getAttribute('data-edit-ev'));
        if (ev) openEventModal(ev);
      });
    });
    el.querySelectorAll('[data-del-ev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ev = state.data.events.find((x) => x.id === btn.getAttribute('data-del-ev'));
        if (!ev) return;
        if (isReligiousOrProtected(ev)) {
          confirmDelete(`${ev.title} (événement protégé)`, () => dbDelete('events', ev.id));
        } else {
          confirmDelete(ev.title, () => dbDelete('events', ev.id));
        }
      });
    });
  }

  function renderFocusSection() {
    const el = document.getElementById('section-focus');
    const sessions = state.data.focusSessions;
    const totalMin = sessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Mode Focus — Minuteur professionnel</h2>
          <p class="section-subtitle">Précis même en arrière-plan, avec suivi des sessions et statistiques réelles.</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-focus-fullscreen">Plein écran</button>
      </div>

      <div class="grid-2">
        <div class="card">
          ${renderTimerWidgetHTML(false)}
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Historique & concentration</h3>
            <span class="badge badge-cyan">${totalMin} min au total</span>
          </div>
          ${
            sessions.length
              ? `<div class="item-list">${sessions
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map(
                    (s) => `
                  <div class="list-row">
                    <div>
                      <div class="row-title">${escapeHTML(s.taskTitle || 'Session Focus')}</div>
                      <div class="row-meta">${escapeHTML(s.date || '')} · ${escapeHTML(getModeLabelFR(s.mode))}</div>
                    </div>
                    <span class="badge badge-cyan">${escapeHTML(String(s.durationMinutes))} min</span>
                  </div>
                `
                  )
                  .join('')}</div>`
              : `<div class="empty-state">
                  <div class="empty-state-title">Aucune session Focus enregistrée</div>
                  <div class="empty-state-desc">Lancez un minuteur ou un chronomètre pour enregistrer votre temps de concentration.</div>
                </div>`
          }
        </div>
      </div>
    `;

    bindTimerEvents(el);
    el.querySelector('#btn-toggle-focus-fullscreen')?.addEventListener('click', () => {
      document.body.classList.toggle('focus-fullscreen');
    });
  }

  function renderStudiesSection() {
    const el = document.getElementById('section-studies');
    const subj = state.studySubject || BTS_SUBJECTS[0];
    const items = state.data.studyItems.filter((x) => x.subject === subj);

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Études — BTS Opticien-Lunétier</h2>
          <p class="section-subtitle">Chapitres, cours, fiches de révision, séances, exercices, notes, résultats et difficultés.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-study-item">+ Ajouter un élément d'étude</button>
      </div>

      <div class="tabs-bar">
        ${BTS_SUBJECTS.map(
          (s) => `<button type="button" class="tab-pill ${s === subj ? 'active' : ''}" data-study-subj="${escapeHTML(s)}">${escapeHTML(s)}</button>`
        ).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${escapeHTML(subj)}</h3>
          <span class="badge badge-cyan">${items.length} entrée(s)</span>
        </div>
        ${
          items.length
            ? `<div class="item-list">${items
                .map(
                  (it) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">${escapeHTML(it.chapter || it.title || 'Chapitre')} <span class="badge badge-cyan">${escapeHTML(it.type || 'Cours')}</span></div>
                    <div class="row-meta">
                      <span>Progression : ${escapeHTML(String(it.progress || 0))}%</span>
                      ${it.minutes ? `<span>· Temps : ${escapeHTML(String(it.minutes))} min</span>` : ''}
                      ${it.score ? `<span>· Résultat : ${escapeHTML(it.score)}</span>` : ''}
                      ${it.reviewDate ? `<span>· Révision prévue : ${escapeHTML(it.reviewDate)}</span>` : ''}
                    </div>
                    ${it.difficulty ? `<div class="kpi-sub" style="color:#fbbf24;margin-top:4px">Difficulté : ${escapeHTML(it.difficulty)}</div>` : ''}
                    ${it.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(it.notes)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger btn-sm" data-del-study="${it.id}">Suppr.</button>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune donnée pour ${escapeHTML(subj)}</div>
                <div class="empty-state-desc">Ajoutez un chapitre, une fiche de révision, un exercice ou un résultat d'examen.</div>
              </div>`
        }
      </div>
    `;

    el.querySelectorAll('[data-study-subj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.studySubject = btn.getAttribute('data-study-subj');
        renderStudiesSection();
      });
    });

    el.querySelector('#btn-add-study-item')?.addEventListener('click', () => {
      openModal({
        title: `Nouvel élément — ${subj}`,
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="st-chap">Chapitre / Titre *</label>
            <input id="st-chap" class="form-input" type="text" placeholder="Ex. Vergence et systèmes centrés" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="st-type">Type</label>
              <select id="st-type" class="form-select">
                ${['Chapitre', 'Cours', 'Fiche de révision', 'Séance de travail', 'Exercice', 'Résultat / Note'].map((t) => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="st-prog">Progression (%)</label>
              <input id="st-prog" class="form-input" type="number" min="0" max="100" value="0" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="st-min">Temps d'étude (min)</label>
              <input id="st-min" class="form-input" type="number" min="0" value="45" />
            </div>
            <div class="form-group">
              <label class="form-label" for="st-rev">Révision programmée</label>
              <input id="st-rev" class="form-input" type="date" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="st-diff">Difficultés rencontrées</label>
            <input id="st-diff" class="form-input" type="text" placeholder="Points à retravailler..." />
          </div>
          <div class="form-group">
            <label class="form-label" for="st-notes">Notes / Résultat</label>
            <textarea id="st-notes" class="form-textarea" placeholder="Synthèse, formule ou note obtenue..."></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-study" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-study').addEventListener('click', async () => {
            const chapter = body.querySelector('#st-chap').value.trim();
            if (!chapter) {
              showToast('Veuillez saisir un chapitre ou titre.', 'error');
              return;
            }
            await dbPut('studyItems', {
              id: uid(),
              subject: subj,
              chapter,
              type: body.querySelector('#st-type').value,
              progress: Number(body.querySelector('#st-prog').value) || 0,
              minutes: Number(body.querySelector('#st-min').value) || 0,
              reviewDate: body.querySelector('#st-rev').value,
              difficulty: body.querySelector('#st-diff').value.trim(),
              notes: body.querySelector('#st-notes').value.trim()
            });
            closeModal();
            showToast('Élément d'étude enregistré.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-study]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-study');
        const item = state.data.studyItems.find((x) => x.id === id);
        if (item) confirmDelete(item.chapter, () => dbDelete('studyItems', id));
      });
    });
  }

  function renderBusinessSection() {
    const el = document.getElementById('section-business');
    const filter = state.businessTab;
    const filtered = state.data.businessItems.filter((b) => {
      if (filter === 'judaica') return b.responsibility === 'Judaïca';
      if (filter === 'father') return b.responsibility === 'Activités du père';
      return true;
    });

    const totalRevenue = state.data.businessItems.reduce((acc, b) => acc + (Number(b.revenue) || 0), 0);

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Business — ORPAZ-STYLE.COM</h2>
          <p class="section-subtitle">Bijouterie or/argent, achat-revente d'or, Judaïca, Kippot sur mesure, e-commerce, commandes & séparation des responsabilités.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-biz">+ Nouvelle entrée Business</button>
      </div>

      <div class="grid-3" style="margin-bottom:16px">
        <div class="card">
          <div class="kpi-label">Chiffre d'affaires saisi</div>
          <div class="kpi-value">${totalRevenue.toLocaleString('fr-FR')} €</div>
          <div class="kpi-sub">Calculé uniquement sur vos saisies réelles</div>
        </div>
        <div class="card">
          <div class="kpi-label">Périmètre Judaïca</div>
          <div class="kpi-value">${state.data.businessItems.filter((b) => b.responsibility === 'Judaïca').length}</div>
          <div class="kpi-sub">Éléments dédiés Judaïca</div>
        </div>
        <div class="card">
          <div class="kpi-label">Activités du père</div>
          <div class="kpi-value">${state.data.businessItems.filter((b) => b.responsibility === 'Activités du père').length}</div>
          <div class="kpi-sub">Périmètre distinct clairement séparé</div>
        </div>
      </div>

      <div class="tabs-bar">
        <button type="button" class="tab-pill ${filter === 'all' ? 'active' : ''}" data-btab="all">Tout ORPAZ-STYLE</button>
        <button type="button" class="tab-pill ${filter === 'judaica' ? 'active' : ''}" data-btab="judaica">Responsabilité : Judaïca</button>
        <button type="button" class="tab-pill ${filter === 'father' ? 'active' : ''}" data-btab="father">Responsabilité : Activités du père</button>
      </div>

      <div class="card">
        ${
          filtered.length
            ? `<div class="item-list">${filtered
                .map(
                  (b) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">${escapeHTML(b.title)} <span class="badge badge-cyan">${escapeHTML(b.activity || 'ORPAZ-STYLE')}</span></div>
                    <div class="row-meta">
                      <span>Type : ${escapeHTML(b.entryType || 'Projet')}</span>
                      <span>· Périmètre : <strong>${escapeHTML(b.responsibility || 'Judaïca')}</strong></span>
                      ${b.status ? `<span>· Statut : ${escapeHTML(b.status)}</span>` : ''}
                      ${Number(b.revenue) ? `<span>· CA : ${Number(b.revenue).toLocaleString('fr-FR')} €</span>` : ''}
                    </div>
                    ${b.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(b.notes)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger btn-sm" data-del-biz="${b.id}">Suppr.</button>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune entrée Business enregistrée</div>
                <div class="empty-state-desc">Ajoutez un produit, une commande, un fournisseur, un objectif commercial ou une décision pour ORPAZ-STYLE.COM.</div>
              </div>`
        }
      </div>
    `;

    el.querySelectorAll('[data-btab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.businessTab = btn.getAttribute('data-btab');
        renderBusinessSection();
      });
    });

    el.querySelector('#btn-add-biz')?.addEventListener('click', () => {
      openModal({
        title: 'Nouvelle entrée — ORPAZ-STYLE.COM',
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="biz-title">Titre / Référence *</label>
            <input id="biz-title" class="form-input" type="text" placeholder="Ex. Collection Kippot sur mesure / Commande client" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="biz-act">Activité</label>
              <select id="biz-act" class="form-select">
                ${BUSINESS_ACTIVITIES.map((a) => `<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-type">Catégorie</label>
              <select id="biz-type" class="form-select">
                ${['Projet', 'Tâche commerciale', 'Produit', 'Fournisseur', 'Client', 'Prospect', 'Commande', 'Objectif commercial', 'Décision / Note'].map((t) => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="biz-resp">Séparation des responsabilités</label>
              <select id="biz-resp" class="form-select">
                <option value="Judaïca">Judaïca</option>
                <option value="Activités du père">Activités du père</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="biz-rev">Montant / CA (€ réel)</label>
              <input id="biz-rev" class="form-input" type="number" min="0" step="0.01" placeholder="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="biz-notes">Notes, suivi d'action ou décision</label>
            <textarea id="biz-notes" class="form-textarea"></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-biz" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-biz').addEventListener('click', async () => {
            const title = body.querySelector('#biz-title').value.trim();
            if (!title) {
              showToast('Veuillez saisir un titre.', 'error');
              return;
            }
            await dbPut('businessItems', {
              id: uid(),
              title,
              activity: body.querySelector('#biz-act').value,
              entryType: body.querySelector('#biz-type').value,
              responsibility: body.querySelector('#biz-resp').value,
              revenue: Number(body.querySelector('#biz-rev').value) || 0,
              notes: body.querySelector('#biz-notes').value.trim(),
              date: todayISO()
            });
            closeModal();
            showToast('Entrée Business enregistrée.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-biz]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-biz');
        const item = state.data.businessItems.find((x) => x.id === id);
        if (item) confirmDelete(item.title, () => dbDelete('businessItems', id));
      });
    });
  }

  function renderTorahSection() {
    const el = document.getElementById('section-torah');
    const sec = state.torahSection || TORAH_SECTIONS[0];
    const entries = state.data.torahEntries.filter((e) => e.section === sec);
    const tCfg = state.prefs.torahConfig;

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Torah & Vie spirituelle</h2>
          <p class="section-subtitle">Suivi quotidien, historique, objectifs, temps consacré, lectures, horaires & Shabbat.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-torah">+ Nouvelle entrée Torah</button>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="margin-bottom:8px">
          <h3 class="card-title">Paramétrage localisation, horaires & Shabbat</h3>
          <span class="badge badge-cyan">Sans horaire inventé</span>
        </div>
        <div class="kpi-sub">
          Localisation : <strong>${escapeHTML(tCfg.locationName || 'Non renseignée')}</strong>
          ${tCfg.manualPrayerTimes ? ` · Horaires saisis : <strong>${escapeHTML(tCfg.manualPrayerTimes)}</strong>` : ' · Saisissez vos horaires de prière manuellement dans les Paramètres ou ci-dessous.'}
        </div>
        <div class="kpi-sub" style="margin-top:4px;color:#fbbf24">${escapeHTML(tCfg.shabbatNotice)}</div>
      </div>

      <div class="tabs-bar">
        ${TORAH_SECTIONS.map(
          (s) => `<button type="button" class="tab-pill ${s === sec ? 'active' : ''}" data-tsec="${escapeHTML(s)}">${escapeHTML(s)}</button>`
        ).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${escapeHTML(sec)}</h3>
          <span class="badge badge-cyan">${entries.length} entrée(s)</span>
        </div>
        ${
          entries.length
            ? `<div class="item-list">${entries
                .map(
                  (en) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">${escapeHTML(en.title || sec)}</div>
                    <div class="row-meta">
                      <span>Date : ${escapeHTML(en.date || '')}</span>
                      ${en.minutes ? `<span>· Temps : ${escapeHTML(String(en.minutes))} min</span>` : ''}
                      ${en.progress ? `<span>· Avancement : ${escapeHTML(en.progress)}</span>` : ''}
                    </div>
                    ${en.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(en.notes)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger btn-sm" data-del-torah="${en.id}">Suppr.</button>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune entrée pour ${escapeHTML(sec)}</div>
                <div class="empty-state-desc">Ajoutez votre suivi quotidien, votre progression de lecture ou vos notes personnelles.</div>
              </div>`
        }
      </div>
    `;

    el.querySelectorAll('[data-tsec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.torahSection = btn.getAttribute('data-tsec');
        renderTorahSection();
      });
    });

    el.querySelector('#btn-add-torah')?.addEventListener('click', () => {
      openModal({
        title: `Nouvelle entrée — ${sec}`,
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="tr-title">Sujet / Passage *</label>
            <input id="tr-title" class="form-input" type="text" placeholder="Ex. Daf / Chapitre / Tefila" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="tr-date">Date</label>
              <input id="tr-date" class="form-input" type="date" value="${todayISO()}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="tr-min">Temps consacré (min)</label>
              <input id="tr-min" class="form-input" type="number" min="0" value="30" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="tr-prog">Progression de lecture / Objectif</label>
            <input id="tr-prog" class="form-input" type="text" placeholder="Ex. Page 42b / Chapitre 12" />
          </div>
          <div class="form-group">
            <label class="form-label" for="tr-notes">Notes personnelles</label>
            <textarea id="tr-notes" class="form-textarea"></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-torah" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-torah').addEventListener('click', async () => {
            const title = body.querySelector('#tr-title').value.trim();
            if (!title) {
              showToast('Veuillez saisir un sujet ou passage.', 'error');
              return;
            }
            await dbPut('torahEntries', {
              id: uid(),
              section: sec,
              title,
              date: body.querySelector('#tr-date').value || todayISO(),
              minutes: Number(body.querySelector('#tr-min').value) || 0,
              progress: body.querySelector('#tr-prog').value.trim(),
              notes: body.querySelector('#tr-notes').value.trim()
            });
            closeModal();
            showToast('Entrée Torah enregistrée.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-torah]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-torah');
        const item = state.data.torahEntries.find((x) => x.id === id);
        if (item) confirmDelete(item.title, () => dbDelete('torahEntries', id));
      });
    });
  }

  function renderPersonalSection() {
    const el = document.getElementById('section-personal');
    const sec = state.personalSection || PERSONAL_SECTIONS[0];
    const items = state.data.personalItems.filter((x) => x.section === sec);

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Vie personnelle</h2>
          <p class="section-subtitle">Sport, santé, hygiène, sommeil, vie administrative, objectifs et organisation quotidienne.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-personal">+ Ajouter un élément</button>
      </div>

      <div class="tabs-bar">
        ${PERSONAL_SECTIONS.map(
          (s) => `<button type="button" class="tab-pill ${s === sec ? 'active' : ''}" data-psec="${escapeHTML(s)}">${escapeHTML(s)}</button>`
        ).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${escapeHTML(sec)}</h3>
          <span class="badge badge-cyan">${items.length} entrée(s)</span>
        </div>
        ${
          items.length
            ? `<div class="item-list">${items
                .map(
                  (it) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">${escapeHTML(it.title)}</div>
                    <div class="row-meta">
                      <span>Date : ${escapeHTML(it.date || '')}</span>
                      ${it.metric ? `<span>· Repère : ${escapeHTML(it.metric)}</span>` : ''}
                    </div>
                    ${it.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(it.notes)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger btn-sm" data-del-pers="${it.id}">Suppr.</button>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune entrée dans ${escapeHTML(sec)}</div>
                <div class="empty-state-desc">Ajoutez un suivi ou une note pour ${escapeHTML(sec)}.</div>
              </div>`
        }
      </div>
    `;

    el.querySelectorAll('[data-psec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personalSection = btn.getAttribute('data-psec');
        renderPersonalSection();
      });
    });

    el.querySelector('#btn-add-personal')?.addEventListener('click', () => {
      openModal({
        title: `Nouvel élément — ${sec}`,
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="per-title">Titre *</label>
            <input id="per-title" class="form-input" type="text" placeholder="Ex. Séance course / Démarche administrative / Sommeil 7h30" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="per-date">Date</label>
              <input id="per-date" class="form-input" type="date" value="${todayISO()}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="per-metric">Durée / Valeur</label>
              <input id="per-metric" class="form-input" type="text" placeholder="Ex. 45 min / 7h30" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="per-notes">Notes</label>
            <textarea id="per-notes" class="form-textarea"></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-per" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-per').addEventListener('click', async () => {
            const title = body.querySelector('#per-title').value.trim();
            if (!title) {
              showToast('Veuillez saisir un titre.', 'error');
              return;
            }
            await dbPut('personalItems', {
              id: uid(),
              section: sec,
              title,
              date: body.querySelector('#per-date').value || todayISO(),
              metric: body.querySelector('#per-metric').value.trim(),
              notes: body.querySelector('#per-notes').value.trim()
            });
            closeModal();
            showToast('Élément enregistré.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-pers]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-pers');
        const item = state.data.personalItems.find((x) => x.id === id);
        if (item) confirmDelete(item.title, () => dbDelete('personalItems', id));
      });
    });
  }

  function renderCrmSection() {
    const el = document.getElementById('section-crm');
    const isPersonal = state.crmTab === 'personal';
    const storeName = isPersonal ? 'crmPersonal' : 'crmBusiness';
    const list = state.data[storeName] || [];

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">CRM Hybride</h2>
          <p class="section-subtitle">Deux espaces strictement séparés : CRM Personnel et CRM ORPAZ-STYLE.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-crm">+ Ajouter un contact / fiche</button>
      </div>

      <div class="tabs-bar">
        <button type="button" class="tab-pill ${isPersonal ? 'active' : ''}" data-crmtab="personal">CRM Personnel</button>
        <button type="button" class="tab-pill ${!isPersonal ? 'active' : ''}" data-crmtab="business">CRM ORPAZ-STYLE</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${isPersonal ? 'CRM Personnel (Contacts, Relations, Notes privées, Échanges)' : 'CRM ORPAZ-STYLE (Clients, Prospects, Fournisseurs, Partenaires, Opportunités)'}</h3>
          <span class="badge badge-cyan">${list.length} fiche(s)</span>
        </div>
        ${
          list.length
            ? `<div class="item-list">${list
                .map(
                  (c) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">${escapeHTML(c.name)} <span class="badge badge-cyan">${escapeHTML(c.category || c.relation || 'Contact')}</span></div>
                    <div class="row-meta">
                      ${c.contactInfo ? `<span>${escapeHTML(c.contactInfo)}</span>` : ''}
                      ${c.opportunity ? `<span>· Opportunité : ${escapeHTML(c.opportunity)}</span>` : ''}
                    </div>
                    ${c.notes ? `<div class="kpi-sub" style="margin-top:4px">${escapeHTML(c.notes)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger btn-sm" data-del-crm="${c.id}">Suppr.</button>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune fiche dans ${isPersonal ? 'le CRM Personnel' : 'le CRM ORPAZ-STYLE'}</div>
                <div class="empty-state-desc">Les données personnelles et professionnelles sont stockées séparément.</div>
              </div>`
        }
      </div>
    `;

    el.querySelectorAll('[data-crmtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.crmTab = btn.getAttribute('data-crmtab');
        renderCrmSection();
      });
    });

    el.querySelector('#btn-add-crm')?.addEventListener('click', () => {
      openModal({
        title: isPersonal ? 'Nouvelle fiche — CRM Personnel' : 'Nouvelle fiche — CRM ORPAZ-STYLE',
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="crm-name">Nom / Organisation *</label>
            <input id="crm-name" class="form-input" type="text" placeholder="${isPersonal ? 'Nom du contact' : 'Nom client / fournisseur / partenaire'}" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="crm-cat">${isPersonal ? 'Relation' : 'Type de fiche'}</label>
              <select id="crm-cat" class="form-select">
                ${
                  isPersonal
                    ? ['Famille', 'Ami', 'Mentor / Rabbin', 'Camarade BTS', 'Autre'].map((x) => `<option value="${x}">${x}</option>`).join('')
                    : ['Client', 'Prospect', 'Fournisseur', 'Partenaire'].map((x) => `<option value="${x}">${x}</option>`).join('')
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="crm-info">Coordonnées</label>
              <input id="crm-info" class="form-input" type="text" placeholder="Téléphone ou e-mail" />
            </div>
          </div>
          ${
            !isPersonal
              ? `<div class="form-group">
                  <label class="form-label" for="crm-opp">Opportunité / Historique commercial</label>
                  <input id="crm-opp" class="form-input" type="text" placeholder="Ex. Commande kippot / Devis bijouterie" />
                </div>`
              : ''
          }
          <div class="form-group">
            <label class="form-label" for="crm-notes">${isPersonal ? 'Notes privées & suivi des échanges' : 'Notes & suivi commercial'}</label>
            <textarea id="crm-notes" class="form-textarea"></textarea>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-crm" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-crm').addEventListener('click', async () => {
            const name = body.querySelector('#crm-name').value.trim();
            if (!name) {
              showToast('Veuillez saisir un nom.', 'error');
              return;
            }
            await dbPut(storeName, {
              id: uid(),
              name,
              category: body.querySelector('#crm-cat').value,
              relation: body.querySelector('#crm-cat').value,
              contactInfo: body.querySelector('#crm-info').value.trim(),
              opportunity: !isPersonal ? (body.querySelector('#crm-opp')?.value.trim() || '') : '',
              notes: body.querySelector('#crm-notes').value.trim()
            });
            closeModal();
            showToast('Fiche CRM enregistrée.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-crm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-crm');
        const item = (state.data[storeName] || []).find((x) => x.id === id);
        if (item) confirmDelete(item.name, () => dbDelete(storeName, id));
      });
    });
  }

  function computeStreak(history = []) {
    const set = new Set(history);
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (set.has(iso)) {
        streak += 1;
      } else if (i > 0) {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderHabitsSection() {
    const el = document.getElementById('section-habits');
    const habits = state.data.habits;
    const today = todayISO();

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Suivi des habitudes</h2>
          <p class="section-subtitle">Fréquence, historique, série de jours, objectifs et statistiques réelles.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-habit">+ Nouvelle habitude</button>
      </div>

      <div class="card">
        ${
          habits.length
            ? `<div class="item-list">${habits
                .map((h) => {
                  const hist = Array.isArray(h.history) ? h.history : [];
                  const doneToday = hist.includes(today);
                  const streak = computeStreak(hist);
                  return `
                    <div class="list-row">
                      <div class="list-row-main">
                        <button type="button" class="task-checkbox ${doneToday ? 'checked' : ''}" data-toggle-habit="${h.id}">${doneToday ? '✓' : ''}</button>
                        <div>
                          <div class="row-title">${escapeHTML(h.title)}</div>
                          <div class="row-meta">
                            <span class="badge badge-cyan">Fréquence : ${escapeHTML(h.frequency || 'Quotidienne')}</span>
                            <span>· Série : <strong>${streak} j</strong></span>
                            <span>· Total : ${hist.length} réalisation(s)</span>
                            ${h.goal ? `<span>· Objectif : ${escapeHTML(h.goal)}</span>` : ''}
                          </div>
                        </div>
                      </div>
                      <button type="button" class="btn btn-danger btn-sm" data-del-habit="${h.id}">Suppr.</button>
                    </div>
                  `;
                })
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune habitude suivie</div>
                <div class="empty-state-desc">Créez une habitude pour suivre votre régularité et votre série de jours.</div>
              </div>`
        }
      </div>
    `;

    el.querySelector('#btn-add-habit')?.addEventListener('click', () => {
      openModal({
        title: 'Nouvelle habitude',
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="hab-title">Nom de l'habitude *</label>
            <input id="hab-title" class="form-input" type="text" placeholder="Ex. Lecture / Sport / Étude quotidienne" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="hab-freq">Fréquence</label>
              <select id="hab-freq" class="form-select">
                <option value="Quotidienne">Quotidienne</option>
                <option value="Hebdomadaire">Hebdomadaire</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="hab-goal">Objectif</label>
              <input id="hab-goal" class="form-input" type="text" placeholder="Ex. 30 jours consécutifs" />
            </div>
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-habit" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-habit').addEventListener('click', async () => {
            const title = body.querySelector('#hab-title').value.trim();
            if (!title) {
              showToast('Veuillez saisir un nom d'habitude.', 'error');
              return;
            }
            await dbPut('habits', {
              id: uid(),
              title,
              frequency: body.querySelector('#hab-freq').value,
              goal: body.querySelector('#hab-goal').value.trim(),
              history: []
            });
            closeModal();
            showToast('Habitude ajoutée.');
          });
        }
      });
    });

    el.querySelectorAll('[data-toggle-habit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const h = state.data.habits.find((x) => x.id === btn.getAttribute('data-toggle-habit'));
        if (!h) return;
        const hist = new Set(Array.isArray(h.history) ? h.history : []);
        if (hist.has(today)) hist.delete(today);
        else hist.add(today);
        await dbPut('habits', { ...h, history: Array.from(hist) });
      });
    });

    el.querySelectorAll('[data-del-habit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = state.data.habits.find((x) => x.id === btn.getAttribute('data-del-habit'));
        if (h) confirmDelete(h.title, () => dbDelete('habits', h.id));
      });
    });
  }

  function renderGoalsSection() {
    const el = document.getElementById('section-goals');
    const goals = state.data.goals;
    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Objectifs</h2>
          <p class="section-subtitle">Suivi d'avancement des objectifs par domaine.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-add-goal">+ Nouvel objectif</button>
      </div>
      <div class="card">
        ${
          goals.length
            ? `<div class="item-list">${goals
                .map(
                  (g) => `
                <div class="list-row" style="flex-direction:column;align-items:stretch">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <div>
                      <div class="row-title">${escapeHTML(g.title)}</div>
                      <div class="row-meta">${escapeHTML(g.domain || '')} ${g.targetDate ? `· Échéance : ${escapeHTML(g.targetDate)}` : ''}</div>
                    </div>
                    <div class="row-actions">
                      <span class="badge badge-cyan">${escapeHTML(String(g.progress || 0))}%</span>
                      <button type="button" class="btn btn-danger btn-sm" data-del-goal="${g.id}">Suppr.</button>
                    </div>
                  </div>
                  <div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, Number(g.progress) || 0))}%"></div></div>
                </div>
              `
                )
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucun objectif défini</div>
                <div class="empty-state-desc">Ajoutez vos objectifs pour mesurer votre progression réelle.</div>
              </div>`
        }
      </div>
    `;

    el.querySelector('#btn-add-goal')?.addEventListener('click', () => {
      openModal({
        title: 'Nouvel objectif',
        bodyHTML: `
          <div class="form-group">
            <label class="form-label" for="goal-title">Intitulé *</label>
            <input id="goal-title" class="form-input" type="text" placeholder="Ex. Valider les modules BTS OL" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="goal-dom">Domaine</label>
              <input id="goal-dom" class="form-input" type="text" placeholder="BTS OL / ORPAZ-STYLE / Torah / Personnel" />
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-prog">Avancement (%)</label>
              <input id="goal-prog" class="form-input" type="number" min="0" max="100" value="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="goal-date">Date cible</label>
            <input id="goal-date" class="form-input" type="date" />
          </div>
        `,
        footerHTML: `
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="button" id="btn-save-goal" class="btn btn-primary">Enregistrer</button>
        `,
        onMount: (body, footer) => {
          footer.querySelector('#btn-save-goal').addEventListener('click', async () => {
            const title = body.querySelector('#goal-title').value.trim();
            if (!title) {
              showToast('Veuillez saisir un intitulé.', 'error');
              return;
            }
            await dbPut('goals', {
              id: uid(),
              title,
              domain: body.querySelector('#goal-dom').value.trim(),
              progress: Math.min(100, Math.max(0, Number(body.querySelector('#goal-prog').value) || 0)),
              targetDate: body.querySelector('#goal-date').value
            });
            closeModal();
            showToast('Objectif enregistré.');
          });
        }
      });
    });

    el.querySelectorAll('[data-del-goal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-goal');
        const g = state.data.goals.find((x) => x.id === id);
        if (g) confirmDelete(g.title, () => dbDelete('goals', id));
      });
    });
  }

  function renderAnalyticsSection() {
    const el = document.getElementById('section-analytics');
    const stats = computeStats();
    const hasAnyData = stats.totalTasks > 0 || stats.focusMinutes > 0 || stats.studyMinutes > 0 || stats.businessMinutes > 0 || stats.torahMinutes > 0 || stats.habitCompletions > 0;

    const domainBars = [
      { label: 'Études (BTS OL)', mins: stats.studyMinutes },
      { label: 'Business (ORPAZ-STYLE)', mins: stats.businessMinutes },
      { label: 'Torah', mins: stats.torahMinutes },
      { label: 'Concentration (Focus)', mins: stats.focusMinutes }
    ];
    const maxMins = Math.max(1, ...domainBars.map((d) => d.mins));

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Pilotage & Statistiques</h2>
          <p class="section-subtitle">Indicateurs calculés exclusivement à partir de vos données locales réelles.</p>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom:18px">
        <div class="card">
          <div class="kpi-label">Progression globale tâches</div>
          <div class="kpi-value">${stats.completionRate}%</div>
          <div class="kpi-sub">${stats.completedCount} terminées · ${stats.remainingCount} restantes · ${stats.overdueTasks.length} en retard</div>
        </div>
        <div class="card">
          <div class="kpi-label">Objectifs atteints</div>
          <div class="kpi-value">${stats.achievedGoals}</div>
          <div class="kpi-sub">Sur ${state.data.goals.length} objectif(s)</div>
        </div>
        <div class="card">
          <div class="kpi-label">Temps concentration</div>
          <div class="kpi-value">${stats.focusMinutes} min</div>
          <div class="kpi-sub">${stats.focusSessionsCount} session(s)</div>
        </div>
        <div class="card">
          <div class="kpi-label">Habitudes réalisées</div>
          <div class="kpi-value">${stats.habitCompletions}</div>
          <div class="kpi-sub">Cumul historique</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Répartition du temps par domaine (minutes enregistrées)</h3>
        </div>
        ${
          hasAnyData
            ? `<div class="item-list">${domainBars
                .map((b) => {
                  const pct = Math.round((b.mins / maxMins) * 100);
                  return `
                    <div>
                      <div style="display:flex;justify-content:space-between;font-size:0.84rem;margin-bottom:5px">
                        <strong>${escapeHTML(b.label)}</strong>
                        <span>${b.mins} min</span>
                      </div>
                      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
                    </div>
                  `;
                })
                .join('')}</div>`
            : `<div class="empty-state">
                <div class="empty-state-title">Aucune donnée statistique disponible pour le moment</div>
                <div class="empty-state-desc">Ajoutez des tâches, des séances d'étude, des entrées Torah, des sessions Focus ou des habitudes pour voir vos graphiques se remplir automatiquement.</div>
              </div>`
        }
      </div>
    `;
  }

  function renderSettingsSection() {
    const el = document.getElementById('section-settings');
    const p = state.prefs;

    el.innerHTML = `
      <div class="section-header-bar">
        <div>
          <h2 class="section-heading">Paramètres & Données Offline</h2>
          <p class="section-subtitle">Thème, hiérarchie des priorités, minuteur, Torah, sauvegarde JSON et architecture Notion.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Identité, Thème & Minuteur Focus</h3></div>
          <div class="form-group">
            <label class="form-label" for="pref-name">Prénom / Nom d'affichage (optionnel)</label>
            <input id="pref-name" class="form-input" type="text" value="${escapeHTML(p.userName || '')}" placeholder="Votre prénom" />
          </div>
          <div class="form-group">
            <label class="form-label" for="pref-theme">Thème graphique</label>
            <select id="pref-theme" class="form-select">
              <option value="dark" ${p.theme === 'dark' ? 'selected' : ''}>Mode sombre (Bleu nuit)</option>
              <option value="light" ${p.theme === 'light' ? 'selected' : ''}>Mode clair (Minimaliste)</option>
              <option value="auto" ${p.theme === 'auto' ? 'selected' : ''}>Mode automatique (Système)</option>
            </select>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="pref-work">Travail Focus (min)</label>
              <input id="pref-work" class="form-input" type="number" min="1" value="${p.focusConfig.workMin}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="pref-short">Pause courte (min)</label>
              <input id="pref-short" class="form-input" type="number" min="1" value="${p.focusConfig.shortBreakMin}" />
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="pref-long">Pause longue (min)</label>
              <input id="pref-long" class="form-input" type="number" min="1" value="${p.focusConfig.longBreakMin}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="pref-sound">Notification sonore</label>
              <select id="pref-sound" class="form-select">
                <option value="true" ${p.focusConfig.soundEnabled ? 'selected' : ''}>Activée</option>
                <option value="false" ${!p.focusConfig.soundEnabled ? 'selected' : ''}>Désactivée</option>
              </select>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-general-prefs">Enregistrer les préférences</button>
        </div>

        <div class="card">
          <div class="card-header"><h3 class="card-title">Hiérarchie des priorités personnelles</h3></div>
          <div class="item-list" style="margin-bottom:14px">
            ${p.priorities
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map(
                (pr, idx) => `
                <div class="list-row">
                  <div>
                    <div class="row-title">Priorité ${idx + 1} — ${escapeHTML(pr.title)}</div>
                    <div class="kpi-sub">${escapeHTML((pr.items || []).join(' · '))}</div>
                  </div>
                  <div class="row-actions">
                    <button type="button" class="btn btn-ghost btn-sm" data-move-prio="${pr.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="btn btn-ghost btn-sm" data-move-prio="${pr.id}" data-dir="1" ${idx === p.priorities.length - 1 ? 'disabled' : ''}>↓</button>
                  </div>
                </div>
              `
              )
              .join('')}
          </div>

          <div class="card-header" style="margin-top:14px"><h3 class="card-title">Torah — Localisation & Horaires manuels</h3></div>
          <div class="form-group">
            <label class="form-label" for="torah-loc">Ville / Localisation</label>
            <input id="torah-loc" class="form-input" type="text" value="${escapeHTML(p.torahConfig.locationName || '')}" placeholder="Ex. Paris, Jérusalem..." />
          </div>
          <div class="form-group">
            <label class="form-label" for="torah-times">Horaires de prière / repères (saisie manuelle)</label>
            <input id="torah-times" class="form-input" type="text" value="${escapeHTML(p.torahConfig.manualPrayerTimes || '')}" placeholder="Saisissez vos horaires vérifiés..." />
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-save-torah-prefs">Enregistrer les réglages Torah</button>
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Sauvegarde, Export & Import JSON</h3></div>
          <p class="kpi-sub" style="margin-bottom:12px">Toutes vos données sont stockées localement dans IndexedDB. Exportez régulièrement une sauvegarde JSON ou restaurez une archive.</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <button type="button" class="btn btn-primary btn-sm" id="btn-export-json">Exporter JSON complet</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer">
              Importer JSON
              <input type="file" id="input-import-json" accept="application/json,.json" style="display:none" />
            </label>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Architecture synchronisation Notion (Future)</h3>
            <span class="badge badge-cyan">Local uniquement actif</span>
          </div>
          <p class="kpi-sub" style="margin-bottom:10px">Aucune synchronisation Notion ou multi-appareil n'est active par défaut. Pour une future synchronisation sécurisée, passez exclusivement par un backend intermédiaire — jamais de clé API Notion dans le navigateur.</p>
          <div class="form-group">
            <label class="form-label" for="notion-proxy">URL backend proxy (optionnel, future intégration)</label>
            <input id="notion-proxy" class="form-input" type="url" value="${escapeHTML(p.notionSyncConfig.backendProxyUrl || '')}" placeholder="https://votre-backend.example/api/notion-sync" />
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-save-notion-cfg">Enregistrer la configuration proxy</button>
        </div>
      </div>
    `;

    el.querySelector('#btn-save-general-prefs')?.addEventListener('click', () => {
      state.prefs.userName = el.querySelector('#pref-name').value.trim();
      state.prefs.focusConfig.workMin = Math.max(1, Number(el.querySelector('#pref-work').value) || 25);
      state.prefs.focusConfig.shortBreakMin = Math.max(1, Number(el.querySelector('#pref-short').value) || 5);
      state.prefs.focusConfig.longBreakMin = Math.max(1, Number(el.querySelector('#pref-long').value) || 15);
      state.prefs.focusConfig.soundEnabled = el.querySelector('#pref-sound').value === 'true';
      applyTheme(el.querySelector('#pref-theme').value);
      savePrefs();
      if (state.timer.status === 'idle') {
        setTimerMode(state.timer.mode);
      }
      renderDashboard();
    });

    el.querySelectorAll('[data-move-prio]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-move-prio');
        const dir = Number(btn.getAttribute('data-dir'));
        const sorted = state.prefs.priorities.slice().sort((a, b) => a.rank - b.rank);
        const idx = sorted.findIndex((x) => x.id === id);
        const targetIdx = idx + dir;
        if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
        const temp = sorted[idx];
        sorted[idx] = sorted[targetIdx];
        sorted[targetIdx] = temp;
        sorted.forEach((item, i) => { item.rank = i + 1; });
        state.prefs.priorities = sorted;
        savePrefs();
        renderSettingsSection();
      });
    });

    el.querySelector('#btn-save-torah-prefs')?.addEventListener('click', () => {
      state.prefs.torahConfig.locationName = el.querySelector('#torah-loc').value.trim();
      state.prefs.torahConfig.manualPrayerTimes = el.querySelector('#torah-times').value.trim();
      savePrefs();
    });

    el.querySelector('#btn-save-notion-cfg')?.addEventListener('click', () => {
      state.prefs.notionSyncConfig.backendProxyUrl = el.querySelector('#notion-proxy').value.trim();
      savePrefs();
    });

    el.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const payload = {
        app: 'LIFE-OS',
        exportedAt: new Date().toISOString(),
        prefs: state.prefs,
        data: state.data
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LIFE-OS-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export JSON téléchargé.');
    });

    el.querySelector('#input-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !parsed.data) {
          throw new Error('Format JSON invalide pour LIFE-OS.');
        }
        for (const store of STORES) {
          if (Array.isArray(parsed.data[store])) {
            state.data[store] = [];
            if (state.db) {
              await new Promise((resolve, reject) => {
                const tx = state.db.transaction(store, 'readwrite');
                const objStore = tx.objectStore(store);
                objStore.clear();
                parsed.data[store].forEach((row) => objStore.put(row));
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
              });
            }
            state.data[store] = parsed.data[store];
          }
        }
        if (parsed.prefs) {
          state.prefs = { ...loadPrefs(), ...parsed.prefs };
          applyTheme(state.prefs.theme);
          savePrefs();
        }
        renderAll();
        showToast('Données restaurées depuis JSON.');
      } catch (err) {
        console.error('[LIFE-OS] Import JSON échoué:', err);
        showToast(`Échec de l'import : ${err.message}`, 'error');
      }
      e.target.value = '';
    });
  }

  function renderSection(key) {
    switch (key) {
      case 'dashboard': renderDashboard(); break;
      case 'tasks': renderTasksSection(); break;
      case 'planning': renderPlanningSection(); break;
      case 'focus': renderFocusSection(); break;
      case 'studies': renderStudiesSection(); break;
      case 'business': renderBusinessSection(); break;
      case 'torah': renderTorahSection(); break;
      case 'personal': renderPersonalSection(); break;
      case 'crm': renderCrmSection(); break;
      case 'habits': renderHabitsSection(); break;
      case 'goals': renderGoalsSection(); break;
      case 'analytics': renderAnalyticsSection(); break;
      case 'settings': renderSettingsSection(); break;
      default: renderDashboard();
    }
  }

  function renderAll() {
    const badge = document.getElementById('badge-tasks-count');
    if (badge) {
      badge.textContent = String(state.data.tasks.filter((t) => !t.completed).length);
    }
    renderSection(state.currentSection);
    updateTimerDisplays();
  }

  /* ========================================================================
     Initialization & Service Worker Registration
     ======================================================================== */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
          console.warn('[LIFE-OS] Enregistrement Service Worker non actif:', err);
        });
      });
    }
  }

  function bindGlobalEvents() {
    document.querySelectorAll('.nav-item[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.section));
    });
    document.querySelectorAll('.bottom-nav-btn[data-section]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.section));
    });
    document.getElementById('btn-mobile-more')?.addEventListener('click', openSidebarMobile);
    document.getElementById('btn-open-sidebar')?.addEventListener('click', openSidebarMobile);
    document.getElementById('btn-close-sidebar')?.addEventListener('click', closeSidebarMobile);
    document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebarMobile);

    document.querySelectorAll('.theme-btn[data-theme-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.themeChoice);
        savePrefs();
      });
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.prefs.theme === 'auto') {
          applyTheme('auto');
        }
      });
    }

    const searchInput = document.getElementById('global-search-input');
    searchInput?.addEventListener('input', (e) => performGlobalSearch(e.target.value));
    document.getElementById('btn-clear-search')?.addEventListener('click', () => {
      searchInput.value = '';
      performGlobalSearch('');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-center')) {
        document.getElementById('global-search-results')?.classList.add('hidden');
      }
    });

    document.getElementById('btn-topbar-new-task')?.addEventListener('click', () => openTaskModal());
    document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  async function init() {
    hydrateIcons();
    applyTheme(state.prefs.theme);
    updateNetworkStatus();
    const dateEl = document.getElementById('topbar-date');
    if (dateEl) dateEl.textContent = formatDateFR(new Date());

    setTimerMode('work');
    bindGlobalEvents();
    registerServiceWorker();

    try {
      state.db = await openDatabase();
      await loadAllStores();
    } catch (err) {
      console.error('[LIFE-OS] Initialisation IndexedDB:', err);
      showToast('Stockage local indisponible — mode mémoire actif.', 'error');
    }

    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
