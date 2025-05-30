/**
 * Функции для пользовательского интерфейса
 */

/**
 * Инициализация обработчиков событий
 */
function initEventListeners() {
    // Проверяем, что элементы инициализированы
    if (!elements) {
        console.error("Элементы не инициализированы");
        return;
    }
    
    // Кнопки боковой панели
    if (elements.btnMailing) {
        elements.btnMailing.addEventListener('click', () => {
            loadFile();
        });
    }
    
    if (elements.btnViewDb) {
        elements.btnViewDb.addEventListener('click', () => {
            loadFile();
        });
    }

    // Кнопка "Обновить базу данных"
    if (elements.btnUpdateDb) {
        elements.btnUpdateDb.addEventListener('click', () => {
            window.open('https://islod.obrnadzor.gov.ru/accredreestr/opendata/', '_blank');
        });
    }
    
    // Кнопки панели инструментов
    if (elements.btnLoadFile) {
        elements.btnLoadFile.addEventListener('click', () => {
            loadFile();
        });
    }
    
    if (elements.btnExport) {
        elements.btnExport.addEventListener('click', () => {
            initExportModal();
        });
    }
    
    if (elements.btnColumns) {
        elements.btnColumns.addEventListener('click', () => {
            initColumnSelectorModal();
        });
    }
    
    if (elements.btnCustomColumns) {
        elements.btnCustomColumns.addEventListener('click', () => {
            initCustomColumnsModal();
        });
    }
    
    if (elements.btnPresets) {
        elements.btnPresets.addEventListener('click', () => {
            initPresetsModal();
        });
    }
    
    // Изменение файлового ввода
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                handleFileUpload(file);
            }
        });
    }
    
    // Глобальный поиск
    if (elements.globalSearch) {
        elements.globalSearch.addEventListener('input', () => {
            // Сначала используем стандартный поиск DataTables для всего содержимого
            if (appState.dataTable) {
                appState.dataTable.search(elements.globalSearch.value).draw(false);
                
                // Затем применяем наш пользовательский поиск и подсветку колонок
                searchColumns(elements.globalSearch.value);
            }
        });
        
        // Предотвращаем поведение по умолчанию для формы
        elements.globalSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }
    
    // Кнопка загрузки в пустом состоянии
    const btnStartUpload = document.getElementById('btn-start-upload');
    if (btnStartUpload) {
        btnStartUpload.addEventListener('click', function() {
            // Вызываем клик по файловому вводу, если он существует
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.click();
            } else {
                showToast('error', 'Ошибка', 'Элемент ввода файла не найден');
            }
        });
    }
    
    // Закрытие модальных окон при клике вне
    window.addEventListener('click', (event) => {
        if (modals.columnSelector && modals.columnSelector.modal && event.target === modals.columnSelector.modal) {
            closeModal(modals.columnSelector.modal);
        }
        if (modals.filter && modals.filter.modal && event.target === modals.filter.modal) {
            closeModal(modals.filter.modal);
        }
        if (modals.presets && modals.presets.modal && event.target === modals.presets.modal) {
            closeModal(modals.presets.modal);
        }
        if (modals.export && modals.export.modal && event.target === modals.export.modal) {
            closeModal(modals.export.modal);
        }
        if (modals.customColumns && modals.customColumns.modal && event.target === modals.customColumns.modal) {
            closeModal(modals.customColumns.modal);
        }
    });
    
    // Добавляем обработчики клавиш
    document.addEventListener('keydown', (e) => {
        // Escape закрывает модальные окна
        if (e.key === 'Escape') {
            if (modals.columnSelector && modals.columnSelector.modal && 
                modals.columnSelector.modal.style.display !== 'none') {
                closeModal(modals.columnSelector.modal);
            }
            if (modals.filter && modals.filter.modal && 
                modals.filter.modal.style.display !== 'none') {
                closeModal(modals.filter.modal);
            }
            if (modals.presets && modals.presets.modal && 
                modals.presets.modal.style.display !== 'none') {
                closeModal(modals.presets.modal);
            }
            if (modals.export && modals.export.modal && 
                modals.export.modal.style.display !== 'none') {
                closeModal(modals.export.modal);
            }
            if (modals.customColumns && modals.customColumns.modal && 
                modals.customColumns.modal.style.display !== 'none') {
                closeModal(modals.customColumns.modal);
            }
        }
        
        // Ctrl+F фокусирует поле поиска
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            if (elements.globalSearch) {
                elements.globalSearch.focus();
            }
        }
    });
    
    // Добавляем клавиатурную навигацию для результатов поиска
    document.addEventListener('keydown', (e) => {
        // Только если у нас есть совпадения и поле поиска в фокусе
        if (elements.globalSearch && document.activeElement === elements.globalSearch && 
            appState.dataTable && 
            elements.globalSearch.value.trim() !== '') {
            
            // Получаем все подсвеченные колонки
            const highlightedColumns = [];
            appState.dataTable.columns().header().each(function(header, index) {
                if ($(header).hasClass('highlight-match')) {
                    highlightedColumns.push(index);
                }
            });
            
            if (highlightedColumns.length === 0) return;
            
            // Находим индекс текущего лучшего совпадения
            let currentBestIndex = -1;
            appState.dataTable.columns().header().each(function(header, index) {
                if ($(header).hasClass('best-match')) {
                    currentBestIndex = highlightedColumns.indexOf(index);
                }
            });
            
            // Навигация с помощью стрелок
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                // Переход к следующему совпадению
                currentBestIndex = (currentBestIndex + 1) % highlightedColumns.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                // Переход к предыдущему совпадению
                currentBestIndex = (currentBestIndex - 1 + highlightedColumns.length) % highlightedColumns.length;
            }
            
            // Обновляем подсветку и прокручиваем к новому совпадению
            if (currentBestIndex !== -1) {
                // Удаляем все классы best-match
                appState.dataTable.columns().header().each(function(header) {
                    $(header).removeClass('best-match');
                });
                
                // Добавляем best-match к новому лучшему совпадению
                const newBestIndex = highlightedColumns[currentBestIndex];
                const bestHeader = appState.dataTable.column(newBestIndex).header();
                $(bestHeader).addClass('best-match');
                
                // Прокручиваем к лучшему совпадению
                const $headerRow = $(bestHeader).closest('tr');
                const $headerContainer = $headerRow.closest('.dataTables_scrollHead');
                
                if ($headerContainer.length) {
                    $headerContainer.animate({
                        scrollLeft: $(bestHeader).offset().left - $headerContainer.offset().left + 
                                $headerContainer.scrollLeft() - ($headerContainer.width() / 2)
                    }, 300);
                }
            }
        }
    });
    
    // Добавляем функциональность перетаскивания файлов для загрузки
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            tableContainer.classList.add('dragover');
        });
        
        tableContainer.addEventListener('dragleave', () => {
            tableContainer.classList.remove('dragover');
        });
        
        tableContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            tableContainer.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }
}

/**
 * Создать кнопку переключения темы (для будущего темного режима)
 */
function createThemeToggle() {
    // Проверяем, существует ли уже кнопка
    if (document.querySelector('.theme-toggle')) {
        return;
    }
    
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    `;
    
    document.body.appendChild(themeToggle);
    
    // Реализуем функциональность переключения темы
    themeToggle.addEventListener('click', () => {
        showToast('info', 'Скоро', 'Темный режим будет доступен в будущем обновлении');
    });
}

/**
 * Триггер клика по файловому вводу
 */
function loadFile() {
    if (elements.fileInput) {
        elements.fileInput.click();
    } else {
        showToast('error', 'Ошибка', 'Элемент ввода файла не найден');
    }
}

/**
 * Обработка загрузки файла
 * @param {File} file - Загружаемый файл
 */
async function handleFileUpload(file) {
    if (!file) return;
    
    try {
        showLoading();
        updateStatusBar(`Загрузка ${file.name}, пожалуйста подождите...`);
        
        // Показываем уведомление о загрузке
        const loadingToast = showToast('info', 'Загрузка файла', `Обработка ${file.name}...`, 0);
        
        // Создаем данные формы
        const formData = new FormData();
        formData.append('file', file);
        
        // Загружаем файл на сервер
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            let errorText = await response.text();
            throw new Error(`Загрузка не удалась: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Удаляем уведомление о загрузке
        if (loadingToast) {
            loadingToast.classList.remove('show');
            setTimeout(() => {
                const toastContainer = getToastContainer();
                if (toastContainer.contains(loadingToast)) {
                    toastContainer.removeChild(loadingToast);
                }
            }, 300);
        }
        
        // Сохраняем ID сессии и данные
        appState.sessionId = data.session_id;
        appState.columns = data.columns;
        
        // Инициализируем DataTable с колонками
        initDataTable(data.columns);
        showTable();
        
        updateStatusBar(`Загружено ${data.total_rows} строк из ${file.name}`);
        showToast('success', 'Файл загружен', `Успешно загружено ${data.total_rows} строк из ${file.name}`);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('error', 'Загрузка не удалась', error.message);
        updateStatusBar('Загрузка не удалась');
    } finally {
        hideLoading();
    }
}