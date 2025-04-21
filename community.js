const API_URL ="https://script.google.com/macros/s/AKfycbzp3tmegeMEY_7xtmHagcw1SP-mxmFpmBjNdQHbepy89rzrcoOfSV_imAY6ipp6HL9Jng/exec";

document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', isDark);
  document.getElementById('theme-switch').checked = isDark;
  document.getElementById('sidebar-theme-switch').checked = isDark;
  loadThreadsFromGoogleSheets();
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

async function loadThreadsFromGoogleSheets(filterCategory = 'all', sortBy = 'newest', searchTerm = '') {
  try {
    const response = await fetch(`${API_URL}?action=getThreads`);
    let threads = await response.json();
    if (filterCategory !== 'all') {
      threads = threads.filter(thread => thread.category === filterCategory);
    }
    if (searchTerm) {
      threads = threads.filter(thread => thread.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (sortBy === 'newest') {
      threads.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === 'oldest') {
      threads.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === 'popular') {
      threads.sort((a, b) => b.comments.length - a.comments.length);
    }
    loadThreads(threads);
  } catch (error) {
    console.error("Ошибка загрузки тем:", error);
    showNotification('Ошибка загрузки тем!', 'error');
  }
}

function loadThreads(threads) {
  const threadGrid = document.getElementById('thread-grid');
  threadGrid.innerHTML = '';
  threads.forEach(thread => {
    const threadCard = document.createElement('div');
    threadCard.classList.add('thread-card');
    threadCard.setAttribute('data-category', thread.category);
    threadCard.innerHTML = `
      <h3>${thread.title}</h3>
      <div class="thread-meta">
        <span class="author"><span class="material-icons">person</span> ${thread.author}</span>
        <span class="date">${thread.date}</span>
        <span class="replies"><span class="material-icons">chat_bubble</span> ${thread.comments.length}</span>
      </div>
      <div class="thread-category">${thread.category === 'general' ? 'Общее' : thread.category === 'support' ? 'Поддержка' : 'Идеи'}</div>
      <div class="thread-content">${thread.content}</div>
      <div class="thread-actions">
        <button class="btn view-thread-btn" data-thread-id="${thread.id}">Читать | Написать </button>
      </div>
      <div class="thread-comments" id="comments_${thread.id}" style="display: none;">
        <h4>Комментарии</h4>
        <div class="comment-list" id="comment-list_${thread.id}">
          ${thread.comments.map(comment => `
            <div class="comment">
              <p><strong>${comment.user}</strong> (${new Date(comment.timestamp).toLocaleString()}):</p>
              <p>${comment.text}</p>
            </div>
          `).join('')}
        </div>
        <form class="comment-form" data-thread-id="${thread.id}">
          <textarea placeholder="Ваш комментарий..." required></textarea>
          <button type="submit" class="btn gradient-btn">Отправить</button>
        </form>
      </div>
    `;
    threadGrid.appendChild(threadCard);
    threadCard.querySelector('.view-thread-btn').addEventListener('click', () => {
      const commentsSection = threadCard.querySelector('.thread-comments');
      commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    });
    threadCard.querySelector('.comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = e.target.querySelector('textarea').value;
      await addComment(thread.id, content);
      e.target.reset();
    });
  });
}

async function addComment(threadId, content) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `action=addComment&threadId=${encodeURIComponent(threadId)}&comment=${encodeURIComponent(content)}&user=Anonymous`
    });
    const result = await response.json();
    if (result.success) {
      showNotification('Комментарий добавлен!');
      loadThreadsFromGoogleSheets();
    } else {
      showNotification('Ошибка добавления комментария: ' + (result.error || 'Неизвестная ошибка'), 'error');
    }
  } catch (error) {
    console.error("Ошибка добавления комментария:", error);
    showNotification('Ошибка добавления комментария: ' + error.message, 'error');
  }
}

document.querySelectorAll('.category-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const category = btn.getAttribute('data-category');
    const sortBy = document.getElementById('sort-threads').value;
    const searchTerm = document.getElementById('thread-search').value.toLowerCase();
    loadThreadsFromGoogleSheets(category, sortBy, searchTerm);
  });
});

document.getElementById('sort-threads').addEventListener('change', (e) => {
  const sortBy = e.target.value;
  const activeCategory = document.querySelector('.category-filter.active').getAttribute('data-category');
  const searchTerm = document.getElementById('thread-search').value.toLowerCase();
  loadThreadsFromGoogleSheets(activeCategory, sortBy, searchTerm);
});

document.getElementById('thread-search').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const activeCategory = document.querySelector('.category-filter.active').getAttribute('data-category');
  const sortBy = document.getElementById('sort-threads').value;
  loadThreadsFromGoogleSheets(activeCategory, sortBy, searchTerm);
});

document.getElementById('create-thread-btn').addEventListener('click', () => {
  openModal('create-thread-modal');
});

document.getElementById('create-thread-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('thread-title').value;
  const category = document.getElementById('thread-category').value;
  const content = document.getElementById('thread-content').value;

  if (!title || !category || !content) {
    showNotification('Заполните все поля!', 'error');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `action=addThread&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&content=${encodeURIComponent(content)}&author=Anonymous`
    });
    const result = await response.json();
    if (result.success) {
      loadThreadsFromGoogleSheets();
      closeModal(document.getElementById('create-thread-modal'));
      showNotification('Тема успешно создана!');
      e.target.reset();
    } else {
      showNotification('Ошибка создания темы: ' + (result.error || 'Неизвестная ошибка'), 'error');
    }
  } catch (error) {
    console.error("Ошибка создания темы:", error);
    showNotification('Ошибка создания темы: ' + error.message, 'error');
  }
});

document.getElementById('feedback-form').addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('feedback-modal'));
  showNotification('Спасибо за ваш отзыв!');
  e.target.reset();
});

document.getElementById('bug-report-form').addEventListener('submit', (e) => {
  e.preventDefault();
  closeModal(document.getElementById('bug-report-modal'));
  showNotification('Спасибо за сообщение об ошибке!');
  e.target.reset();
});

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  const modalContent = modal.querySelector('.modal-content');
  modal.style.display = 'flex';
  modalContent.scrollTo({ top: 0, behavior: 'smooth' });
  modalContent.focus();
  trapFocus(modal);
}

function closeModal(modal) {
  modal.style.display = 'none';
}

document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    closeModal(closeBtn.closest('.modal'));
  });
});

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

// Privacy modal
document.querySelector('.privacy-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('privacy-modal');
});

// Terms modal
document.querySelector('.terms-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('terms-modal');
});

// Cookies modal
document.querySelector('.cookies-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('cookies-modal');
});
