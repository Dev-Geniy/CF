document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', isDark);
  document.getElementById('theme-switch').checked = isDark;
  document.getElementById('sidebar-theme-switch').checked = isDark;
});

document.getElementById('theme-switch').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
  localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
  document.getElementById('sidebar-theme-switch').checked = e.target.checked;
});

document.getElementById('sidebar-theme-switch').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
  localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
  document.getElementById('theme-switch').checked = e.target.checked;
});

const sidebar = document.getElementById('sidebar');
document.querySelector('.sidebar-handle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  const isSidebarOpen = sidebar.classList.contains('open');
  const isClickInsideSidebar = sidebar.contains(e.target);
  const isClickOnHandle = e.target.closest('.sidebar-handle');
  if (isSidebarOpen && !isClickInsideSidebar && !isClickOnHandle) {
    sidebar.classList.remove('open');
  }
});

document.getElementById('current-year').textContent = new Date().getFullYear();

document.getElementById('back-to-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('.burger-icon').addEventListener('click', () => {
  const burgerMenu = document.querySelector('.burger-menu');
  burgerMenu.classList.toggle('open');
  if (burgerMenu.classList.contains('open')) {
    const closeMenuOnClickOutside = (e) => {
      if (!burgerMenu.contains(e.target) && !e.target.classList.contains('burger-icon')) {
        burgerMenu.classList.remove('open');
        document.removeEventListener('click', closeMenuOnClickOutside);
      }
    };
    document.addEventListener('click', closeMenuOnClickOutside);
  }
});

// Открытие модального окна
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const modalContent = modal.querySelector('.modal-content');
  modal.style.display = 'flex';
  modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  modalContent.focus();
  trapFocus(modal);
}

// Закрытие модального окна
function closeModal(modal) {
  modal.style.display = 'none';
}

// Обработчик закрытия модальных окон
document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    closeModal(closeBtn.closest('.modal'));
  });
});

// Обработчик формы обратной связи
document.getElementById('feedback-form').addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('feedback-modal'));
  showNotification('Спасибо за ваш отзыв!');
  e.target.reset();
});

// Обработчик формы сообщения об ошибке
document.getElementById('bug-report-form').addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('bug-report-modal'));
  showNotification('Спасибо за сообщение об ошибке!');
  e.target.reset();
});

// Уведомления
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('active');
  }, 10);
  setTimeout(() => {
    notification.classList.remove('active');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Ловушка фокуса для модальных окон
function trapFocus(modal) {
  const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  });
}

// Обработчики ссылок футера
document.querySelector('.privacy-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('privacy-modal');
});

document.querySelector('.terms-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('terms-modal');
});

document.querySelector('.cookies-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('cookies-modal');
});
