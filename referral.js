// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', isDark);
  const themeSwitch = document.getElementById('theme-switch');
  const sidebarThemeSwitch = document.getElementById('sidebar-theme-switch');
  if (themeSwitch) themeSwitch.checked = isDark;
  if (sidebarThemeSwitch) sidebarThemeSwitch.checked = isDark;

  if (typeof firebase === 'undefined') {
    console.error('Firebase не инициализирован. Проверьте подключение Firebase SDK.');
    showNotification('Ошибка загрузки Firebase. Попробуйте позже.', 'error');
    return;
  }

  firebase.auth().signInAnonymously()
    .then((userCredential) => {
      console.log('Успешная авторизация:', userCredential);
      initializeReferralProgram();
    })
    .catch((error) => {
      console.error('Ошибка авторизации:', error.code, error.message);
      showNotification(`Не удалось авторизоваться. Код ошибки: ${error.code}`, 'error');
    });
});

// Переключение темы
const toggleTheme = (e) => {
  document.body.classList.toggle('dark', e.target.checked);
  localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
  const otherSwitch = e.target.id === 'theme-switch' ? 'sidebar-theme-switch' : 'theme-switch';
  const otherElement = document.getElementById(otherSwitch);
  if (otherElement) otherElement.checked = e.target.checked;
};

document.getElementById('theme-switch')?.addEventListener('change', toggleTheme);
document.getElementById('sidebar-theme-switch')?.addEventListener('change', toggleTheme);

// Переключение боковой панели
const sidebar = document.getElementById('sidebar');
if (sidebar) {
  document.querySelector('.sidebar-handle')?.addEventListener('click', () => {
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
}

// Установка текущего года в футере
const currentYear = document.getElementById('current-year');
if (currentYear) currentYear.textContent = new Date().getFullYear();

// Кнопка "Вернуться наверх"
document.getElementById('back-to-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Функции для модального окна
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const modalContent = modal.querySelector('.modal-content');
  modal.style.display = 'flex';
  modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  modalContent.focus();
  trapFocus(modal);
}

function closeModal(modal) {
  if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => closeModal(closeBtn.closest('.modal')));
});

// Уведомления с возможностью закрытия
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.dataset.active = 'true';
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('active'), 10);
  setTimeout(() => closeNotification(notification), 3000);
  return notification;
}

function closeNotification(notification) {
  if (notification && notification.dataset.active === 'true') {
    notification.classList.remove('active');
    notification.dataset.active = 'false';
    setTimeout(() => notification.remove(), 300);
  }
}

// Ограничение фокуса в модальном окне
function trapFocus(modal) {
  const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}

// Обработка форм "Оставить отзыв" и "Сообщить об ошибке"
document.getElementById('feedback-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('feedback-modal'));
  showNotification('Спасибо за ваш отзыв!');
  e.target.reset();
});

document.getElementById('bug-report-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('bug-report-modal'));
  showNotification('Спасибо за сообщение об ошибке!');
  e.target.reset();
});

// Генерация уникального реферального кода
function generateReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}

// Инициализация реферальной программы
function initializeReferralProgram() {
  let referralCode = localStorage.getItem('referralCode');
  if (!referralCode) {
    referralCode = generateReferralCode();
    localStorage.setItem('referralCode', referralCode);
  }

  const referralLinkInput = document.getElementById('referral-link');
  if (referralLinkInput) {
    referralLinkInput.value = `https://dev-geniy.github.io/Client-Flow/index.html?ref=${referralCode}`;
  }

  const db = firebase.database();
  const referralRef = db.ref(`referrals/${referralCode}`);

  referralRef.on('value', (snapshot) => {
    const data = snapshot.val() || { clicks: 0, friends: 0, bonuses: 0, rewards: [], visitors: {}, pendingRewards: [] };
    localStorage.setItem(`referralStats_${referralCode}`, JSON.stringify(data));
    updateDashboard(data);

    if (data.pendingRewards?.length > 0) {
      const bonusModal = document.getElementById('bonus-modal');
      if (bonusModal) {
        document.getElementById('bonus-message').textContent = data.pendingRewards.join('\n');
        bonusModal.style.display = 'flex';
        trapFocus(bonusModal);
        referralRef.update({ pendingRewards: [] }, (error) => {
          if (error) console.error('Ошибка очистки pendingRewards:', error);
        });
      }
    }
  }, (error) => {
    console.error('Ошибка чтения данных из Firebase:', error);
    showNotification('Не удалось загрузить статистику. Попробуйте позже.', 'error');
  });

  // Автоматическое зачисление рефералов
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode && refCode !== referralCode) {
    const visitorId = localStorage.getItem('visitorId') || generateReferralCode();
    localStorage.setItem('visitorId', visitorId);

    const refReferralRef = db.ref(`referrals/${refCode}`);
    refReferralRef.child(`visitors/${visitorId}`).once('value', (snapshot) => {
      if (!snapshot.exists()) {
        refReferralRef.transaction((currentData) => {
          if (!currentData) {
            return { clicks: 1, friends: 1, bonuses: 1, rewards: [], visitors: { [visitorId]: true }, pendingRewards: ['Ваш первый реферал!'] };
          }
          currentData.clicks = (currentData.clicks || 0) + 1;
          currentData.friends = (currentData.friends || 0) + 1;
          currentData.bonuses = (currentData.bonuses || 0) + 1;
          currentData.visitors = currentData.visitors || {};
          currentData.visitors[visitorId] = true;

          const friends = currentData.friends;
          const rewards = currentData.rewards || [];
          const pendingRewards = currentData.pendingRewards || [];

          if (friends >= 25 && !rewards.includes('exclusive_theme')) {
            rewards.push('exclusive_theme');
            pendingRewards.push('Вы получили эксклюзивную тему оформления!');
          } else if (friends >= 20 && !rewards.includes('consultation')) {
            rewards.push('consultation');
            pendingRewards.push('Вы заработали бесплатную консультацию!');
          } else if (friends >= 15 && !rewards.includes('vip_status')) {
            rewards.push('vip_status');
            pendingRewards.push('Вы получили VIP-статус!');
          } else if (friends >= 10 && !rewards.includes('500_points')) {
            rewards.push('500_points');
            pendingRewards.push('Вы заработали 500 бонусных баллов!');
          } else if (friends >= 5 && !rewards.includes('year_subscription')) {
            rewards.push('year_subscription');
            pendingRewards.push('Вы заработали годовую подписку!');
          } else if (friends >= 3 && !rewards.includes('partner_badge')) {
            rewards.push('partner_badge');
            pendingRewards.push('Вы заработали значок "Партнёр"!');
          }

          if (Math.random() < 0.1 && !rewards.includes(`random_bonus_${friends}`)) {
            rewards.push(`random_bonus_${friends}`);
            currentData.bonuses += 0.33;
            pendingRewards.push('Вы получили случайный бонус: +10 дней премиума!');
          }

          currentData.rewards = rewards;
          currentData.pendingRewards = pendingRewards;

          return currentData;
        }, (error) => {
          if (error) {
            console.error('Ошибка транзакции:', error);
            showNotification('Не удалось записать данные. Попробуйте снова.', 'error');
          }
        });
        showNotification('Вы перешли по реферальной ссылке! Вашему другу начислен бонус.');
      }
    }, (error) => {
      console.error('Ошибка проверки посетителя:', error);
      showNotification('Не удалось проверить данные. Попробуйте снова.', 'error');
    });
  }
}

// Обновление дашборда с анимацией
function updateDashboard(stats) {
  const elements = {
    clicksCount: document.getElementById('clicks-count'),
    friendsCount: document.getElementById('friends-count'),
    progressToBonus: document.getElementById('progress-to-bonus'),
    progressFill: document.getElementById('progress-fill'),
    bonusesEarned: document.getElementById('bonuses-earned'),
    rewardsList: document.getElementById('rewards-list')
  };

  if (elements.clicksCount) animateValue(elements.clicksCount, parseInt(elements.clicksCount.textContent) || 0, stats.clicks, 500);
  if (elements.friendsCount) animateValue(elements.friendsCount, parseInt(elements.friendsCount.textContent) || 0, stats.friends, 500);
  if (elements.bonusesEarned) animateValue(elements.bonusesEarned, parseInt(elements.bonusesEarned.textContent) || 0, Math.floor(stats.bonuses * 30), 500, ' дней премиума');

  const friends = stats.friends;
  const nextLevel = friends >= 25 ? Infinity : [20, 15, 10, 5, 3].find(level => friends < level) || 3;

  if (elements.progressToBonus) {
    const friendsRemaining = Math.max(0, nextLevel - friends);
    elements.progressToBonus.textContent = nextLevel === Infinity ? 'Все бонусы получены!' : `${friendsRemaining} ${friendsRemaining === 1 ? 'друг' : 'друзей'}`;
  }

  if (elements.progressFill) {
    const progressPercentage = nextLevel === Infinity ? 100 : (friends / nextLevel) * 100;
    elements.progressFill.style.width = `${Math.min(progressPercentage, 100)}%`;
  }

  if (elements.rewardsList) {
    elements.rewardsList.innerHTML = stats.rewards?.length ? stats.rewards.map(reward => {
      const rewardMap = {
        'exclusive_theme': 'Эксклюзивная тема оформления (25 друзей)',
        'consultation': 'Бесплатная консультация (20 друзей)',
        'vip_status': 'VIP-статус (15 друзей)',
        '500_points': '500 бонусных баллов (10 друзей)',
        'year_subscription': 'Годовая подписка (5 друзей)',
        'partner_badge': 'Значок "Партнёр" (3 друга)'
      };
      return `<li>${rewardMap[reward] || (reward.startsWith('random_bonus') ? 'Случайный бонус: +10 дней премиума' : reward)}</li>`;
    }).join('') : '<li>Пока нет наград. Приглашайте друзей!</li>';
  }
}

// Анимация для счётчиков
function animateValue(element, start, end, duration, suffix = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start) + suffix;
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

// Функция копирования реферальной ссылки
function copyReferralLink() {
  const referralCode = localStorage.getItem('referralCode');
  const referralLink = `https://dev-geniy.github.io/Client-Flow/index.html?ref=${referralCode}`;
  navigator.clipboard.writeText(referralLink)
    .then(() => showNotification('Ссылка скопирована!'))
    .catch(err => {
      console.error('Ошибка копирования:', err);
      showNotification('Не удалось скопировать ссылку.', 'error');
    });
}

// Функция шаринга реферальной ссылки
function shareReferralLink() {
  const referralCode = localStorage.getItem('referralCode');
  const referralLink = `https://dev-geniy.github.io/Client-Flow/index.html?ref=${referralCode}`;
  const shareText = `Присоединяйтесь к Client Flow и управляйте клиентами легко! Моя реферальная ссылка: ${referralLink}`;

  if (navigator.share) {
    navigator.share({ title: 'Приглашение в Client Flow', text: shareText, url: referralLink })
      .then(() => showNotification('Ссылка успешно отправлена!'))
      .catch(err => {
        console.error('Ошибка шаринга:', err);
        showNotification('Не удалось поделиться ссылкой. Скопируйте её вручную.', 'error');
        copyReferralLink();
      });
  } else {
    copyReferralLink();
    showNotification('Ссылка скопирована! Поделитесь ею вручную.');
  }
}

// Функция сброса статистики
function resetStats() {
  const referralCode = localStorage.getItem('referralCode');
  if (!referralCode) return;

  const db = firebase.database();
  db.ref(`referrals/${referralCode}`).remove()
    .then(() => {
      localStorage.removeItem(`referralStats_${referralCode}`);
      initializeReferralProgram();
      showNotification('Статистика сброшена!');
    })
    .catch((error) => {
      console.error('Ошибка сброса статистики:', error);
      showNotification('Не удалось сбросить статистику. Попробуйте снова.', 'error');
    });
}

// Функция генерации новой реферальной ссылки с подтверждением
function generateNewReferralLink() {
  const modal = document.getElementById('confirm-reset-modal');
  if (modal) {
    openModal('confirm-reset-modal');
  } else {
    console.error('Модальное окно подтверждения не найдено');
    showNotification('Ошибка: модальное окно недоступно.', 'error');
  }
}

// Подтверждение сброса ссылки
function confirmResetLink() {
  const newCode = generateReferralCode();
  const oldCode = localStorage.getItem('referralCode');
  const db = firebase.database();

  if (oldCode) {
    db.ref(`referrals/${oldCode}`).remove()
      .then(() => {
        localStorage.setItem('referralCode', newCode);
        localStorage.removeItem(`referralStats_${oldCode}`);
        initializeReferralProgram();
        closeModal(document.getElementById('confirm-reset-modal'));
        showNotification('Новая реферальная ссылка сгенерирована!');
      })
      .catch((error) => {
        console.error('Ошибка генерации новой ссылки:', error);
        showNotification('Не удалось сгенерировать новую ссылку. Попробуйте снова.', 'error');
      });
  } else {
    localStorage.setItem('referralCode', newCode);
    initializeReferralProgram();
    closeModal(document.getElementById('confirm-reset-modal'));
    showNotification('Новая реферальная ссылка сгенерирована!');
  }
}

// Добавляем кнопку "Сгенерировать новую ссылку"
document.addEventListener('DOMContentLoaded', () => {
  const referralLinkContainer = document.querySelector('.referral-link');
  if (referralLinkContainer) {
    referralLinkContainer.insertAdjacentHTML('afterend', `
      <button class="btn gradient-btn generate-new-link-btn" onclick="generateNewReferralLink()" aria-label="Сгенерировать новую ссылку">
        <span class="material-icons">refresh</span> Новая ссылка
      </button>
    `);
  }
});

// Закрытие модального окна для бонусов
document.querySelector('#bonus-modal .close')?.addEventListener('click', () => {
  closeModal(document.getElementById('bonus-modal'));
});
