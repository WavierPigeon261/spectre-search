/**
 * Spectre Search History Manager
 * Manages browser-based search history with localStorage
 * Provides autocomplete dropdown suggestions
 */

class SearchHistory {
    constructor(inputSelector, dropdownSelector, maxItems = 50) {
        this.input = document.querySelector(inputSelector);
        this.dropdown = document.querySelector(dropdownSelector);
        this.maxItems = maxItems;
        this.storageKey = 'spectreSearchHistory';
        this.currentFocusIndex = -1;

        if (this.input && this.dropdown) {
            this.init();
        }
    }

    init() {
        // Load history on page load
        this.loadHistory();

        // Event listeners
        this.input.addEventListener('input', (e) => this.onInput(e));
        this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
        this.input.addEventListener('focus', () => this.showDropdown());
        this.input.addEventListener('blur', () => setTimeout(() => this.hideDropdown(), 200));

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target !== this.input && e.target !== this.dropdown) {
                this.hideDropdown();
            }
        });
    }

    /**
     * Handle input event - filter and display suggestions
     */
    onInput(event) {
        const query = event.target.value.trim();
        
        if (query.length === 0) {
            this.displayAllHistory();
        } else {
            this.filterAndDisplay(query);
        }
    }

    /**
     * Handle keyboard navigation in dropdown
     */
    onKeyDown(event) {
        const items = this.dropdown.querySelectorAll('.history-item');
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.currentFocusIndex = Math.min(this.currentFocusIndex + 1, items.length - 1);
            this.updateFocus(items);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.currentFocusIndex = Math.max(this.currentFocusIndex - 1, -1);
            this.updateFocus(items);
        } else if (event.key === 'Enter') {
            if (this.currentFocusIndex >= 0 && items[this.currentFocusIndex]) {
                event.preventDefault();
                items[this.currentFocusIndex].click();
            }
        } else if (event.key === 'Escape') {
            this.hideDropdown();
        }
    }

    /**
     * Update focus on dropdown items
     */
    updateFocus(items) {
        items.forEach((item, index) => {
            item.classList.toggle('focused', index === this.currentFocusIndex);
        });
    }

    /**
     * Filter history based on input
     */
    filterAndDisplay(query) {
        const history = this.getHistory();
        const filtered = history.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        );

        if (filtered.length > 0) {
            this.displayHistory(filtered);
        } else {
            this.showNoResults();
        }
    }

    /**
     * Display all history items
     */
    displayAllHistory() {
        const history = this.getHistory();
        this.displayHistory(history.slice(0, 10)); // Show last 10 by default
    }

    /**
     * Render history items in dropdown
     */
    displayHistory(items) {
        this.currentFocusIndex = -1;
        
        const html = items.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <svg class="history-icon" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                <span class="history-text">${this.escapeHtml(item)}</span>
                <span class="history-remove" data-query="${this.escapeHtml(item)}">✕</span>
            </div>
        `).join('');

        this.dropdown.innerHTML = `
            <div class="history-header">Search History</div>
            ${html}
            <div class="history-footer">
                <button class="clear-history-btn">Clear All History</button>
            </div>
        `;

        this.attachEventListeners();
        this.showDropdown();
    }

    /**
     * Show "no results" message
     */
    showNoResults() {
        this.dropdown.innerHTML = `
            <div class="history-no-results">No matching searches found</div>
        `;
        this.showDropdown();
    }

    /**
     * Attach click listeners to dropdown items
     */
    attachEventListeners() {
        // History items click
        this.dropdown.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.querySelector('.history-text').textContent;
                this.input.value = query;
                this.selectQuery(query);
            });
        });

        // Remove individual history item
        this.dropdown.querySelectorAll('.history-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const query = btn.getAttribute('data-query');
                this.removeFromHistory(query);
                this.onInput({ target: this.input });
            });
        });

        // Clear all history
        const clearBtn = this.dropdown.querySelector('.clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all search history?')) {
                    this.clearHistory();
                    this.hideDropdown();
                    this.input.value = '';
                }
            });
        }
    }

    /**
     * Handle query selection from history
     */
    selectQuery(query) {
        this.addToHistory(query);
        this.hideDropdown();
        
        // Submit the form
        const form = this.input.closest('form');
        if (form) {
            form.submit();
        }
    }

    /**
     * Save query to history
     */
    addToHistory(query) {
        if (!query || query.trim().length === 0) return;

        let history = this.getHistory();
        
        // Remove duplicate if exists
        history = history.filter(item => item !== query);
        
        // Add to front
        history.unshift(query);
        
        // Keep only maxItems
        history = history.slice(0, this.maxItems);
        
        localStorage.setItem(this.storageKey, JSON.stringify(history));
    }

    /**
     * Remove specific query from history
     */
    removeFromHistory(query) {
        let history = this.getHistory();
        history = history.filter(item => item !== query);
        localStorage.setItem(this.storageKey, JSON.stringify(history));
    }

    /**
     * Get all history from localStorage
     */
    getHistory() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Clear all history
     */
    clearHistory() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Load history on page load - save on form submission
     */
    loadHistory() {
        const form = this.input.closest('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                const query = this.input.value.trim();
                if (query) {
                    this.addToHistory(query);
                }
            });
        }
    }

    /**
     * Show dropdown
     */
    showDropdown() {
        this.dropdown.style.display = 'block';
    }

    /**
     * Hide dropdown
     */
    hideDropdown() {
        this.dropdown.style.display = 'none';
    }

    /**
     * Escape HTML to prevent injection
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SearchHistory('input[name="q"]', '#search-history-dropdown');
});
