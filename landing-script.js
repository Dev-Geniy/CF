document.addEventListener('DOMContentLoaded', () => {
    // Основные переменные
    const formModal = document.getElementById('landing-form-modal');
    const crmUrl = 'https://dev-geniy.github.io/CF/crm.html';
    const hasSubmittedForm = localStorage.getItem('hasSubmittedForm');

    // Функция открытия модального окна
    const openModal = (modal) => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    // Функция закрытия модального окна
    const closeModal = (modal) => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Плавная прокрутка для ссылок
    document.querySelectorAll('.landing-scroll-link').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Карусель для отзывов
    const carousel = document.querySelector('.landing-testimonials-carousel');
    const prevBtn = document.querySelector('.landing-carousel-prev');
    const nextBtn = document.querySelector('.landing-carousel-next');

    prevBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: -300, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: 300, behavior: 'smooth' });
    });

    // Обработка открытия модальных окон (changelog, privacy, contact), исключая ссылки с классом .landing-scroll-link
    document.querySelectorAll('a[href^="#landing-"]:not(.landing-scroll-link)').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.getAttribute('href').substring(1);
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            }
        });
    });

    // Закрытие модальных окон
    document.querySelectorAll('.landing-modal-close').forEach(close => {
        close.addEventListener('click', () => {
            const modal = close.closest('.landing-modal-overlay');
            closeModal(modal);
        });
    });

    // Открытие формы только по кнопке и перенаправление, если форма заполнена
    document.querySelectorAll('.landing-cta-btn, .landing-cta-top-btn, .landing-secondary-cta-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!hasSubmittedForm) {
                openModal(formModal);
            } else {
                window.location.href = crmUrl;
            }
        });
    });

    // Обработка формы
    const form = document.getElementById('landing-lead-form');
    const skipBtn = document.querySelector('.landing-form-skip-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            country: formData.get('country'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            telegram: formData.get('telegram') || 'Не указано',
            company: formData.get('company') || 'Не указано',
            employees: formData.get('employees') || 'Не указано'
        };

        // Сохранение данных формы в localStorage
        localStorage.setItem('formData', JSON.stringify(data));

        // Отправка в Telegram-бота
        const botToken = '7547438973:AAFr0I-mxvM_6eEDZnHQSZk5fLRYexc1PoE'; // Замените на ваш токен бота
        const chatId = '7509823175'; // Замените на ваш chat_id
        const message = `
Новая заявка с Client Flow:
Имя: ${data.name}
Страна: ${data.country}
Телефон: ${data.phone}
Email: ${data.email}
Telegram: ${data.telegram}
Компания: ${data.company}
Сотрудников: ${data.employees}
        `;

        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message
                })
            });

            // Сохраняем флаг, что форма была отправлена
            localStorage.setItem('hasSubmittedForm', 'true');
            closeModal(formModal);
            window.location.href = crmUrl;
        } catch (error) {
            console.error('Ошибка отправки в Telegram:', error);
            alert('Произошла ошибка при отправке данных. Попробуйте снова.');
        }
    });

    // Пропуск формы
    skipBtn.addEventListener('click', () => {
        localStorage.setItem('hasSubmittedForm', 'true');
        closeModal(formModal);
        window.location.href = crmUrl;
    });
});

// Кнопка "Наверх"
const scrollTopButton = document.querySelector('.landing-scroll-top');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopButton.classList.add('visible');
    } else {
        scrollTopButton.classList.remove('visible');
    }
});

scrollTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Переключатель темы
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;
const currentTheme = localStorage.getItem('theme') || 'light';

if (currentTheme === 'dark') {
    body.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark');
    const newTheme = body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
});
