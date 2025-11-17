// Глобальные переменные
let currentPage = null;
let pages = [];
let draggedBlock = null;
let categories = [];
let viewMode = 'editor'; // 'editor', 'dashboard', 'calendar'

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadPages();
    loadPageHistory();
    initTheme();
    initEventListeners();
    registerServiceWorker();
    checkForUpdates();

    // Показываем пустое состояние если нет страниц
    if (pages.length === 0) {
        showEmptyState();
    } else {
        loadPage(pages[0].id);
    }
});

// Инициализация слушателей событий
function initEventListeners() {
    // Кнопки создания новой страницы
    document.getElementById('newPageBtn').addEventListener('click', createNewPage);
    document.getElementById('emptyNewPageBtn').addEventListener('click', createNewPage);

    // Переключение темы
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Свернуть/развернуть боковую панель
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('openSidebar').addEventListener('click', toggleSidebar);

    // Кнопка добавления блока
    document.getElementById('addBlockBtn').addEventListener('click', showBlockMenu);

    // Заголовок страницы
    const pageTitle = document.getElementById('pageTitle');
    pageTitle.addEventListener('input', () => {
        if (currentPage) {
            currentPage.title = pageTitle.value || 'Без названия';
            savePages();
            updatePagesList();
        }
    });

    // Клик вне меню блоков закрывает его
    document.addEventListener('click', (e) => {
        const blockMenu = document.getElementById('blockMenu');
        if (!blockMenu.contains(e.target) && !e.target.closest('#addBlockBtn')) {
            hideBlockMenu();
        }
    });

    // Выбор типа блока
    document.querySelectorAll('.block-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            addBlock(type);
            hideBlockMenu();
        });
    });

    // Поиск блоков
    document.getElementById('blockSearch').addEventListener('input', (e) => {
        filterBlockMenu(e.target.value);
    });

    // Горячие клавиши
    document.addEventListener('keydown', handleGlobalKeyboard);

    // Кнопки переключения режимов
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    // Настройки страницы
    const pageSettingsBtn = document.getElementById('pageSettingsBtn');
    if (pageSettingsBtn) {
        pageSettingsBtn.addEventListener('click', openPageSettings);
    }

    const versionHistoryBtn = document.getElementById('versionHistoryBtn');
    if (versionHistoryBtn) {
        versionHistoryBtn.addEventListener('click', showVersionHistory);
    }

    const closePageSettings = document.getElementById('closePageSettings');
    if (closePageSettings) {
        closePageSettings.addEventListener('click', () => {
            document.getElementById('pageSettingsModal').style.display = 'none';
        });
    }

    const cancelPageSettings = document.getElementById('cancelPageSettings');
    if (cancelPageSettings) {
        cancelPageSettings.addEventListener('click', () => {
            document.getElementById('pageSettingsModal').style.display = 'none';
        });
    }

    const savePageSettingsBtn = document.getElementById('savePageSettings');
    if (savePageSettingsBtn) {
        savePageSettingsBtn.addEventListener('click', savePageSettings);
    }

    // Выбор типа обложки
    document.querySelectorAll('.cover-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.cover-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            const gradientPicker = document.getElementById('gradientPicker');
            if (opt.dataset.type === 'gradient') {
                gradientPicker.style.display = 'flex';
            } else {
                gradientPicker.style.display = 'none';
            }
        });
    });

    // Выбор градиента
    document.querySelectorAll('.gradient-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.gradient-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });
}

// Глобальные горячие клавиши
function handleGlobalKeyboard(e) {
    // Ctrl/Cmd + N - новая страница
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewPage();
    }

    // Ctrl/Cmd + B - toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
    }

    // Ctrl/Cmd + Shift + L - toggle theme
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        toggleTheme();
    }
}

// Управление страницами
function loadPages() {
    const stored = localStorage.getItem('openwebj_pages');
    pages = stored ? JSON.parse(stored) : [];

    const storedCategories = localStorage.getItem('openwebj_categories');
    categories = storedCategories ? JSON.parse(storedCategories) : ['Работа', 'Личное', 'Проекты'];

    updatePagesList();
}

function savePages() {
    localStorage.setItem('openwebj_pages', JSON.stringify(pages));
    localStorage.setItem('openwebj_categories', JSON.stringify(categories));
    updateLastEdited();
}

function createNewPage() {
    const newPage = {
        id: generateId(),
        title: 'Без названия',
        icon: '📄',
        cover: null, // { type: 'gradient'/'image', value: '...' }
        color: null, // Цвет страницы
        category: null, // Категория
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    pages.push(newPage);
    savePages();
    updatePagesList();
    loadPage(newPage.id);
    hideEmptyState();

    // Фокусируемся на заголовке
    setTimeout(() => {
        document.getElementById('pageTitle').focus();
        document.getElementById('pageTitle').select();
    }, 100);
}

function loadPage(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    currentPage = page;
    viewMode = 'editor';

    // Показываем контейнер страницы
    document.getElementById('pageContainer').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    const dashboardView = document.getElementById('dashboardView');
    const calendarView = document.getElementById('calendarView');
    if (dashboardView) dashboardView.style.display = 'none';
    if (calendarView) calendarView.style.display = 'none';

    // Обновляем заголовок
    document.getElementById('pageTitle').value = page.title;

    // Обложка
    const coverEl = document.getElementById('pageCover');
    if (page.cover) {
        coverEl.style.display = 'block';
        if (page.cover.type === 'gradient') {
            coverEl.style.background = page.cover.value;
            coverEl.style.backgroundImage = '';
        } else if (page.cover.type === 'image') {
            coverEl.style.backgroundImage = `url(${page.cover.value})`;
            coverEl.style.background = '';
        }
    } else {
        coverEl.style.display = 'none';
    }

    // Очищаем и загружаем блоки
    const container = document.getElementById('blocksContainer');
    container.innerHTML = '';

    page.blocks.forEach(block => {
        renderBlock(block);
    });

    // Если нет блоков, добавляем один пустой текстовый
    if (page.blocks.length === 0) {
        addBlock('text');
    }

    // Обновляем активную страницу в списке
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.toggle('active', item.dataset.pageId === pageId);
    });

    renderBreadcrumbs();
    updateLastEdited();
}

function deletePage(pageId) {
    if (!confirm('Удалить эту страницу?')) return;

    pages = pages.filter(p => p.id !== pageId);
    savePages();
    updatePagesList();

    if (currentPage && currentPage.id === pageId) {
        if (pages.length > 0) {
            loadPage(pages[0].id);
        } else {
            currentPage = null;
            showEmptyState();
        }
    }
}

function updatePagesList() {
    const list = document.getElementById('pagesList');
    list.innerHTML = '';

    pages.forEach(page => {
        const item = document.createElement('div');
        item.className = 'page-item';
        item.dataset.pageId = page.id;

        if (currentPage && currentPage.id === page.id) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="page-item-icon">${page.icon}</div>
            <div class="page-item-text">${page.title}</div>
            <div class="page-item-actions">
                <button class="page-action-btn delete-page" data-page-id="${page.id}" title="Удалить">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;

        // Клик по странице
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.page-action-btn')) {
                loadPage(page.id);
            }
        });

        // Удаление страницы
        item.querySelector('.delete-page').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(page.id);
        });

        list.appendChild(item);
    });
}

// Управление блоками
function addBlock(type, content = '', position = null) {
    if (!currentPage) return;

    const block = {
        id: generateId(),
        type: type,
        content: content
    };

    if (position !== null) {
        currentPage.blocks.splice(position, 0, block);
    } else {
        currentPage.blocks.push(block);
    }

    savePages();
    renderBlock(block, position);

    // Фокусируемся на новом блоке
    setTimeout(() => {
        const blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
        if (blockEl) {
            const input = blockEl.querySelector('.block-input, .checkbox-input + .block-input');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }
    }, 50);

    return block;
}

function renderBlock(block, position = null) {
    const container = document.getElementById('blocksContainer');
    const blockEl = document.createElement('div');
    blockEl.className = 'block';
    blockEl.dataset.blockId = block.id;
    blockEl.dataset.type = block.type;
    blockEl.draggable = true;

    // Handle для перетаскивания
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '⋮⋮';

    // Контент блока
    const content = document.createElement('div');
    content.className = 'block-content';

    // Для чекбокса особая структура
    if (block.type === 'checkbox') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox-input';
        checkbox.checked = block.checked || false;

        checkbox.addEventListener('change', () => {
            block.checked = checkbox.checked;
            blockEl.classList.toggle('checked', checkbox.checked);
            savePages();
        });

        const input = createBlockInput(block);

        content.appendChild(checkbox);
        content.appendChild(input);

        if (block.checked) {
            blockEl.classList.add('checked');
        }
    } else {
        const input = createBlockInput(block);
        content.appendChild(input);
    }

    // Действия с блоком
    const actions = document.createElement('div');
    actions.className = 'block-actions';
    actions.innerHTML = `
        <button class="block-action-btn duplicate-block" title="Дублировать (Ctrl+D)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/>
            </svg>
        </button>
        <button class="block-action-btn delete-block" title="Удалить (Ctrl+Shift+D)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;

    // События для действий
    actions.querySelector('.duplicate-block').addEventListener('click', () => duplicateBlock(block.id));
    actions.querySelector('.delete-block').addEventListener('click', () => deleteBlock(block.id));

    blockEl.appendChild(handle);
    blockEl.appendChild(content);
    blockEl.appendChild(actions);

    // Drag & Drop
    blockEl.addEventListener('dragstart', handleDragStart);
    blockEl.addEventListener('dragover', handleDragOver);
    blockEl.addEventListener('drop', handleDrop);
    blockEl.addEventListener('dragend', handleDragEnd);

    if (position !== null) {
        const existingBlocks = container.children;
        if (position < existingBlocks.length) {
            container.insertBefore(blockEl, existingBlocks[position]);
        } else {
            container.appendChild(blockEl);
        }
    } else {
        container.appendChild(blockEl);
    }
}

function createBlockInput(block) {
    const input = document.createElement('textarea');
    input.className = 'block-input';
    input.value = block.content || '';
    input.rows = 1;

    // Плейсхолдеры для разных типов
    const placeholders = {
        text: 'Введите текст или / для команд...',
        heading1: 'Заголовок 1',
        heading2: 'Заголовок 2',
        heading3: 'Заголовок 3',
        list: 'Элемент списка',
        checkbox: 'Задача',
        code: 'Код...',
        quote: 'Цитата...'
    };

    input.placeholder = placeholders[block.type] || 'Введите текст...';

    // Автоматическое изменение высоты
    function adjustHeight() {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    }

    input.addEventListener('input', () => {
        block.content = input.value;
        savePages();
        adjustHeight();
    });

    // Обработка клавиш
    input.addEventListener('keydown', (e) => {
        // Enter - новый блок
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const blockIndex = currentPage.blocks.findIndex(b => b.id === block.id);
            addBlock('text', '', blockIndex + 1);
        }

        // Backspace в пустом блоке - удалить
        if (e.key === 'Backspace' && input.value === '' && currentPage.blocks.length > 1) {
            e.preventDefault();
            const blockIndex = currentPage.blocks.findIndex(b => b.id === block.id);
            deleteBlock(block.id);

            // Фокус на предыдущем блоке
            if (blockIndex > 0) {
                setTimeout(() => {
                    const prevBlock = currentPage.blocks[blockIndex - 1];
                    const prevBlockEl = document.querySelector(`[data-block-id="${prevBlock.id}"]`);
                    if (prevBlockEl) {
                        const prevInput = prevBlockEl.querySelector('.block-input');
                        if (prevInput) {
                            prevInput.focus();
                            prevInput.setSelectionRange(prevInput.value.length, prevInput.value.length);
                        }
                    }
                }, 50);
            }
        }

        // / в начале - открыть меню блоков
        if (e.key === '/' && input.value === '') {
            e.preventDefault();
            showBlockMenu(input);
        }

        // Ctrl/Cmd + D - дублировать блок
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            duplicateBlock(block.id);
        }

        // Ctrl/Cmd + Shift + D - удалить блок
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            deleteBlock(block.id);
        }

        // Arrow Up - переход к предыдущему блоку
        if (e.key === 'ArrowUp' && input.selectionStart === 0) {
            e.preventDefault();
            const blockIndex = currentPage.blocks.findIndex(b => b.id === block.id);
            if (blockIndex > 0) {
                const prevBlock = currentPage.blocks[blockIndex - 1];
                const prevBlockEl = document.querySelector(`[data-block-id="${prevBlock.id}"]`);
                if (prevBlockEl) {
                    const prevInput = prevBlockEl.querySelector('.block-input');
                    if (prevInput) prevInput.focus();
                }
            }
        }

        // Arrow Down - переход к следующему блоку
        if (e.key === 'ArrowDown' && input.selectionStart === input.value.length) {
            e.preventDefault();
            const blockIndex = currentPage.blocks.findIndex(b => b.id === block.id);
            if (blockIndex < currentPage.blocks.length - 1) {
                const nextBlock = currentPage.blocks[blockIndex + 1];
                const nextBlockEl = document.querySelector(`[data-block-id="${nextBlock.id}"]`);
                if (nextBlockEl) {
                    const nextInput = nextBlockEl.querySelector('.block-input');
                    if (nextInput) nextInput.focus();
                }
            }
        }
    });

    setTimeout(adjustHeight, 0);

    return input;
}

function duplicateBlock(blockId) {
    const block = currentPage.blocks.find(b => b.id === blockId);
    if (!block) return;

    const blockIndex = currentPage.blocks.findIndex(b => b.id === blockId);
    const newBlock = {
        ...block,
        id: generateId()
    };

    currentPage.blocks.splice(blockIndex + 1, 0, newBlock);
    savePages();
    renderBlock(newBlock, blockIndex + 1);
}

function deleteBlock(blockId) {
    const blockIndex = currentPage.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    // Удаляем из массива
    currentPage.blocks.splice(blockIndex, 1);
    savePages();

    // Удаляем из DOM
    const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockEl) {
        blockEl.remove();
    }

    // Если это был последний блок, добавляем новый пустой
    if (currentPage.blocks.length === 0) {
        addBlock('text');
    }
}

// Drag & Drop для блоков
function handleDragStart(e) {
    draggedBlock = this;
    this.style.opacity = '0.5';
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(e.clientY);
    const container = document.getElementById('blocksContainer');

    if (afterElement == null) {
        container.appendChild(draggedBlock);
    } else {
        container.insertBefore(draggedBlock, afterElement);
    }

    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Обновляем порядок в данных
    const container = document.getElementById('blocksContainer');
    const blockElements = Array.from(container.children);
    const newOrder = blockElements.map(el => el.dataset.blockId);

    currentPage.blocks.sort((a, b) => {
        return newOrder.indexOf(a.id) - newOrder.indexOf(b.id);
    });

    savePages();

    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.classList.remove('dragging');
    draggedBlock = null;
}

function getDragAfterElement(y) {
    const container = document.getElementById('blocksContainer');
    const draggableElements = [...container.querySelectorAll('.block:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Меню выбора типа блока
function showBlockMenu(target) {
    const menu = document.getElementById('blockMenu');
    menu.style.display = 'block';

    // Позиционируем меню
    if (target && target.getBoundingClientRect) {
        const rect = target.getBoundingClientRect();
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.left = rect.left + 'px';
    } else {
        const btn = document.getElementById('addBlockBtn');
        const rect = btn.getBoundingClientRect();
        menu.style.top = (rect.top - 10) + 'px';
        menu.style.left = rect.left + 'px';
    }

    // Фокусируемся на поиске
    setTimeout(() => {
        document.getElementById('blockSearch').focus();
    }, 50);
}

function hideBlockMenu() {
    const menu = document.getElementById('blockMenu');
    menu.style.display = 'none';
    document.getElementById('blockSearch').value = '';
    filterBlockMenu('');
}

function filterBlockMenu(query) {
    const items = document.querySelectorAll('.block-menu-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
        const title = item.querySelector('.block-menu-title').textContent.toLowerCase();
        const desc = item.querySelector('.block-menu-desc').textContent.toLowerCase();

        if (title.includes(lowerQuery) || desc.includes(lowerQuery)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Тема
function initTheme() {
    const savedTheme = localStorage.getItem('openwebj_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('openwebj_theme', newTheme);
}

// Боковая панель - ИСПРАВЛЕНО!
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const openBtn = document.getElementById('openSidebar');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');

    // Показываем/скрываем кнопку открытия
    if (sidebar.classList.contains('collapsed')) {
        openBtn.style.display = 'flex';
    } else {
        openBtn.style.display = 'none';
    }
}

// Пустое состояние
function showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('pageContainer').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('pageContainer').style.display = 'block';
}

// Утилиты
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateLastEdited() {
    if (!currentPage) return;

    currentPage.updatedAt = new Date().toISOString();
    const date = new Date(currentPage.updatedAt);
    const formatted = formatDate(date);

    document.getElementById('lastEdited').textContent = `Изменено ${formatted}`;
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;

    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Переключение режимов просмотра
function switchView(mode) {
    viewMode = mode;

    const pageContainer = document.getElementById('pageContainer');
    const emptyState = document.getElementById('emptyState');
    const dashboardView = document.getElementById('dashboardView');
    const calendarView = document.getElementById('calendarView');

    // Скрываем все
    pageContainer.style.display = 'none';
    emptyState.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'none';
    if (calendarView) calendarView.style.display = 'none';

    // Обновляем активную кнопку
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (mode === 'editor') {
        if (currentPage) {
            pageContainer.style.display = 'block';
        } else if (pages.length === 0) {
            emptyState.style.display = 'flex';
        }
    } else if (mode === 'dashboard') {
        if (dashboardView) {
            dashboardView.style.display = 'block';
            renderDashboard();
        }
        document.querySelector('[data-view="dashboard"]')?.classList.add('active');
    } else if (mode === 'calendar') {
        if (calendarView) {
            calendarView.style.display = 'block';
            renderCalendar();
        }
        document.querySelector('[data-view="calendar"]')?.classList.add('active');
    }
}

// Рендер Dashboard
function renderDashboard() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    container.innerHTML = '';

    // Группировка по категориям
    const categorized = {};
    const uncategorized = [];

    pages.forEach(page => {
        if (page.category) {
            if (!categorized[page.category]) {
                categorized[page.category] = [];
            }
            categorized[page.category].push(page);
        } else {
            uncategorized.push(page);
        }
    });

    // Рендерим категории
    Object.keys(categorized).forEach(category => {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const header = document.createElement('div');
        header.className = 'dashboard-section-header';
        header.innerHTML = `
            <h3>${category}</h3>
            <span class="page-count">${categorized[category].length}</span>
        `;

        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';

        categorized[category].forEach(page => {
            grid.appendChild(createPageCard(page));
        });

        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    });

    // Без категории
    if (uncategorized.length > 0) {
        const section = document.createElement('div');
        section.className = 'dashboard-section';

        const header = document.createElement('div');
        header.className = 'dashboard-section-header';
        header.innerHTML = `
            <h3>Без категории</h3>
            <span class="page-count">${uncategorized.length}</span>
        `;

        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';

        uncategorized.forEach(page => {
            grid.appendChild(createPageCard(page));
        });

        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    }
}

// Создание карточки страницы
function createPageCard(page) {
    const card = document.createElement('div');
    card.className = 'page-card';
    if (page.color) {
        card.style.borderLeftColor = page.color;
    }

    let coverHTML = '';
    if (page.cover) {
        if (page.cover.type === 'gradient') {
            coverHTML = `<div class="page-card-cover" style="background: ${page.cover.value}"></div>`;
        } else if (page.cover.type === 'image') {
            coverHTML = `<div class="page-card-cover" style="background-image: url(${page.cover.value})"></div>`;
        }
    }

    card.innerHTML = `
        ${coverHTML}
        <div class="page-card-content">
            <div class="page-card-icon">${page.icon}</div>
            <div class="page-card-title">${page.title}</div>
            ${page.category ? `<div class="page-card-category">${page.category}</div>` : ''}
            <div class="page-card-meta">
                <span>${page.blocks.length} блоков</span>
                <span>•</span>
                <span>${formatDate(new Date(page.updatedAt))}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        switchView('editor');
        loadPage(page.id);
    });

    return card;
}

// Рендер календаря
function renderCalendar() {
    const container = document.getElementById('calendarContent');
    if (!container) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    container.innerHTML = `
        <div class="calendar-header">
            <h2>${monthNames[month]} ${year}</h2>
            <div class="calendar-nav">
                <button class="btn-icon" id="prevMonth">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M15 18l-6-6 6-6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button class="btn-icon" id="nextMonth">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-name">Пн</div>
            <div class="calendar-day-name">Вт</div>
            <div class="calendar-day-name">Ср</div>
            <div class="calendar-day-name">Чт</div>
            <div class="calendar-day-name">Пт</div>
            <div class="calendar-day-name">Сб</div>
            <div class="calendar-day-name">Вс</div>
        </div>
        <div class="calendar-days" id="calendarDays"></div>
    `;

    const daysContainer = document.getElementById('calendarDays');

    // Пустые ячейки до начала месяца
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        daysContainer.appendChild(emptyDay);
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        const currentDate = new Date(year, month, day);
        if (currentDate.toDateString() === now.toDateString()) {
            dayEl.classList.add('today');
        }

        // Находим страницы созданные в этот день
        const pagesOnDay = pages.filter(page => {
            const pageDate = new Date(page.createdAt);
            return pageDate.getDate() === day &&
                pageDate.getMonth() === month &&
                pageDate.getFullYear() === year;
        });

        dayEl.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-day-events">
                ${pagesOnDay.map(page => `
                    <div class="calendar-event" style="border-left-color: ${page.color || '#ccc'}">
                        ${page.icon} ${page.title}
                    </div>
                `).join('')}
            </div>
        `;

        daysContainer.appendChild(dayEl);
    }
}

// Открыть настройки страницы
function openPageSettings() {
    if (!currentPage) return;

    const modal = document.getElementById('pageSettingsModal');
    if (!modal) return;

    modal.style.display = 'flex';

    // Заполняем текущие значения
    document.getElementById('pageIcon').value = currentPage.icon || '📄';
    document.getElementById('pageColor').value = currentPage.color || '#2383e2';
    document.getElementById('pageCategory').value = currentPage.category || '';

    // Обложка
    const coverType = currentPage.cover?.type || 'none';
    document.querySelectorAll('.cover-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.type === coverType);
    });
}

// Сохранить настройки страницы
function savePageSettings() {
    if (!currentPage) return;

    currentPage.icon = document.getElementById('pageIcon').value || '📄';
    currentPage.color = document.getElementById('pageColor').value;
    currentPage.category = document.getElementById('pageCategory').value || null;

    // Обложка
    const activeType = document.querySelector('.cover-option.active')?.dataset.type;
    if (activeType === 'none') {
        currentPage.cover = null;
    } else if (activeType === 'gradient') {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        ];
        const selectedGradient = document.querySelector('.gradient-option.active')?.dataset.gradient || '0';
        currentPage.cover = {
            type: 'gradient',
            value: gradients[parseInt(selectedGradient)]
        };
    }

    savePages();
    updatePagesList();
    loadPage(currentPage.id);
    closePageSettings();
}

function closePageSettings() {
    const modal = document.getElementById('pageSettingsModal');
    if (modal) modal.style.display = 'none';
}

// ==================== PWA ====================

// Регистрация Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker зарегистрирован:', registration.scope);

                // Проверяем обновления каждый час
                setInterval(() => {
                    registration.update();
                }, 3600000);
            })
            .catch(error => {
                console.log('❌ Ошибка регистрации Service Worker:', error);
            });
    }
}

// Проверка на обновления
function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        });
    }
}

// Уведомление об обновлении
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>🎉 Доступна новая версия!</span>
            <button class="btn-update" onclick="reloadApp()">Обновить</button>
        </div>
    `;
    document.body.appendChild(notification);
}

function reloadApp() {
    window.location.reload();
}

// Кнопка установки PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    const installBtn = document.createElement('button');
    installBtn.className = 'btn-install-pwa';
    installBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Установить приложение
    `;
    installBtn.onclick = installPWA;

    const sidebar = document.querySelector('.sidebar-footer');
    if (sidebar) {
        sidebar.insertBefore(installBtn, sidebar.firstChild);
    }
}

async function installPWA() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`Результат установки: ${outcome}`);
    deferredPrompt = null;

    const installBtn = document.querySelector('.btn-install-pwa');
    if (installBtn) installBtn.remove();
}

// Проверяем, установлено ли как PWA
window.addEventListener('appinstalled', () => {
    console.log('✅ PWA установлено!');
    const installBtn = document.querySelector('.btn-install-pwa');
    if (installBtn) installBtn.remove();
});

// ==================== ПОДСТРАНИЦЫ ====================

// Добавление подстраницы
function createSubpage(parentId) {
    const parent = pages.find(p => p.id === parentId);
    if (!parent) return;

    const subpage = {
        id: generateId(),
        title: 'Без названия',
        icon: '📄',
        cover: null,
        color: null,
        category: parent.category,
        parentId: parentId,
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    pages.push(subpage);
    savePages();
    updatePagesList();
    loadPage(subpage.id);
}

// Получение всех подстраниц
function getSubpages(parentId) {
    return pages.filter(p => p.parentId === parentId);
}

// Получение родительской цепочки (breadcrumbs)
function getBreadcrumbs(pageId) {
    const breadcrumbs = [];
    let current = pages.find(p => p.id === pageId);

    while (current) {
        breadcrumbs.unshift(current);
        current = current.parentId ? pages.find(p => p.id === current.parentId) : null;
    }

    return breadcrumbs;
}

// Обновление списка страниц с вложенностью
function updatePagesListWithNesting() {
    const list = document.getElementById('pagesList');
    list.innerHTML = '';

    // Получаем страницы верхнего уровня
    const rootPages = pages.filter(p => !p.parentId);

    rootPages.forEach(page => {
        renderPageWithChildren(page, list, 0);
    });
}

function renderPageWithChildren(page, container, level) {
    const item = document.createElement('div');
    item.className = 'page-item';
    item.dataset.pageId = page.id;
    item.style.paddingLeft = (12 + level * 20) + 'px';

    if (currentPage && currentPage.id === page.id) {
        item.classList.add('active');
    }

    const subpages = getSubpages(page.id);
    const hasChildren = subpages.length > 0;

    item.innerHTML = `
        ${hasChildren ? `<button class="page-toggle" onclick="togglePageChildren('${page.id}')">▶</button>` : '<span class="page-spacer"></span>'}
        <div class="page-item-icon">${page.icon}</div>
        <div class="page-item-text">${page.title}</div>
        <div class="page-item-actions">
            <button class="page-action-btn add-subpage" data-page-id="${page.id}" title="Добавить подстраницу">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/>
                    <line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
            <button class="page-action-btn delete-page" data-page-id="${page.id}" title="Удалить">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    // Клик по странице
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.page-action-btn') && !e.target.closest('.page-toggle')) {
            loadPage(page.id);
        }
    });

    // Добавление подстраницы
    const addSubpageBtn = item.querySelector('.add-subpage');
    if (addSubpageBtn) {
        addSubpageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            createSubpage(page.id);
        });
    }

    // Удаление страницы
    item.querySelector('.delete-page').addEventListener('click', (e) => {
        e.stopPropagation();
        deletePage(page.id);
    });

    container.appendChild(item);

    // Рендерим дочерние страницы
    if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'page-children';
        childrenContainer.dataset.parentId = page.id;
        childrenContainer.style.display = 'none';

        subpages.forEach(subpage => {
            renderPageWithChildren(subpage, childrenContainer, level + 1);
        });

        container.appendChild(childrenContainer);
    }
}

function togglePageChildren(pageId) {
    const children = document.querySelector(`.page-children[data-parent-id="${pageId}"]`);
    const toggle = document.querySelector(`[data-page-id="${pageId}"] .page-toggle`);

    if (children && toggle) {
        const isOpen = children.style.display !== 'none';
        children.style.display = isOpen ? 'none' : 'block';
        toggle.textContent = isOpen ? '▶' : '▼';
    }
}

// Отображение breadcrumbs
function renderBreadcrumbs() {
    if (!currentPage) return;

    const breadcrumbs = getBreadcrumbs(currentPage.id);
    const container = document.getElementById('breadcrumbs');

    if (!container) return;

    container.innerHTML = breadcrumbs.map((page, index) => `
        <span class="breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}" 
              onclick="${index < breadcrumbs.length - 1 ? `loadPage('${page.id}')` : ''}">
            ${page.icon} ${page.title}
        </span>
        ${index < breadcrumbs.length - 1 ? '<span class="breadcrumb-separator">/</span>' : ''}
    `).join('');
}

// ==================== ИСТОРИЯ ВЕРСИЙ ====================

let pageHistory = {};

// Сохранение версии страницы
function savePageVersion(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    if (!pageHistory[pageId]) {
        pageHistory[pageId] = [];
    }

    const version = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        title: page.title,
        blocks: JSON.parse(JSON.stringify(page.blocks)),
        icon: page.icon,
        cover: page.cover,
        color: page.color,
        category: page.category
    };

    pageHistory[pageId].push(version);

    // Храним максимум 20 версий
    if (pageHistory[pageId].length > 20) {
        pageHistory[pageId].shift();
    }

    localStorage.setItem('openwebj_history', JSON.stringify(pageHistory));
}

// Загрузка истории
function loadPageHistory() {
    const stored = localStorage.getItem('openwebj_history');
    pageHistory = stored ? JSON.parse(stored) : {};
}

// Показ истории версий
function showVersionHistory() {
    if (!currentPage) return;

    const versions = pageHistory[currentPage.id] || [];

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>История версий</h2>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18" stroke-width="2" stroke-linecap="round"/>
                        <line x1="6" y1="6" x2="18" y2="18" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="version-list">
                    ${versions.length === 0 ? '<p class="empty-message">Нет сохраненных версий</p>' : ''}
                    ${versions.reverse().map((version, index) => `
                        <div class="version-item">
                            <div class="version-info">
                                <div class="version-title">${version.title || 'Без названия'}</div>
                                <div class="version-date">${formatDate(new Date(version.timestamp))}</div>
                            </div>
                            <div class="version-actions">
                                <button class="btn-secondary" onclick="previewVersion('${version.id}')">Просмотр</button>
                                <button class="btn-primary" onclick="restoreVersion('${version.id}')">Восстановить</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// Восстановление версии
function restoreVersion(versionId) {
    if (!currentPage) return;

    const versions = pageHistory[currentPage.id] || [];
    const version = versions.find(v => v.id === versionId);

    if (!version) return;

    if (!confirm('Восстановить эту версию? Текущие изменения будут заменены.')) return;

    // Сохраняем текущую версию перед восстановлением
    savePageVersion(currentPage.id);

    // Восстанавливаем
    currentPage.title = version.title;
    currentPage.blocks = JSON.parse(JSON.stringify(version.blocks));
    currentPage.icon = version.icon;
    currentPage.cover = version.cover;
    currentPage.color = version.color;
    currentPage.category = version.category;

    savePages();
    loadPage(currentPage.id);

    document.querySelector('.modal')?.remove();
}

// Автосохранение версий каждые 5 минут
setInterval(() => {
    if (currentPage) {
        savePageVersion(currentPage.id);
    }
}, 300000);

// Обновляем функцию updatePagesList
const originalUpdatePagesList = updatePagesList;
updatePagesList = function() {
    updatePagesListWithNesting();
};
