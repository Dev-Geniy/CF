document.addEventListener('DOMContentLoaded', () => {
    // Упрощённое переключение темы
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;

    // Проверка наличия переключателя
    if (!themeToggle) {
        console.warn('Элемент .theme-toggle не найден на странице');
        return;
    }

    // Проверка доступности localStorage
    try {
        localStorage.setItem('test', 'ok');
        localStorage.removeItem('test');
    } catch (e) {
        console.error('localStorage недоступен:', e);
        return;
    }

    // Применение сохранённой темы
    const currentTheme = localStorage.getItem('landing-theme') || 'light';
    if (currentTheme === 'dark') {
        body.classList.add('dark');
    }

    // Обработчик переключения темы
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        const newTheme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('landing-theme', newTheme);
    });

    // Остальной код (модальные окна, карусель, форма и т.д.) остаётся без изменений
    const formModal = document.getElementById('landing-form-modal');
    const crmUrl = 'https://dev-geniy.github.io/CF/crm.html';
    const hasSubmittedForm = localStorage.getItem('hasSubmittedForm');

    const openModal = (modal) => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    const closeModal = (modal) => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

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

    const carousel = document.querySelector('.landing-testimonials-carousel');
    const prevBtn = document.querySelector('.landing-carousel-prev');
    const nextBtn = document.querySelector('.landing-carousel-next');

    prevBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: -300, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        carousel.scrollBy({ left: 300, behavior: 'smooth' });
    });

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

    document.querySelectorAll('.landing-modal-close').forEach(close => {
        close.addEventListener('click', () => {
            const modal = close.closest('.landing-modal-overlay');
            closeModal(modal);
        });
    });

    document.querySelectorAll('.landing-cta-btn, .landing-cta-top-btn, .landing-secondary-cta-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!hasSubmittedForm) {
                openModal(formModal);
            } else {
                window.location.href = crmUrl;
            }
        });
    });

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

        localStorage.setItem('formData', JSON.stringify(data));

        const botToken = '7547438973:AAFr0I-mxvM_6eEDZnHQSZk5fLRYexc1PoE';
        const chatId = '7509823175';
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

            localStorage.setItem('hasSubmittedForm', 'true');
            closeModal(formModal);
            window.location.href = crmUrl;
        } catch (error) {
            console.error('Ошибка отправки в Telegram:', error);
            alert('Произошла ошибка при отправке данных. Попробуйте снова.');
        }
    });

    skipBtn.addEventListener('click', () => {
        localStorage.setItem('hasSubmittedForm', 'true');
        closeModal(formModal);
        window.location.href = crmUrl;
    });

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
});
