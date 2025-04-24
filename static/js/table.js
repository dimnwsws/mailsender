/**
 * Функции для работы с таблицей
 */

/**
 * Инициализировать DataTable с данными с сервера
 * @param {Array<string>} columns - Массив имен колонок
 * @returns {Object} - Объект DataTable
 */
function initDataTable(columns) {
    // Определяем конфигурацию колонок
    const columnDefs = columns.map(column => ({
        title: column,
        data: column,
        name: column,
        className: 'editable',
        orderable: true, // Включаем сортировку
        render: function(data, type, row) {
            // Обрабатываем null значения
            if (data === null) return '';
            return data;
        }
    }));
    
    // Удаляем существующую DataTable, если она есть
    if (appState.dataTable) {
        appState.dataTable.destroy();
        elements.dataTable.innerHTML = '';
    }
    
    // Инициализируем DataTable с серверной обработкой
    appState.dataTable = $(elements.dataTable).DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: `/api/data/${appState.sessionId}`,
            type: 'GET',
            data: function(d) {
                // Добавляем метку времени для предотвращения кэширования
                d._t = Date.now();
                
                // Добавляем фильтры при необходимости
                if (appState.activeFilters.length > 0) {
                    d.filters = JSON.stringify(appState.activeFilters);
                }
                return d;
            },
            error: function(xhr, error, thrown) {
                console.error('Ошибка загрузки данных DataTables:', error, thrown);
                showToast('error', 'Ошибка загрузки данных', 'Ошибка загрузки данных таблицы. Пожалуйста, попробуйте снова.');
            }
        },
        columns: columnDefs,
        dom: 'frtip', // фильтр, обработка, таблица, информация, пагинация
        pageLength: 25,
        ordering: true, // Включаем сортировку
        order: [], // Пустой массив означает, что начальная сортировка отключена
        searching: true,
        scrollX: true,
        scrollY: '50vh',
        scrollCollapse: true,
        language: {
            processing: "Загрузка данных...",
            search: "",
            searchPlaceholder: "Поиск...",
            lengthMenu: "Показать _MENU_ записей",
            info: "Записи с _START_ до _END_ из _TOTAL_",
            infoEmpty: "Записи с 0 до 0 из 0",
            infoFiltered: "(отфильтровано из _MAX_ записей)",
            infoPostFix: "",
            loadingRecords: "Загрузка записей...",
            zeroRecords: "Записи не найдены",
            emptyTable: "Данные отсутствуют",
            paginate: {
                first: "Первая",
                previous: "Предыдущая",
                next: "Следующая",
                last: "Последняя"
            },
            aria: {
                sortAscending: ": нажмите для сортировки по возрастанию",
                sortDescending: ": нажмите для сортировки по убыванию"
            }
        },
        // Включаем изменение порядка колонок
        colReorder: true,
        stateSave: true, // Сохраняем состояние в localStorage
        stateDuration: -1, // Бессрочное хранение
        drawCallback: function() {
            // Добавляем анимацию к строкам
            const rows = document.querySelectorAll('table.dataTable tbody tr');
            rows.forEach((row, index) => {
                row.style.opacity = '0';
                row.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, index * 30); // Добавляем задержку для эффекта появления
            });
        },
        initComplete: function() {
            // Добавляем кнопки фильтра к заголовкам колонок
            this.api().columns().every(function(index) {
                const column = this;
                const header = $(column.header());
                
                // Создаем кнопку фильтра
                const button = $('<span class="filter-icon">▼</span>');
                button.on('click', function() {
                    initFilterModal(index);
                });
                
                // Добавляем кнопку к заголовку
                header.append(button);
            });
            
            // Анимируем появление таблицы
            $('.dataTables_wrapper').css({
                opacity: 0,
                transform: 'translateY(20px)'
            });
            
            setTimeout(() => {
                $('.dataTables_wrapper').css({
                    transition: 'opacity 0.5s ease, transform 0.5s ease',
                    opacity: 1,
                    transform: 'translateY(0)'
                });
            }, 100);
            
            // Применяем пользовательские колонки
            applyCustomColumnsToTable();
        }
    });
    
    // Делаем ячейки редактируемыми по двойному клику
    $(elements.dataTable).on('dblclick', 'td.editable', function() {
        const cell = appState.dataTable.cell(this);
        const data = cell.data();
        const oldValue = data === null ? '' : data;
        
        // Создаем элемент ввода
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldValue;
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.padding = '10px';
        input.style.margin = '0';
        input.style.border = 'none';
        input.style.background = 'var(--primary-light)';
        input.style.borderRadius = '0';
        input.style.boxShadow = 'inset 0 0 0 2px var(--primary-color)';
        input.style.fontSize = '14px';
        
        // Заменяем содержимое ячейки на элемент ввода
        $(this).html('').append(input);
        input.focus();
        
        // Обрабатываем потерю фокуса и нажатие Enter
        $(input).on('blur keydown', async function(e) {
            if (e.type === 'blur' || (e.type === 'keydown' && e.keyCode === 13)) {
                const newValue = input.value;
                
                // Только обновляем, если значение изменилось
                if (newValue !== oldValue) {
                    try {
                        showLoading();
                        
                        // Получаем информацию о строке и колонке
                        const rowIndex = cell.index().row;
                        const rowData = appState.dataTable.row(rowIndex).data();
                        const columnIndex = cell.index().column;
                        // Получаем имя колонки из заголовка
                        const columnName = appState.dataTable.column(columnIndex).dataSrc();
                        
                        // Обновляем на сервере
                        await fetchAPI(`/api/update/${appState.sessionId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                row: rowIndex,
                                column: columnName,
                                value: newValue
                            })
                        });
                        
                        // Обновляем ячейку после успешного обновления
                        cell.data(newValue).draw(false);
                        
                        showToast('success', 'Обновление успешно', `Обновлено ${columnName} на "${newValue}"`);
                    } catch (error) {
                        console.error('Ошибка обновления ячейки:', error);
                        // Возвращаем прежнее значение при ошибке
                        $(this).parent().html(oldValue);
                        showToast('error', 'Ошибка обновления', `Не удалось обновить значение: ${error.message}`);
                    } finally {
                        hideLoading();
                    }
                } else {
                    // Если значение не изменилось, просто возвращаем исходное значение
                    $(this).parent().html(oldValue);
                }
            }
        });
    });
    
    // Убеждаемся, что таблица видима
    $('.dataTables_wrapper').css({
        'width': '100%',
        'visibility': 'visible',
        'display': 'block'
    });
    
    $('.table-wrapper').css({
        'display': 'block'
    });
    
    // Показываем таблицу и скрываем пустое состояние
    showTable();
    
    return appState.dataTable;
}

/**
 * Сохранить порядок колонок
 */
function saveColumnOrder() {
    if (!appState.dataTable) return;
    
    // Получаем текущий порядок колонок
    const newOrder = appState.dataTable.colReorder.order();
    
    // Сохраняем в localStorage для сохранения между сессиями
    localStorage.setItem(`columnOrder_${appState.sessionId}`, JSON.stringify(newOrder));
    
    showToast('success', 'Порядок колонок сохранен', 'Текущий порядок колонок был сохранен');
}

/**
 * Поиск колонок в таблице
 * @param {string} searchText - Текст для поиска
 */
function searchColumns(searchText) {
    if (!appState.dataTable) return;
    
    searchText = searchText.toLowerCase().trim();
    
    // Если поиск пустой, сбрасываем все подсветки
    if (!searchText) {
        appState.dataTable.columns().header().each(function(header) {
            $(header).removeClass('highlight-match best-match');
        });
        return;
    }
    
    let bestMatchIndex = -1;
    let bestMatchScore = -1;
    
    // Обрабатываем каждый заголовок колонки
    appState.dataTable.columns().header().each(function(header, index) {
        const columnName = $(header).text().replace('▼', '').trim().toLowerCase();
        const $header = $(header);
        
        // Удаляем предыдущую подсветку
        $header.removeClass('highlight-match best-match');
        
        // Проверяем, содержит ли имя колонки искомый текст
        if (columnName.includes(searchText)) {
            // Добавляем класс подсветки
            $header.addClass('highlight-match');
            
            // Вычисляем оценку совпадения (меньше - лучше)
            // Точное совпадение = 0, Начинается с искомого текста = разница длины, Содержит = 1000 + позиция
            let score;
            if (columnName === searchText) {
                score = 0; // Точное совпадение - лучшее
            } else if (columnName.startsWith(searchText)) {
                score = columnName.length - searchText.length; // Совпадение с начала
            } else {
                score = 1000 + columnName.indexOf(searchText); // Просто содержит
            }
            
            // Отслеживаем лучшее совпадение
            if (bestMatchIndex === -1 || score < bestMatchScore) {
                bestMatchIndex = index;
                bestMatchScore = score;
            }
        }
    });
    
    // Подсвечиваем лучшее совпадение
    if (bestMatchIndex !== -1) {
        const bestHeader = appState.dataTable.column(bestMatchIndex).header();
        $(bestHeader).addClass('best-match');
        
        // Прокручиваем к лучшему совпадению с анимацией
        const $headerRow = $(bestHeader).closest('tr');
        const $headerContainer = $headerRow.closest('.dataTables_scrollHead');
        
        $headerContainer.animate({
            scrollLeft: $(bestHeader).offset().left - $headerContainer.offset().left + 
                        $headerContainer.scrollLeft() - ($headerContainer.width() / 2)
        }, 300);
    }
}

/**
 * Фильтрация колонок в селекторе колонок
 * @param {string} searchText - Текст для поиска
 */
function filterColumns(searchText) {
    const labels = modals.columnSelector.columnList.querySelectorAll('label');
    
    labels.forEach(label => {
        const columnName = label.textContent.toLowerCase();
        if (columnName.includes(searchText.toLowerCase())) {
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
 * Выбрать/снять выбор со всех колонок
 * @param {boolean} select - true для выбора всех, false для снятия выбора
 */
function selectAllColumns(select) {
    const checkboxes = modals.columnSelector.columnList.querySelectorAll('input[type="checkbox"]');
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
              select ? 'Выбраны все видимые колонки' : 'Сняты все видимые колонки');
}

/**
 * Применить выбор колонок
 */
function applyColumnSelection() {
    const checkboxes = modals.columnSelector.columnList.querySelectorAll('input[type="checkbox"]');
    const selectedColumns = [];
    
    checkboxes.forEach(checkbox => {
        const columnIndex = parseInt(checkbox.value);
        if (checkbox.checked) {
            selectedColumns.push(columnIndex);
            appState.dataTable.column(columnIndex).visible(true);
        } else {
            appState.dataTable.column(columnIndex).visible(false);
        }
    });
    
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
    
    // Открываем модальное окно
    openModal(modals.columnSelector.modal);
}