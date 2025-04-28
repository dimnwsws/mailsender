/**
 * Функции для работы с модальными окнами
 */

/**
 * Инициализировать модальное окно выбора колонок
 */
function initColumnSelectorModal() {
    if (!appState.sessionId) {
        showToast('warning', 'Нет данных', 'Сначала загрузите файл');
        return;
    }

    // Получаем колонки
    const columns = appState.dataTable.columns();
    const visibleColumnIndexes = columns.visible().toArray();
    
    // Очищаем предыдущее содержимое
    modals.columnSelector.columnList.innerHTML = '';
    
    // Добавляем чекбоксы для каждой колонки с анимацией
    columns.header().toArray().forEach((header, index) => {
        const columnName = header.textContent.replace('▼', '').trim();
        
        const label = document.createElement('label');
        label.style.opacity = '0';
        label.style.transform = 'translateY(10px)';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = index;
        checkbox.checked = visibleColumnIndexes.includes(index);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(columnName));
        modals.columnSelector.columnList.appendChild(label);
        
        // Анимируем появление
        setTimeout(() => {
            label.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            label.style.opacity = '1';
            label.style.transform = 'translateY(0)';
        }, index * 30); // Добавляем задержку для эффекта появления
    });
    
    // Добавляем обработчики событий для закрытия и функциональности
    modals.columnSelector.close.onclick = function() {
        closeModal(modals.columnSelector.modal);
    };
    
    modals.columnSelector.cancel.onclick = function() {
        closeModal(modals.columnSelector.modal);
    };
    
    modals.columnSelector.apply.onclick = function() {
        applyColumnSelection();
    };
    
    modals.columnSelector.selectAll.onclick = function() {
        selectAllColumns(true);
    };
    
    modals.columnSelector.deselectAll.onclick = function() {
        selectAllColumns(false);
    };
    
    modals.columnSelector.searchInput.oninput = function() {
        filterColumns(this.value);
    };
    
    // Открываем модальное окно
    openModal(modals.columnSelector.modal);
}

/**
 * Применить выбор колонок
 */
function applyColumnSelection() {
    const checkboxes = modals.columnSelector.columnList.querySelectorAll('input[type="checkbox"]');
    const selectedColumns = [];
    const visibleColumnNames = [];
    
    checkboxes.forEach(checkbox => {
        const columnIndex = parseInt(checkbox.value);
        if (checkbox.checked) {
            selectedColumns.push(columnIndex);
            // Получаем имя колонки и добавляем в список видимых
            const columnName = appState.dataTable.column(columnIndex).dataSrc();
            visibleColumnNames.push(columnName);
            appState.dataTable.column(columnIndex).visible(true);
        } else {
            appState.dataTable.column(columnIndex).visible(false);
        }
    });
    
    // Отладочный вывод
    console.log("Видимые колонки:", visibleColumnNames);
    
    // Сохраняем видимые колонки в API для экспорта
    if (appState.sessionId) {
        fetchAPI(`/api/update_visible_columns/${appState.sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                visible_columns: visibleColumnNames
            })
        })
        .then(response => {
            console.log("Колонки успешно сохранены на сервере:", response);
        })
        .catch(error => {
            console.error('Ошибка сохранения видимых колонок:', error);
        });
    }
    
    // Обновляем таблицу с анимацией
    appState.dataTable.columns.adjust().draw(false);
    
    // Обновляем статусную строку
    const totalColumns = checkboxes.length;
    const visibleColumns = selectedColumns.length;
    updateStatusBar(`Отображается ${visibleColumns} из ${totalColumns} колонок`);
    
    // Показываем уведомление
    showToast('success', 'Колонки обновлены', `Показаны ${visibleColumns} из ${totalColumns} колонок`);
    
    // Закрываем модальное окно
    closeModal(modals.columnSelector.modal);
}

/**
 * Инициализировать модальное окно фильтра
 * @param {number} columnIndex - Индекс колонки для фильтрации
 */
async function initFilterModal(columnIndex) {
    if (!appState.sessionId) {
        showToast('warning', 'Нет данных', 'Сначала загрузите файл');
        return;
    }

    try {
        showLoading();
        
        const column = appState.dataTable.column(columnIndex);
        const columnName = column.header().textContent.replace('▼', '').trim();
        
        // Сохраняем имя текущей колонки
        appState.currentColumnName = columnName;
        
        // Устанавливаем имя колонки в модальном окне
        modals.filter.columnName.textContent = `Фильтр ${columnName}`;
        
        // Получаем все данные для этой колонки, чтобы извлечь уникальные значения
        const response = await fetchAPI(`/api/data/${appState.sessionId}?length=-1`);
        const data = response.data;
        
        // Получаем уникальные значения из колонки
        const uniqueValues = [...new Set(data.map(row => row[columnName]))];
        
        // Очищаем предыдущее содержимое
        modals.filter.valueList.innerHTML = '';
        
        // Добавляем чекбоксы для каждого значения с анимацией
        uniqueValues.forEach((value, index) => {
            const displayValue = value === null || value === '' ? '(Пусто)' : value;
            
            const label = document.createElement('label');
            label.style.opacity = '0';
            label.style.transform = 'translateY(10px)';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = value === null ? 'null' : value;
            checkbox.checked = true; // По умолчанию все отмечены
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(displayValue));
            modals.filter.valueList.appendChild(label);
            
            // Анимируем появление
            setTimeout(() => {
                label.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                label.style.opacity = '1';
                label.style.transform = 'translateY(0)';
            }, index * 20); // Задержка для эффекта появления
        });
        
        // Обновляем выпадающий список пресетов
        modals.filter.presets.innerHTML = '<option value="">Выбрать пресет...</option>';
        appState.filterPresets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            modals.filter.presets.appendChild(option);
        });
        
        // Добавляем обработчики событий для закрытия
        modals.filter.close.onclick = function() {
            closeModal(modals.filter.modal);
        };
        
        modals.filter.cancel.onclick = function() {
            closeModal(modals.filter.modal);
        };
        
        // Добавляем обработчики для остальных кнопок
        modals.filter.apply.onclick = function() {
            applyFilter();
        };
        
        modals.filter.applyPreset.onclick = function() {
            const presetName = modals.filter.presets.value;
            if (presetName) {
                applyFilterPreset(presetName);
                closeModal(modals.filter.modal);
            }
        };
        
        modals.filter.savePreset.onclick = function() {
            saveFilterPreset();
        };
        
        modals.filter.selectAll.onclick = function() {
            selectAllValues(true);
        };
        
        modals.filter.deselectAll.onclick = function() {
            selectAllValues(false);
        };
        
        modals.filter.searchInput.oninput = function() {
            filterValues(this.value);
        };
        
        // Открываем модальное окно
        openModal(modals.filter.modal);
    } catch (error) {
        console.error('Ошибка при инициализации фильтра:', error);
        showToast('error', 'Ошибка фильтра', `Ошибка загрузки опций фильтра: ${error.message}`);
    } finally {
        hideLoading();
    }
}

/**
 * Применить фильтр
 */
async function applyFilter() {
    const checkboxes = modals.filter.valueList.querySelectorAll('input[type="checkbox"]');
    const selectedValues = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            // Обрабатываем null/пустые значения
            let value = checkbox.value;
            if (value === 'null') {
                value = null;
            }
            selectedValues.push(value);
        }
    });
    
    // Обновляем активные фильтры
    const columnName = appState.currentColumnName;
    const existingFilterIndex = appState.activeFilters.findIndex(filter => filter.column === columnName);
    
    if (existingFilterIndex !== -1) {
        appState.activeFilters[existingFilterIndex].values = selectedValues;
    } else {
        appState.activeFilters.push({
            column: columnName,
            values: selectedValues
        });
    }
    
    try {
        showLoading();
        
        // Применяем фильтры на сервере
        const response = await fetchAPI(`/api/filter/${appState.sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filters: appState.activeFilters
            })
        });
        
        // Перезагружаем данные таблицы с анимацией
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
            
            // После перезагрузки данных применяем пользовательские колонки
            applyCustomColumnsToTable();
        });
        
        // Обновляем статусную строку
        updateStatusBar(`Фильтр применен: ${response.filtered_rows} из ${response.total_rows} строк видимы`);
        
        // Показываем уведомление
        showToast('success', 'Фильтр применен', 
                 `${response.filtered_rows} из ${response.total_rows} строк соответствуют фильтру`);
    } catch (error) {
        console.error('Ошибка применения фильтра:', error);
        showToast('error', 'Ошибка фильтра', `Ошибка применения фильтра: ${error.message}`);
    } finally {
        hideLoading();
        
        // Закрываем модальное окно
        closeModal(modals.filter.modal);
    }
}

/**
 * Фильтровать значения в модальном окне фильтра
 * @param {string} searchText - Текст для поиска
 */
function filterValues(searchText) {
    const labels = modals.filter.valueList.querySelectorAll('label');
    
    labels.forEach(label => {
        const valueName = label.textContent.toLowerCase();
        if (valueName.includes(searchText.toLowerCase())) {
            label.style.display = '';
            // Анимируем элементы, которые совпадают
            label.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            label.style.opacity = '0';
            label.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                label.style.opacity = '1';
                label.style.transform = 'translateY(0)';
            }, 10);
        } else {
            // Исчезание несовпадающих элементов
            label.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            label.style.opacity = '0';
            label.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                label.style.display = 'none';
            }, 300);
        }
    });
}

/**
 * Выбрать/снять выбор со всех значений
 * @param {boolean} select - true для выбора всех, false для снятия выбора
 */
function selectAllValues(select) {
    const checkboxes = modals.filter.valueList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.parentElement.style.display !== 'none') {
            // Добавляем анимацию
            checkbox.parentElement.classList.add('pulse');
            setTimeout(() => {
                checkbox.parentElement.classList.remove('pulse');
            }, 500);
            
            checkbox.checked = select;
        }
    });
    
    // Показываем уведомление
    showToast('info', select ? 'Выбраны все' : 'Сняты все', 
              select ? 'Выбраны все видимые значения' : 'Сняты все видимые значения');
}

/**
 * Инициализировать модальное окно экспорта
 */
function initExportModal() {
    if (!appState.sessionId) {
        showToast('warning', 'Нет данных', 'Сначала загрузите файл');
        return;
    }
    
    // Обновляем информацию перед открытием модального окна
    if (appState.dataTable) {
        let visibleCount = 0;
        appState.dataTable.columns().every(function() {
            if (this.visible()) visibleCount++;
        });
        
        // Добавим небольшое информационное сообщение о количестве колонок
        const exportInfo = document.getElementById('export-info');
        if (exportInfo) {
            exportInfo.textContent = `Будет экспортировано ${visibleCount} колонок`;
        } else {
            // Создаем элемент, если его нет
            const infoElement = document.createElement('p');
            infoElement.id = 'export-info';
            infoElement.textContent = `Будет экспортировано ${visibleCount} колонок`;
            infoElement.style.marginTop = '10px';
            infoElement.style.textAlign = 'center';
            infoElement.style.color = 'var(--text-light)';
            
            // Добавляем элемент в модальное окно
            const modalBody = modals.export.modal.querySelector('.modal-body');
            modalBody.appendChild(infoElement);
        }
    }
    
    // Добавляем обработчики событий для закрытия
    modals.export.close.onclick = function() {
        closeModal(modals.export.modal);
    };
    
    modals.export.cancelBtn.onclick = function() {
        closeModal(modals.export.modal);
    };
    
    // Добавляем обработчики для кнопок экспорта
    modals.export.csvBtn.onclick = function() {
        exportData('csv');
    };
    
    modals.export.excelBtn.onclick = function() {
        exportData('excel');
    };
    
    modals.export.jsonBtn.onclick = function() {
        exportData('json');
    };
    
    openModal(modals.export.modal);
}

/**
 * Экспортировать данные в указанном формате
 * @param {string} format - Формат экспорта (csv, excel, json)
 */
function exportData(format) {
    if (!appState.sessionId) {
        showToast('warning', 'Нет данных', 'Сначала загрузите файл');
        return;
    }
    
    // Собираем видимые колонки перед экспортом
    const visibleColumnNames = [];
    if (appState.dataTable) {
        appState.dataTable.columns().every(function(index) {
            if (this.visible()) {
                const columnName = this.dataSrc();
                visibleColumnNames.push(columnName);
            }
        });

        // Синхронизируем с сервером перед экспортом
        fetchAPI(`/api/update_visible_columns/${appState.sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                visible_columns: visibleColumnNames
            })
        }).then(() => {
            console.log("Экспорт колонок:", visibleColumnNames);
            
            // Показываем уведомление
            showToast('info', 'Начало экспорта', `Подготовка экспорта в формате ${format.toUpperCase()}...`);
            
            // Создаем ссылку для скачивания файла
            const link = document.createElement('a');
            link.href = `/api/export/${appState.sessionId}?format=${format}`;
            link.target = '_blank';
            
            // Добавляем ссылку в документ и кликаем по ней
            document.body.appendChild(link);
            link.click();
            
            // Удаляем ссылку
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
            
            // Закрываем модальное окно
            closeModal(modals.export.modal);
            
            updateStatusBar(`Экспорт данных в формате ${format.toUpperCase()}...`);
            
            // Показываем уведомление после задержки (предполагаем, что загрузка началась)
            setTimeout(() => {
                showToast('success', 'Экспорт завершен', `Экспорт в формате ${format.toUpperCase()} готов для скачивания`);
            }, 1500);
        }).catch(error => {
            console.error("Ошибка сохранения видимых колонок перед экспортом:", error);
            showToast('error', 'Ошибка экспорта', 'Не удалось подготовить данные для экспорта');
        });
    } else {
        // Если DataTable не инициализирован, просто экспортируем всё
        showToast('info', 'Начало экспорта', `Подготовка экспорта в формате ${format.toUpperCase()}...`);
        
        const link = document.createElement('a');
        link.href = `/api/export/${appState.sessionId}?format=${format}`;
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        closeModal(modals.export.modal);
        
        updateStatusBar(`Экспорт данных в формате ${format.toUpperCase()}...`);
        
        setTimeout(() => {
            showToast('success', 'Экспорт завершен', `Экспорт в формате ${format.toUpperCase()} готов для скачивания`);
        }, 1500);
    }
}