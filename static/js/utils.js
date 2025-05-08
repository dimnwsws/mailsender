/**
 * Вспомогательные функции
 */

// Получаем или создаем контейнер для уведомлений
function getToastContainer() {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Показать уведомление
 * @param {string} type - Тип уведомления: success, error, warning, info
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст уведомления
 * @param {number} duration - Продолжительность показа в мс, 0 для бесконечного показа
 * @returns {HTMLElement} - Элемент уведомления
 */
function showToast(type, title, message, duration = 3000) {
    const toastContainer = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-toast';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    });
    
    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    toast.appendChild(closeBtn);
    toast.appendChild(titleEl);
    toast.appendChild(messageEl);
    
    toastContainer.appendChild(toast);
    
    // Форсируем перерисовку для включения анимации
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, duration);
    }
    
    return toast;
}

/**
 * Показать индикатор загрузки с анимацией
 */
function showLoading() {
    if (!elements.loadingIndicator) return;
    
    appState.isLoading = true;
    elements.loadingIndicator.style.display = 'flex';
    
    // Добавляем анимацию появления
    setTimeout(() => {
        elements.loadingIndicator.style.opacity = '1';
    }, 10);
}

/**
 * Скрыть индикатор загрузки с анимацией
 */
function hideLoading() {
    if (!elements.loadingIndicator) return;
    
    elements.loadingIndicator.style.opacity = '0';
    
    // Ждем окончания анимации
    setTimeout(() => {
        elements.loadingIndicator.style.display = 'none';
        appState.isLoading = false;
    }, 300);
}

/**
 * Обновить текст в статусной строке с анимацией
 * @param {string} message - Новый текст для статусной строки
 */
function updateStatusBar(message) {
    if (!elements.statusBar) return;
    
    // Исчезание
    elements.statusBar.style.opacity = '0';
    
    // Обновляем текст после исчезания
    setTimeout(() => {
        elements.statusBar.textContent = message;
        // Появление
        elements.statusBar.style.opacity = '1';
    }, 300);
}

/**
 * Открыть модальное окно с анимацией
 * @param {HTMLElement} modal - Элемент модального окна
 */
function openModal(modal) {
    if (!modal) return;
    
    modal.style.display = 'flex';
    // Форсируем перерисовку для включения анимации
    modal.offsetHeight;
    modal.classList.add('show');
}

/**
 * Закрыть модальное окно с анимацией
 * @param {HTMLElement} modal - Элемент модального окна
 */
function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('show');
    // Ждем окончания анимации
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * Обертка над fetch API с обработкой ошибок и уведомлениями
 * @param {string} url - URL для запроса
 * @param {Object} options - Опции для fetch
 * @returns {Promise<any>} - Результат запроса в формате JSON
 */
async function fetchAPI(url, options = {}) {
    try {
        // Добавляем метку времени для предотвращения кэширования
        const timestampedUrl = url.includes('?') 
            ? `${url}&_t=${Date.now()}` 
            : `${url}?_t=${Date.now()}`;
        
        const response = await fetch(timestampedUrl, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка API (${response.status}): ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка API:', error);
        showToast('error', 'Ошибка API', error.message);
        throw error;
    }
}

/**
 * Показать таблицу и скрыть пустое состояние
 */
function showTable() {
    // Скрываем пустое состояние
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Показываем обертку таблицы
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.style.display = 'block';
    }
    
    // Убеждаемся, что DataTable видима
    if (appState.dataTable) {
        $('.dataTables_wrapper').css({
            'width': '100%',
            'visibility': 'visible',
            'display': 'block'
        });
    }
    
    // Обновляем высоту контейнера таблицы для подгонки к содержимому
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.style.minHeight = '500px';
    }
}

/**
 * Показать пустое состояние и скрыть таблицу
 */
function showEmptyState() {
    // Показываем пустое состояние
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
    
    // Скрываем обертку таблицы
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.style.display = 'none';
    }
    
    // Обновляем контейнер таблицы для подгонки к пустому состоянию
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.style.minHeight = 'auto';
    }
}

/**
 * Добавить улучшенный поиск для верхнего поля
 */
function enhanceSearchInput() {
    if (!elements.globalSearch) return;
    
    const $search = $(elements.globalSearch);
    const $container = $search.parent();
    
    // Создаем кнопку очистки
    const $clearBtn = $('<span class="search-clear">&times;</span>');
    $container.css('position', 'relative');
    $clearBtn.css({
        'position': 'absolute',
        'right': '10px',
        'top': '50%',
        'transform': 'translateY(-50%)',
        'cursor': 'pointer',
        'color': '#999',
        'font-size': '16px',
        'display': 'none'
    });
    
    // Добавляем кнопку в контейнер
    $container.append($clearBtn);
    
    // Показываем/скрываем кнопку в зависимости от содержимого
    $search.on('input', function() {
        if ($(this).val()) {
            $clearBtn.show();
        } else {
            $clearBtn.hide();
        }
    });
    
    // Очищаем поиск при клике на кнопку
    $clearBtn.on('click', function() {
        $search.val('').trigger('input').focus();
        $clearBtn.hide();
    });
}