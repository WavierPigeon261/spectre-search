(() => {
    const storageKey = 'spectreSettings';
    const defaults = {
        openResultsInNewTab: true,
        searchSuggestions: true,
        safeSearch: 'moderate',
        region: 'world',
        resultLimit: 10,
        aiOverviews: true,
        answerStyle: 'concise',
        showFollowUps: true,
        saveSearchHistory: true,
        saveAskHistory: true,
        theme: 'light',
        compactResults: false,
        reduceAnimations: false
    };

    const allowed = {
        safeSearch: ['off', 'moderate', 'strict'],
        region: ['world', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'in'],
        resultLimit: [10, 20, 30],
        answerStyle: ['concise', 'detailed'],
        theme: ['light', 'dark', 'system']
    };

    function read() {
        try {
            const raw = localStorage.getItem(storageKey);
            const stored = JSON.parse(raw || '{}');
            const settings = { ...defaults };
            if (!raw && ['light', 'dark'].includes(localStorage.getItem('theme'))) {
                settings.theme = localStorage.getItem('theme');
            }
            for (const [key, value] of Object.entries(stored)) {
                if (typeof defaults[key] === 'boolean' && typeof value === 'boolean') {
                    settings[key] = value;
                } else if (allowed[key]?.includes(value)) {
                    settings[key] = value;
                }
            }
            return settings;
        } catch {
            return { ...defaults };
        }
    }

    function persist(settings) {
        localStorage.setItem(storageKey, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('spectre:settings-changed', { detail: settings }));
        apply(settings);
    }

    function effectiveTheme(settings) {
        if (settings.theme !== 'system') return settings.theme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function apply(settings = read()) {
        const root = document.documentElement;
        const theme = effectiveTheme(settings);
        localStorage.setItem('theme', theme);
        root.classList.toggle('dark-theme', theme === 'dark');
        root.classList.toggle('light-theme', theme === 'light');
        root.classList.toggle('compact-results', settings.compactResults);
        root.classList.toggle('reduce-motion', settings.reduceAnimations);
        const themeIcon = document.querySelector('#themeIcon path');
        if (themeIcon) {
            themeIcon.setAttribute('d', theme === 'dark'
                ? 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.42 0l1.42 1.42a1 1 0 1 1-1.42 1.42L4.22 5.64a1 1 0 0 1 0-1.42zm12.72 12.72a1 1 0 0 1 1.42 0l1.42 1.42a1 1 0 0 1-1.42 1.42l-1.42-1.42a1 1 0 0 1 0-1.42zM2 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm18 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1zM5.64 18.36a1 1 0 0 1 0 1.42l-1.42 1.42a1 1 0 0 1-1.42-1.42l1.42-1.42a1 1 0 0 1 1.42 0zm12.72-12.72a1 1 0 0 1 0 1.42l-1.42 1.42a1 1 0 1 1-1.42-1.42l1.42-1.42a1 1 0 0 1 1.42 0z'
                : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
        }
    }

    function clearAskData() {
        localStorage.removeItem('spectreAskHistory');
        localStorage.removeItem('spectreAskThread');
        localStorage.removeItem('spectreAskThread:conversation');
        window.dispatchEvent(new Event('spectre:ask-data-cleared'));
    }

    function addSearchParameters(form, settings = read()) {
        const values = {
            safe_search: settings.safeSearch,
            region: settings.region,
            result_limit: settings.resultLimit,
            ai_overviews: settings.aiOverviews ? 'on' : 'off',
            answer_style: settings.answerStyle,
            show_followups: settings.showFollowUps ? 'on' : 'off'
        };
        for (const [name, value] of Object.entries(values)) {
            let input = form.querySelector(`input[name="${name}"]`);
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                form.appendChild(input);
            }
            input.value = String(value);
        }
    }

    function applyResultPreferences(settings = read()) {
        document.querySelectorAll('.result-title').forEach(link => {
            if (settings.openResultsInNewTab) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            } else {
                link.removeAttribute('target');
                link.removeAttribute('rel');
            }
        });
    }

    window.SpectreSettings = {
        get: read,
        save: persist,
        clearAskData,
        apply,
        isSearchHistoryEnabled: () => read().saveSearchHistory,
        isAskHistoryEnabled: () => read().saveAskHistory,
        areSuggestionsEnabled: () => read().searchSuggestions
    };

    apply();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (read().theme === 'system') apply();
    });

    document.querySelectorAll('form[action="/search"]').forEach(form => {
        form.addEventListener('submit', () => addSearchParameters(form));
    });
    applyResultPreferences();
    window.addEventListener('spectre:settings-changed', event => applyResultPreferences(event.detail));

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const settings = read();
            settings.theme = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
            persist(settings);
        });
    }

    const panel = document.getElementById('settingsPanel');
    if (!panel) return;

    const toggle = document.getElementById('settingsToggle');
    const close = document.getElementById('settingsClose');
    const backdrop = document.getElementById('settingsBackdrop');
    const tabs = [...panel.querySelectorAll('[role="tab"]')];
    let previousFocus = null;

    function openPanel() {
        previousFocus = document.activeElement;
        panel.hidden = false;
        backdrop.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        panel.querySelector('[aria-selected="true"]').focus();
    }

    function closePanel() {
        panel.hidden = true;
        backdrop.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        previousFocus?.focus();
    }

    function selectTab(tab) {
        tabs.forEach(item => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
            document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
        });
    }

    toggle.addEventListener('click', openPanel);
    close.addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', event => {
        if (panel.hidden) return;
        if (event.key === 'Escape') {
            closePanel();
        } else if (event.key === 'Tab') {
            const focusable = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
                .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!panel.contains(document.activeElement)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            const currentIndex = tabs.indexOf(document.activeElement);
            if (currentIndex >= 0) {
                event.preventDefault();
                const step = event.key === 'ArrowRight' ? 1 : -1;
                const next = tabs[(currentIndex + step + tabs.length) % tabs.length];
                selectTab(next);
                next.focus();
            }
        }
    });
    tabs.forEach(tab => tab.addEventListener('click', () => selectTab(tab)));

    const controls = {
        openResultsInNewTab: 'openResultsInNewTab',
        searchSuggestions: 'searchSuggestions',
        safeSearch: 'safeSearch',
        region: 'searchRegion',
        resultLimit: 'resultLimit',
        aiOverviews: 'aiOverviews',
        answerStyle: 'answerStyle',
        showFollowUps: 'showFollowUps',
        saveSearchHistory: 'saveSearchHistory',
        saveAskHistory: 'saveAskHistory',
        theme: 'themePreference',
        compactResults: 'compactResults',
        reduceAnimations: 'reduceAnimations'
    };

    function updateControls() {
        const settings = read();
        for (const [key, id] of Object.entries(controls)) {
            const element = document.getElementById(id);
            if (element.type === 'checkbox') element.checked = settings[key];
            else element.value = String(settings[key]);
        }
    }

    for (const [key, id] of Object.entries(controls)) {
        const element = document.getElementById(id);
        element.addEventListener('change', () => {
            const settings = read();
            settings[key] = element.type === 'checkbox'
                ? element.checked
                : (key === 'resultLimit' ? Number(element.value) : element.value);
            persist(settings);

            if (key === 'saveSearchHistory' && !settings.saveSearchHistory) {
                localStorage.removeItem('spectreSearchHistory');
                window.dispatchEvent(new Event('spectre:history-cleared'));
            }
            if (key === 'saveAskHistory' && !settings.saveAskHistory) clearAskData();
        });
    }

    document.getElementById('clearSearchHistory').addEventListener('click', () => {
        localStorage.removeItem('spectreSearchHistory');
        window.dispatchEvent(new Event('spectre:history-cleared'));
    });
    document.getElementById('clearAskData').addEventListener('click', clearAskData);
    updateControls();
})();
