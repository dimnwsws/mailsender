/**
 * Функции для работы с пользовательскими колонками
 */

/**
 * Загрузить пользовательские колонки из localStorage
 */
function loadCustomColumns() {
    try {
        const saved = localStorage.getItem('customColumns');
        if (saved) {
            appState.customColumns = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Ошибка загрузки пользовательских колонок:', error);
        appState.customColumns = [];
    }
}

/**
 * Сохранить пользовательские колонки в localStorage
 */
function saveCustomColumns() {
    try {
        localStorage.setItem('customColumns', JSON.stringify(appState.customColumns));
    } catch (error) {
        console.error('Ошибка сохранения пользовательских колонок:', error);
    }
}

/**
 * Добавить пользовательскую колонку
 * @param {string} name - Имя колонки
 * @param {string} formula - Формула для вычисления значений
 * @returns {boolean} - true, если добавление успешно
 */
function addCustomColumn(name, formula) {
    console.log("Добавление колонки:", name, formula);
    
    if (!name || !formula) {
        showToast('error', 'Ошибка', 'Имя и формула обязательны');
        return false;
    }
    
    // Проверяем, существует ли колонка с таким именем
    if (appState.customColumns.some(col => col.name === name)) {
        showToast('warning', 'Колонка существует', `Колонка с именем "${name}" уже существует`);
        return false;
    }
    
    // Добавляем в пользовательские колонки
    appState.customColumns.push({
        name,
        formula
    });
    
    // Сохраняем в localStorage
    saveCustomColumns();
    
    // Если таблица существует, добавляем колонку
    if (appState.dataTable && appState.sessionId) {
        applyCustomColumnsToTable();
    }
    
    showToast('success', 'Колонка добавлена', `Колонка "${name}" успешно добавлена`);
    return true;
}

/**
 * Удалить пользовательскую колонку
 * @param {string} name - Имя колонки для удаления
 * @returns {boolean} - true, если удаление успешно
 */
function removeCustomColumn(name) {
    console.log("Удаление колонки:", name);
    
    const index = appState.customColumns.findIndex(col => col.name === name);
    if (index === -1) return false;
    
    // Удаляем из пользовательских колонок
    appState.customColumns.splice(index, 1);
    
    // Сохраняем в localStorage
    saveCustomColumns();
    
    // Если таблица существует, удаляем колонку из таблицы
    if (appState.dataTable && appState.sessionId) {
        try {
            // Найти индекс колонки по названию
            let colIdx = -1;
            appState.dataTable.columns().every(function(idx) {
                if (this.header().textContent.replace('▼', '').trim() === name) {
                    colIdx = idx;
                    return false; // Прерываем цикл
                }
                return true; // Продолжаем цикл
            });
            
            if (colIdx >= 0) {
                appState.dataTable.column(colIdx).visible(false);
                appState.dataTable.column(colIdx).remove();
                appState.dataTable.columns.adjust().draw();
            }
        } catch (e) {
            console.error('Ошибка при удалении колонки из таблицы:', e);
        }
        
        // Перезагрузим данные, чтобы убедиться, что колонка удалена
        appState.dataTable.ajax.reload(function() {
            // Применим оставшиеся пользовательские колонки
            applyCustomColumnsToTable();
        });
    }
    
    showToast('success', 'Колонка удалена', `Колонка "${name}" удалена`);
    return true;
}

/**
 * Вычислить значение для пользовательской колонки
 * @param {string} formula - Формула для вычисления
 * @param {Object} rowData - Данные строки
 * @returns {*} - Вычисленное значение
 */
function calculateCustomColumnValue(formula, rowData) {
    try {
        // Заменяем ссылки на колонки фактическими значениями
        let calculatedFormula = formula;
        
        // Находим все шаблоны ${columnName}
        const columnRefs = formula.match(/\${([^}]+)}/g) || [];
        
        for (const ref of columnRefs) {
            // Извлекаем имя колонки
            const columnName = ref.substring(2, ref.length - 1);
            
            // Получаем значение из данных строки
            const value = rowData[columnName] !== undefined ? rowData[columnName] : '';
            
            // Заменяем в формуле с корректной обработкой строковых значений
            if (typeof value === 'string') {
                calculatedFormula = calculatedFormula.replace(ref, JSON.stringify(value));
            } else {
                calculatedFormula = calculatedFormula.replace(ref, value);
            }
        }
        
        console.log("Вычисляемая формула:", calculatedFormula);
        
        // Вычисляем формулу (безопасно)
        const result = (new Function(`try { return ${calculatedFormula}; } catch(e) { console.error(e); return "Ошибка"; }`))();
        return result;
    } catch (error) {
        console.error('Ошибка вычисления формулы:', error, formula);
        return 'Ошибка';
    }
}

/**
 * Применить пользовательские колонки к таблице
 */
function applyCustomColumnsToTable() {
    if (!appState.dataTable || !appState.sessionId) {
        console.log("Невозможно применить пользовательские колонки - таблица не инициализирована");
        return;
    }
    
    console.log("Применение пользовательских колонок:", appState.customColumns);
    
    if (appState.customColumns.length === 0) {
        console.log("Нет пользовательских колонок для применения");
        return;
    }
    
    // Получаем текущие данные
    let currentData = [];
    try {
        currentData = appState.dataTable.data().toArray();
    } catch (e) {
        console.error("Ошибка получения данных из таблицы:", e);
        // Если данные недоступны, запросим их заново с сервера
        appState.dataTable.ajax.reload(function() {
            setTimeout(() => applyCustomColumnsToTable(), 500); // Попробуем снова после загрузки
        });
        return;
    }
    
    // Для каждой пользовательской колонки
    appState.customColumns.forEach(customCol => {
        console.log(`Обработка колонки: ${customCol.name}`);
        
        // Вычисляем значения для каждой строки
        currentData.forEach((row, idx) => {
            try {
                row[customCol.name] = calculateCustomColumnValue(customCol.formula, row);
                console.log(`Строка ${idx}, результат:`, row[customCol.name]);
            } catch (e) {
                console.error(`Ошибка вычисления строки ${idx}:`, e);
                row[customCol.name] = 'Ошибка';
            }
        });
        
        // Проверяем, существует ли колонка
        let columnExists = false;
        try {
            appState.dataTable.columns().every(function(idx) {
                if (this.header().textContent.replace('▼', '').trim() === customCol.name) {
                    columnExists = true;
                    return false; // Прерываем цикл
                }
                return true; // Продолжаем цикл
            });
        } catch (e) {
            console.error("Ошибка при проверке существования колонки:", e);
            columnExists = false;
        }
        
        console.log(`Колонка ${customCol.name} существует: ${columnExists}`);
        
        if (!columnExists) {
            // Добавляем колонку в таблицу
            try {
                appState.dataTable.column.add({
                    title: customCol.name,
                    data: customCol.name,
                    name: customCol.name,
                    orderable: true,
                    defaultContent: "Н/Д"
                }).draw();
                console.log(`Колонка ${customCol.name} добавлена`);
            } catch (e) {
                console.error(`Ошибка добавления колонки ${customCol.name}:`, e);
            }
        }
    });
    
    // Обновляем данные в таблице
    try {
        appState.dataTable.clear().rows.add(currentData).draw();
        console.log("Таблица обновлена с новыми данными");
    } catch (e) {
        console.error("Ошибка при обновлении данных таблицы:", e);
    }
    
    // Обновляем статусную строку
    updateStatusBar(`Добавлено ${appState.customColumns.length} пользовательских колонок`);
}

/**
 * Инициализировать модальное окно пользовательских колонок
 */
function initCustomColumnsModal() {
    console.log("Инициализация модального окна пользовательских колонок");
    
    // Очищаем форму
    modals.customColumns.columnName.value = '';
    modals.customColumns.columnFormula.value = '';
    
    // Обновляем список сохраненных колонок
    modals.customColumns.columnsList.innerHTML = '';
    
    appState.customColumns.forEach(col => {
        const item = document.createElement('div');
        item.className = 'saved-column-item';
        
        item.innerHTML = `
            <div class="saved-column-info">
                <div class="saved-column-name">${col.name}</div>
                <div class="saved-column-formula">${col.formula}</div>
            </div>
            <div class="saved-column-actions">
                <button class="btn-remove-column" data-column="${col.name}">✕</button>
            </div>
        `;
        
        modals.customColumns.columnsList.appendChild(item);
    });
    
    // Добавляем обработчики для закрытия
    modals.customColumns.close.onclick = function() {
        console.log("Нажата кнопка закрытия");
        closeModal(modals.customColumns.modal);
    };
    
    modals.customColumns.closeBtn.onclick = function() {
        console.log("Нажата кнопка 'Закрыть'");
        closeModal(modals.customColumns.modal);
    };
    
    modals.customColumns.addButton.onclick = function() {
        console.log("Нажата кнопка добавления колонки");
        const name = modals.customColumns.columnName.value.trim();
        const formula = modals.customColumns.columnFormula.value.trim();
        
        console.log("Имя колонки:", name);
        console.log("Формула:", formula);
        
        if (addCustomColumn(name, formula)) {
            // Очищаем форму и обновляем список
            modals.customColumns.columnName.value = '';
            modals.customColumns.columnFormula.value = '';
            initCustomColumnsModal();
        }
    };
    
    // Добавляем обработчики событий для кнопок удаления
    document.querySelectorAll('.btn-remove-column').forEach(btn => {
        btn.addEventListener('click', () => {
            const columnName = btn.getAttribute('data-column');
            console.log("Нажата кнопка удаления колонки:", columnName);
            
            if (confirm(`Вы уверены, что хотите удалить колонку "${columnName}"?`)) {
                removeCustomColumn(columnName);
                initCustomColumnsModal(); // Обновляем список
            }
        });
    });
    
    // Открываем модальное окно
    openModal(modals.customColumns.modal);
}