/**
 * Состояние приложения и DOM-элементы
 */

// Состояние приложения
const appState = {
    sessionId: null,
    currentData: null,
    dataTable: null,
    columns: [],
    activeFilters: [],
    filterPresets: [],
    currentColumnName: null,
    isLoading: false,
    customColumns: [],
    theme: 'light' // Для будущего темного режима
};

// DOM-элементы
const elements = {
    // Боковая панель
    btnMailing: document.getElementById('btn-mailing'),
    btnViewDb: document.getElementById('btn-view-db'),
    btnUpdateDb: document.getElementById('btn-update-db'),
    
    // Панель инструментов
    btnLoadFile: document.getElementById('btn-load-file'),
    btnExport: document.getElementById('btn-export'),
    btnColumns: document.getElementById('btn-columns'),
    btnCustomColumns: document.getElementById('btn-custom-columns'),
    btnPresets: document.getElementById('btn-presets'),
    
    // Файловый ввод
    fileInput: document.getElementById('file-input'),
    
    // Статус и поиск
    statusBar: document.getElementById('status-bar'),
    globalSearch: document.getElementById('global-search'),
    tableSearch: document.getElementById('table-search'),
    clearSearch: document.getElementById('clear-search'),
    
    // Таблица
    dataTable: document.getElementById('data-table'),
    
    // Индикатор загрузки
    loadingIndicator: document.getElementById('loading-indicator')
};

// Инициализация модальных окон
const modals = {
    columnSelector: {
        modal: document.getElementById('column-selector-modal'),
        close: document.querySelector('#column-selector-modal .close'),
        columnList: document.getElementById('column-list'),
        searchInput: document.getElementById('column-search'),
        selectAll: document.getElementById('select-all-columns'),
        deselectAll: document.getElementById('deselect-all-columns'),
        apply: document.getElementById('apply-columns'),
        cancel: document.getElementById('cancel-columns')
    },
    filter: {
        modal: document.getElementById('filter-modal'),
        close: document.querySelector('#filter-modal .close'),
        columnName: document.getElementById('filter-column-name'),
        valueList: document.getElementById('value-list'),
        searchInput: document.getElementById('filter-search'),
        selectAll: document.getElementById('select-all-values'),
        deselectAll: document.getElementById('deselect-all-values'),
        apply: document.getElementById('apply-filter'),
        cancel: document.getElementById('cancel-filter'),
        presets: document.getElementById('filter-presets'),
        applyPreset: document.getElementById('apply-preset'),
        savePreset: document.getElementById('save-preset')
    },
    presets: {
        modal: document.getElementById('presets-modal'),
        close: document.querySelector('#presets-modal .close'),
        presetSelect: document.getElementById('preset-select'),
        applyBtn: document.getElementById('apply-preset-btn'),
        renameBtn: document.getElementById('rename-preset-btn'),
        deleteBtn: document.getElementById('delete-preset-btn'),
        saveBtn: document.getElementById('save-preset-btn'),
        presetInfo: document.getElementById('preset-info'),
        closeBtn: document.getElementById('close-presets')
    },
    export: {
        modal: document.getElementById('export-modal'),
        close: document.querySelector('#export-modal .close'),
        csvBtn: document.getElementById('export-csv'),
        excelBtn: document.getElementById('export-excel'),
        jsonBtn: document.getElementById('export-json'),
        cancelBtn: document.getElementById('cancel-export')
    },
    customColumns: {
        modal: document.getElementById('custom-columns-modal'),
        close: document.querySelector('#custom-columns-modal .close'),
        columnName: document.getElementById('custom-column-name'),
        columnFormula: document.getElementById('custom-column-formula'),
        addButton: document.getElementById('add-custom-column'),
        columnsList: document.getElementById('saved-columns-list'),
        closeBtn: document.getElementById('close-custom-columns')
    }
};