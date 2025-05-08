/**
 * Функции для работы с пресетами
 */

/**
 * Загрузить пресеты фильтров с сервера API
 * @returns {Promise<Array>} - Массив пресетов
 */
async function loadFilterPresets() {
    try {
        const presets = await fetchAPI('/api/presets');
        
        // Убедимся, что presets - это массив
        appState.filterPresets = Array.isArray(presets) ? presets : [];
        
        updateStatusBar(`Загружено ${appState.filterPresets.length} пресетов фильтров`);
        return appState.filterPresets;
    } catch (error) {
        console.error('Ошибка загрузки пресетов:', error);
        appState.filterPresets = [];
        return [];
    }
}

/**
 * Сохранить пресеты фильтров на сервер API
 */
async function saveFilterPresets() {
    if (!Array.isArray(appState.filterPresets)) {
        console.error('filterPresets не является массивом');
        return;
    }
    
    try {
        await fetchAPI('/api/presets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appState.filterPresets)
        });
        
        updateStatusBar(`Сохранено ${appState.filterPresets.length} пресетов фильтров`);
        showToast('success', 'Пресеты сохранены', `${appState.filterPresets.length} пресетов сохранено успешно`);
    } catch (error) {
        console.error('Ошибка сохранения пресетов:', error);
        showToast('error', 'Ошибка сохранения', 'Не удалось сохранить пресеты: ' + error.message);
    }
}

/**
 * Сохранить текущий фильтр как пресет
 */
function saveFilterPreset() {
    // Проверяем, инициализирован ли модальный объект фильтра
    if (!modals.filter || !modals.filter.valueList) {
        console.error('Модальное окно фильтра не инициализировано');
        return;
    }
    
    const name = prompt('Введите имя для этого пресета:');
    if (!name) return;
    
    // Получаем выбранные значения
    const checkboxes = modals.filter.valueList.querySelectorAll('input[type="checkbox"]');
    const selectedValues = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let value = checkbox.value;
            if (value === 'null') {
                value = null;
            }
            selectedValues.push(value);
        }
    });
    
    // Проверяем, есть ли выбранные значения
    if (selectedValues.length === 0) {
        showToast('warning', 'Нет выбранных значений', 'Выберите хотя бы одно значение для создания пресета');
        return;
    }
    
    // Создаем новый пресет
    const preset = {
        name: name,
        columnFilters: [],
        visibleColumns: []
    };
    
    // Проверяем, определено ли имя текущей колонки
    if (!appState.currentColumnName) {
        showToast('error', 'Ошибка', 'Имя текущей колонки не определено');
        return;
    }
    
    // Добавляем текущий фильтр колонки
    preset.columnFilters.push({
        column: appState.currentColumnName,
        values: selectedValues
    });
    
    // Добавляем другие активные фильтры
    if (Array.isArray(appState.activeFilters)) {
        appState.activeFilters.forEach(filter => {
            if (filter.column !== appState.currentColumnName) {
                preset.columnFilters.push({
                    column: filter.column,
                    values: filter.values
                });
            }
        });
    }
    
    // Добавляем видимые колонки, если DataTable инициализирована
    if (appState.dataTable) {
        const visibleColumnIndexes = appState.dataTable.columns().visible().toArray();
        appState.dataTable.columns().header().toArray().forEach((header, index) => {
            if (!header) return;
            
            if (visibleColumnIndexes.includes(index)) {
                const columnName = header.textContent?.replace('▼', '').trim() || '';
                if (columnName) {
                    preset.visibleColumns.push(columnName);
                }
            }
        });
    }
    
    // Добавляем пользовательские колонки
    if (Array.isArray(appState.customColumns)) {
        preset.customColumns = appState.customColumns.map(col => ({
            name: col.name,
            formula: col.formula
        }));
    } else {
        preset.customColumns = [];
    }
    
    // Проверяем, существует ли пресет с таким именем
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
    }
    
    const existingPresetIndex = appState.filterPresets.findIndex(p => p.name === name);
    if (existingPresetIndex !== -1) {
        if (confirm(`Пресет "${name}" уже существует. Вы хотите заменить его?`)) {
            appState.filterPresets[existingPresetIndex] = preset;
        } else {
            return;
        }
    } else {
        appState.filterPresets.push(preset);
    }
    
    // Сохраняем пресеты
    saveFilterPresets();
    
    // Убедимся, что модальное окно фильтра определено и presets существует
    if (modals.filter && modals.filter.presets) {
        // Обновляем выпадающий список пресетов с анимацией
        modals.filter.presets.innerHTML = '<option value="">Выбрать пресет...</option>';
        appState.filterPresets.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            modals.filter.presets.appendChild(option);
        });
        
        // Анимируем выпадающий список
        $(modals.filter.presets).css({
            backgroundColor: 'var(--primary-light)',
            borderColor: 'var(--primary-color)'
        });
        
        setTimeout(() => {
            $(modals.filter.presets).css({
                transition: 'background-color 0.5s ease, border-color 0.5s ease',
                backgroundColor: '',
                borderColor: ''
            });
        }, 1000);
        
        // Выбираем новый пресет
        modals.filter.presets.value = name;
    }
    
    // Показываем уведомление
    showToast('success', 'Пресет сохранен', `Пресет "${name}" был успешно сохранен`);
}

/**
 * Сохранить текущие настройки как пресет
 */
function saveCurrentSettingsAsPreset() {
    const name = prompt('Введите имя для нового пресета:');
    if (!name) return;
    
    // Создаем новый пресет
    const preset = {
        name: name,
        columnFilters: [],
        visibleColumns: []
    };
    
    // Добавляем все активные фильтры
    if (Array.isArray(appState.activeFilters)) {
        preset.columnFilters = [...appState.activeFilters];
    } else {
        preset.columnFilters = [];
    }
    
    // Добавляем все видимые колонки, если DataTable инициализирована
    if (appState.dataTable) {
        const visibleColumnIndexes = appState.dataTable.columns().visible().toArray();
        appState.dataTable.columns().header().toArray().forEach((header, index) => {
            if (!header) return;
            
            if (visibleColumnIndexes.includes(index)) {
                const columnName = header.textContent?.replace('▼', '').trim() || '';
                if (columnName) {
                    preset.visibleColumns.push(columnName);
                }
            }
        });
    }
    
    // Добавляем пользовательские колонки
    if (Array.isArray(appState.customColumns)) {
        preset.customColumns = appState.customColumns.map(col => ({
            name: col.name,
            formula: col.formula
        }));
    } else {
        preset.customColumns = [];
    }
    
    // Проверяем, существует ли пресет с таким именем
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
    }
    
    const existingPresetIndex = appState.filterPresets.findIndex(p => p.name === name);
    if (existingPresetIndex !== -1) {
        if (confirm(`Пресет "${name}" уже существует. Вы хотите заменить его?`)) {
            appState.filterPresets[existingPresetIndex] = preset;
        } else {
            return;
        }
    } else {
        appState.filterPresets.push(preset);
    }
    
    // Сохраняем пресеты
    saveFilterPresets();
    
    // Обновляем модальное окно пресетов
    if (typeof initPresetsModal === 'function') {
        initPresetsModal();
    }
    
    // Показываем уведомление
    showToast('success', 'Пресет сохранен', `Текущие настройки сохранены как пресет "${name}"`);
}

/**
 * Применить пресет фильтра
 * @param {string} presetName - Имя пресета для применения
 * @returns {Promise<boolean>} - true, если применение успешно
 */
async function applyFilterPreset(presetName) {
    if (!Array.isArray(appState.filterPresets)) {
        console.error('filterPresets не является массивом');
        return false;
    }
    
    const preset = appState.filterPresets.find(p => p.name === presetName);
    if (!preset) return false;
    
    try {
        showLoading();
        
        // Показываем уведомление
        const loadingToast = showToast('info', 'Применение пресета', `Применение пресета "${presetName}"...`, 0);
        
        // Очищаем текущие фильтры
        appState.activeFilters = [];
        
        // Проверяем, инициализирована ли DataTable
        if (appState.dataTable) {
            // Применяем видимость колонок с анимацией
            if (Array.isArray(preset.visibleColumns) && preset.visibleColumns.length > 0) {
                // Сначала скрываем все колонки
                appState.dataTable.columns().visible(false);
                
                // Показываем только видимые колонки с последовательной анимацией
                appState.dataTable.columns().header().toArray().forEach((header, index) => {
                    if (!header) return;
                    
                    const columnName = header.textContent?.replace('▼', '').trim() || '';
                    if (columnName && preset.visibleColumns.includes(columnName)) {
                        setTimeout(() => {
                            appState.dataTable.column(index).visible(true);
                        }, index * 50); // Задержка для эффекта появления
                    }
                });
            }
        }
        
        // Применяем фильтры
        if (Array.isArray(preset.columnFilters) && preset.columnFilters.length > 0) {
            // Устанавливаем активные фильтры
            appState.activeFilters = preset.columnFilters;
            
            if (appState.sessionId) {
                // Применяем фильтры на сервере
                await fetchAPI(`/api/filter/${appState.sessionId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filters: appState.activeFilters
                    })
                });
                
                // Перезагружаем данные таблицы с анимацией, если DataTable инициализирована
                if (appState.dataTable) {
                    $('.dataTables_wrapper').css({
                        opacity: 0.5,
                        transform: 'translateY(10px)'
                    });
                    
                    appState.dataTable.ajax.reload(function() {
                        $('.dataTables_wrapper').css({
                            transition: 'opacity 0.5s ease, transform 0.5s ease',
                            opacity: 1,
                            transform: 'translateY(0)'
                        });
                    });
                }
            }
        }
        
        // Применяем пользовательские колонки
        if (Array.isArray(preset.customColumns) && preset.customColumns.length > 0) {
            appState.customColumns = preset.customColumns;
            saveCustomColumns();
            
            if (typeof applyCustomColumnsToTable === 'function') {
                applyCustomColumnsToTable();
            }
        }
        
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
        
        updateStatusBar(`Применен пресет "${presetName}"`);
        showToast('success', 'Пресет применен', `Успешно применен пресет "${presetName}"`);
        return true;
    } catch (error) {
        console.error('Ошибка применения пресета:', error);
        showToast('error', 'Ошибка пресета', `Ошибка применения пресета: ${error.message}`);
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Инициализировать модальное окно управления пресетами
 */
function initPresetsModal() {
    // Проверяем, инициализировано ли модальное окно пресетов
    if (!modals.presets || !modals.presets.modal) {
        console.error('Модальное окно пресетов не инициализировано');
        return;
    }
    
    // Очищаем предыдущее содержимое
    modals.presets.presetSelect.innerHTML = '';
    modals.presets.presetInfo.innerHTML = '';
    
    // Проверяем, что filterPresets является массивом
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
    }
    
    // Добавляем опции для каждого пресета с анимацией
    if (appState.filterPresets.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Нет доступных пресетов';
        modals.presets.presetSelect.appendChild(option);
        
        // Создаем анимированное пустое состояние
        modals.presets.presetInfo.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Нет доступных пресетов</p>
                <p class="empty-hint">Создайте пресеты при фильтрации колонок или нажмите на кнопку "Сохранить текущие настройки"</p>
            </div>
        `;
    } else {
        appState.filterPresets.forEach((preset, index) => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            modals.presets.presetSelect.appendChild(option);
            
            // Добавляем анимацию появления к опции
            option.style.opacity = '0';
            setTimeout(() => {
                option.style.transition = 'opacity 0.3s ease';
                option.style.opacity = '1';
            }, index * 100);
        });
        
        // Обновляем информацию о первом пресете
        updatePresetInfo(appState.filterPresets[0].name);
    }
    
    // Добавляем обработчики событий для закрытия
    modals.presets.close.onclick = function() {
        closeModal(modals.presets.modal);
    };
    
    modals.presets.closeBtn.onclick = function() {
        closeModal(modals.presets.modal);
    };
    
    // Добавляем обработчики для кнопок
    modals.presets.applyBtn.onclick = function() {
        const presetName = modals.presets.presetSelect.value;
        if (presetName) {
            applyFilterPreset(presetName);
            closeModal(modals.presets.modal);
        }
    };
    
    modals.presets.renameBtn.onclick = function() {
        renamePreset();
    };
    
    modals.presets.deleteBtn.onclick = function() {
        deletePreset();
    };
    
    modals.presets.saveBtn.onclick = function() {
        saveCurrentSettingsAsPreset();
    };
    
    modals.presets.presetSelect.onchange = function() {
        updatePresetInfo(this.value);
    };
    
    // Открываем модальное окно
    openModal(modals.presets.modal);
}

/**
 * Обновить информацию о пресете с анимацией
 * @param {string} presetName - Имя пресета для отображения информации
 */
function updatePresetInfo(presetName) {
    if (!modals.presets || !modals.presets.presetInfo) {
        console.error('Элемент информации о пресете не инициализирован');
        return;
    }
    
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
    }
    
    const preset = appState.filterPresets.find(p => p.name === presetName);
    if (!preset) {
        modals.presets.presetInfo.innerHTML = 'Пресет не выбран';
        return;
    }
    
    // Исчезание текущей информации
    modals.presets.presetInfo.style.opacity = '0';
    
    setTimeout(() => {
        // Генерируем HTML с информацией с проверками
        let info = `<b>Имя:</b> ${preset.name}<br>`;
        info += `<b>Видимые колонки:</b> ${Array.isArray(preset.visibleColumns) ? preset.visibleColumns.length : 0} колонок<br>`;
        info += `<b>Условия фильтра:</b> ${Array.isArray(preset.columnFilters) ? preset.columnFilters.length : 0} условий<br>`;
        info += `<b>Пользовательские колонки:</b> ${Array.isArray(preset.customColumns) ? preset.customColumns.length : 0} колонок<br>`;
        
        // Добавляем подробности об условиях фильтра
        if (Array.isArray(preset.columnFilters) && preset.columnFilters.length > 0) {
            info += '<ul>';
            preset.columnFilters.forEach(filter => {
                if (filter && filter.column && Array.isArray(filter.values)) {
                    info += `<li>${filter.column}: ${filter.values.length} выбранных значений</li>`;
                }
            });
            info += '</ul>';
        }
        
        modals.presets.presetInfo.innerHTML = info;
        
        // Появление новой информации
        modals.presets.presetInfo.style.transition = 'opacity 0.3s ease';
        modals.presets.presetInfo.style.opacity = '1';
    }, 300);
}

/**
 * Переименовать пресет
 */
function renamePreset() {
    // Проверяем инициализацию модального окна пресетов
    if (!modals.presets || !modals.presets.presetSelect) {
        console.error('Модальное окно пресетов не инициализировано');
        return;
    }
    
    const presetName = modals.presets.presetSelect.value;
    if (!presetName) return;
    
    const newName = prompt('Введите новое имя:', presetName);
    if (!newName || newName === presetName) return;
    
    // Проверяем, что filterPresets является массивом
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
    }
    
    // Проверяем, существует ли имя
    if (appState.filterPresets.some(p => p.name === newName)) {
        showToast('warning', 'Имя существует', `Пресет с именем "${newName}" уже существует`);
        return;
    }
    
    // Находим и переименовываем пресет
    const preset = appState.filterPresets.find(p => p.name === presetName);
    if (preset) {
        preset.name = newName;
        saveFilterPresets();
        
        // Обновляем элемент выбора с анимацией
        const option = modals.presets.presetSelect.querySelector(`option[value="${presetName}"]`);
        if (option) {
            option.value = newName;
            option.textContent = newName;
            modals.presets.presetSelect.value = newName;
            
            // Подсвечиваем переименованную опцию
            $(option).css({
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-color)'
            });
            
            setTimeout(() => {
                $(option).css({
                    transition: 'background-color 0.5s ease, color 0.5s ease',
                    backgroundColor: '',
                    color: ''
                });
            }, 1000);
        }
        
        // Обновляем информацию
        updatePresetInfo(newName);
        
        // Показываем уведомление
        showToast('success', 'Пресет переименован', `Пресет переименован в "${newName}"`);
    }
}

/**
 * Удалить пресет
 */
function deletePreset() {
    // Проверяем инициализацию модального окна пресетов
    if (!modals.presets || !modals.presets.presetSelect) {
        console.error('Модальное окно пресетов не инициализировано');
        return;
    }
    
    const presetName = modals.presets.presetSelect.value;
    if (!presetName) return;
    
    if (!confirm(`Вы уверены, что хотите удалить пресет "${presetName}"?`)) return;
    
    // Проверяем, что filterPresets является массивом
    if (!Array.isArray(appState.filterPresets)) {
        appState.filterPresets = [];
        return;
    }
    
    // Удаляем пресет
    appState.filterPresets = appState.filterPresets.filter(p => p.name !== presetName);
    saveFilterPresets();
    
    // Показываем уведомление
    showToast('info', 'Пресет удален', `Удален пресет "${presetName}"`);
    
    // Реинициализируем модальное окно
    initPresetsModal();
}

/**
 * Очистить все фильтры
 */
async function clearAllFilters() {
    if (!appState.sessionId) return;
    
    try {
        showLoading();
        
        // Показываем уведомление
        const loadingToast = showToast('info', 'Очистка фильтров', 'Удаление всех фильтров...', 0);
        
        // Очищаем активные фильтры
        appState.activeFilters = [];
        
        // Применяем (пустые) фильтры на сервере
        await fetchAPI(`/api/filter/${appState.sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: []
            })
        });
        
        // Перезагружаем данные таблицы с анимацией, если DataTable инициализирована
        if (appState.dataTable) {
            $('.dataTables_wrapper').css({
                opacity: 0.5,
                transform: 'translateY(10px)'
            });
            
            appState.dataTable.ajax.reload(function() {
                $('.dataTables_wrapper').css({
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                    opacity: 1,
                    transform: 'translateY(0)'
                });
            });
        }
        
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
        
        updateStatusBar('Все фильтры очищены');
        showToast('success', 'Фильтры очищены', 'Все фильтры были удалены');
    } catch (error) {
        console.error('Ошибка очистки фильтров:', error);
        showToast('error', 'Ошибка очистки', `Ошибка очистки фильтров: ${error.message}`);
    } finally {
        hideLoading();
    }
}