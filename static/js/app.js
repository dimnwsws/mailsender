/**
 * Основной файл инициализации приложения
 */

/**
 * Инициализировать приложение с анимацией
 */
async function initApp() {
    try {
        // Начальное состояние - скрыть таблицу, показать пустое состояние
        const tableWrapper = document.querySelector('.table-wrapper');
        if (tableWrapper) {
            tableWrapper.style.display = 'none';
        }
        showEmptyState();
        
        // Добавляем анимацию заставки
        const splash = document.createElement('div');
        splash.className = 'splash-screen';
        splash.innerHTML = `
            <div class="splash-logo">C</div>
            <div class="splash-spinner"></div>
            <div class="splash-text">Загрузка Просмотра Сертификатов</div>
        `;
        document.body.appendChild(splash);
        
        // Ждем немного, чтобы показать заставку
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Исчезание заставки
        splash.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 500));
        document.body.removeChild(splash);
        
        // Применяем анимацию появления к основным элементам
        document.querySelector('.sidebar').style.transform = 'translateX(-100%)';
        document.querySelector('.main-content').style.opacity = '0';
        
        setTimeout(() => {
            document.querySelector('.sidebar').style.transition = 'transform 0.5s ease';
            document.querySelector('.sidebar').style.transform = 'translateX(0)';
            
            setTimeout(() => {
                document.querySelector('.main-content').style.transition = 'opacity 0.5s ease';
                document.querySelector('.main-content').style.opacity = '1';
            }, 200);
        }, 100);
        
        // Загружаем пресеты
        await loadFilterPresets();
        
        // Загружаем пользовательские колонки
        loadCustomColumns();
        
        // Инициализируем обработчики событий
        initEventListeners();
        
        // Добавляем улучшения поиска
        enhanceSearchInput();

        // Добавляем кнопку переключения темы (для будущего темного режима)
        createThemeToggle();
        
        // Показываем приветственное уведомление
        setTimeout(() => {
            showToast('success', 'Добро пожаловать', 'Просмотр Сертификатов готов к использованию');
        }, 1000);
        
        updateStatusBar('Готово');
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        showToast('error', 'Ошибка инициализации', 'Ошибка инициализации приложения: ' + error.message);
    }
}

// Запуск приложения при полной загрузке DOM
document.addEventListener('DOMContentLoaded', initApp);