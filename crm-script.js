// Lazy-load external libraries
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const grid = document.getElementById('client-grid');
const sidebar = document.getElementById('sidebar');
const modal = document.getElementById('client-modal');
const confirmModal = document.getElementById('confirm-delete-modal');
const bulkDeleteModal = document.getElementById('bulk-delete-modal');
const notification = document.getElementById('notification');
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let chartInstance = null;
let deleteIndex = null;
let selectedClients = new Set();
let currentPage = 0;
const clientsPerPage = 10;

// Utility functions
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sidebar
document.querySelector('.sidebar-handle').addEventListener('click', (e) => {
  e.stopPropagation();
  sidebar.classList.toggle('open');
  updateChart();
});

document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
    sidebar.classList.remove('open');
    updateChart();
  }
});

// Theme
const themeSwitch = document.getElementById('theme-switch');
themeSwitch.addEventListener('change', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  updateChart();
});
if (localStorage.getItem('theme') === 'dark') {
  themeSwitch.checked = true;
  document.body.classList.add('dark');
}

// Animations
const animations = document.getElementById('animations');
animations.addEventListener('change', () => {
  document.body.style.transition = animations.checked ? 'all 0.3s ease' : 'none';
  localStorage.setItem('animations', animations.checked);
});
if (localStorage.getItem('animations') === 'false') {
  animations.checked = false;
  document.body.style.transition = 'none';
}

// Card layout
const cardLayout = document.getElementById('card-layout');
cardLayout.addEventListener('change', () => {
  currentPage = 0; // Сбрасываем страницу при смене вида карточек
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
  localStorage.setItem('cardLayout', cardLayout.value);
});
if (localStorage.getItem('cardLayout')) cardLayout.value = localStorage.getItem('cardLayout');

// Render clients
function renderClients(filter = 'all', tagFilter = '', dateStart = '', dateEnd = '') {
  // Очищаем сетку только при первой странице или изменении фильтров
  if (currentPage === 0) {
    grid.innerHTML = '';
  }

  let filteredClients = clients.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter || (filter === 'favorite' && c.favorite);
    const matchesTag = !tagFilter || c.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()));
    const createdAt = new Date(c.createdAt || new Date());
    const matchesDate = (!dateStart || createdAt >= new Date(dateStart)) && 
                       (!dateEnd || createdAt <= new Date(dateEnd).setHours(23, 59, 59, 999));
    return matchesFilter && matchesTag && matchesDate;
  });

  const searchQuery = document.getElementById('search').value.toLowerCase();
  if (searchQuery) {
    filteredClients = filteredClients.filter(c => 
      c.name.toLowerCase().includes(searchQuery) || 
      (c.company && c.company.toLowerCase().includes(searchQuery))
    );
  }

  // Вычисляем индексы для текущей страницы
  const startIndex = currentPage * clientsPerPage;
  const endIndex = Math.min(startIndex + clientsPerPage, filteredClients.length);
  const clientsToRender = filteredClients.slice(startIndex, endIndex);

  // Рендерим клиентов для текущей страницы
  clientsToRender.forEach((client, index) => {
    const globalIndex = startIndex + index; // Глобальный индекс клиента в filteredClients
    const card = document.createElement('div');
    card.classList.add('client-card', client.status);
    if (client.favorite) card.classList.add('favorite');
    if (selectedClients.has(globalIndex)) card.classList.add('selected');
    card.setAttribute('role', 'gridcell');
    card.setAttribute('tabindex', '0');

    const progress = client.deadline ? calculateProgress(client.deadline) : null;

    if (cardLayout.value === 'compact') {
      card.classList.add('compact');
      card.innerHTML = `
        <div class="checkbox">
          <input type="checkbox" ${selectedClients.has(globalIndex) ? 'checked' : ''} aria-label="Выбрать клиента">
        </div>
        <h3>${escapeHtml(client.name)}</h3>
        ${client.company ? `<p>${escapeHtml(client.company)}</p>` : ''}
        ${client.tags?.length ? `<div class="tags"><span class="tag">#${escapeHtml(client.tags[0])}</span></div>` : ''}
        <div class="actions">
          <button onclick="editClient(${globalIndex})" title="Редактировать клиента" aria-label="Редактировать клиента"><span class="material-icons">edit</span></button>
          <button onclick="showConfirmDelete(${globalIndex})" title="Удалить клиента" aria-label="Удалить клиента"><span class="material-icons">delete</span></button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="checkbox">
          <input type="checkbox" ${selectedClients.has(globalIndex) ? 'checked' : ''} aria-label="Выбрать клиента">
        </div>
        <h3>${escapeHtml(client.name)}</h3>
        ${client.company ? `<p>${escapeHtml(client.company)}</p>` : ''}
        ${client.image ? `<img src="${escapeHtml(client.image)}" alt="${escapeHtml(client.name)}" loading="lazy">` : ''}
        ${client.social ? `<p><a href="${escapeHtml(client.social)}" target="_blank">${escapeHtml(client.social.split('/').pop())}</a></p>` : ''}
        ${client.phones?.length ? client.phones.map(phone => `<p>${escapeHtml(phone)}</p>`).join('') : ''}
        ${client.tags?.length ? `<div class="tags">${client.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${client.notes ? `<pre class="notes">${escapeHtml(client.notes)}</pre>` : ''}
        ${progress !== null ? `<div class="deadline-progress ${progress >= 100 ? 'expired' : ''}" style="width: ${Math.min(progress, 100)}%;" title="Дедлайн: ${new Date(client.deadline).toLocaleString()}"></div>` : ''}
        <div class="status-indicator"></div>
        <div class="actions">
          <button onclick="editClient(${globalIndex})" title="Редактировать клиента" aria-label="Редактировать клиента"><span class="material-icons">edit</span></button>
          <button onclick="showConfirmDelete(${globalIndex})" title="Удалить клиента" aria-label="Удалить клиента"><span class="material-icons">delete</span></button>
        </div>
      `;
    }
    grid.appendChild(card);

    // Keyboard navigation
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.querySelector('input[type="checkbox"]').click();
      }
    });
  });

  // Добавляем кнопку "Загрузить ещё", если есть ещё клиенты
  const existingLoadMoreButton = document.getElementById('load-more');
  if (existingLoadMoreButton) {
    existingLoadMoreButton.remove();
  }

  if (endIndex < filteredClients.length) {
    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'load-more';
    loadMoreButton.classList.add('btn', 'gradient-btn');
    loadMoreButton.innerHTML = '<span class="material-icons">expand_more</span> Загрузить ещё';
    loadMoreButton.addEventListener('click', () => {
      currentPage++;
      renderClients(filter, tagFilter, dateStart, dateEnd);
    });
    grid.appendChild(loadMoreButton);
  }

  updateStats();
  updateChart();
  updateBulkActions();
}

// Bulk actions
document.getElementById('bulk-actions').addEventListener('click', () => {
  const bulkButton = document.getElementById('bulk-actions');
  if (bulkButton.textContent.includes('Выбрать')) {
    bulkButton.innerHTML = '<span class="material-icons">delete</span> Удалить выбранное';
    bulkButton.classList.add('gradient-btn');
  } else {
    if (selectedClients.size > 0) {
      bulkDeleteModal.style.display = 'flex';
      trapFocus(bulkDeleteModal);
    } else {
      bulkButton.innerHTML = '<span class="material-icons">select_all</span> Выбрать';
      bulkButton.classList.remove('gradient-btn');
    }
  }
});

// Handle bulk delete confirmation
document.getElementById('bulk-delete-cancel').addEventListener('click', () => {
  bulkDeleteModal.style.display = 'none';
});

document.getElementById('bulk-delete-ok').addEventListener('click', () => {
  clients = clients.filter((_, index) => !selectedClients.has(index));
  localStorage.setItem('clients', JSON.stringify(clients));
  selectedClients.clear();
  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
  showNotification('Выбранные клиенты удалены');
  bulkDeleteModal.style.display = 'none';
  const bulkButton = document.getElementById('bulk-actions');
  bulkButton.innerHTML = '<span class="material-icons">select_all</span> Выбрать';
  bulkButton.classList.remove('gradient-btn');
});

grid.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const index = Array.from(grid.children).indexOf(e.target.closest('.client-card'));
    if (e.target.checked) {
      selectedClients.add(index);
    } else {
      selectedClients.delete(index);
    }
    updateBulkActions();
    renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
  }
});

function updateBulkActions() {
  const bulkButton = document.getElementById('bulk-actions');
  bulkButton.disabled = selectedClients.size === 0 && !bulkButton.textContent.includes('Удалить');
}

// Drag-and-drop
async function initSortable() {
  await loadScript('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js');
  new Sortable(grid, {
    animation: 150,
    onEnd: (evt) => {
      const moved = clients.splice(evt.oldIndex, 1)[0];
      clients.splice(evt.newIndex, 0, moved);
      localStorage.setItem('clients', JSON.stringify(clients));
      selectedClients.clear();
      currentPage = 0; // Сбрасываем страницу
      renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
      updateBulkActions();
    }
  });
}

// Add client
document.getElementById('add-client').addEventListener('click', () => {
  modal.style.display = 'flex';
  document.getElementById('client-form').reset();
  document.getElementById('phones-container').innerHTML = `
    <div class="phone-group">
      <input placeholder="Телефон" name="phone" aria-label="Номер телефона">
      <button type="button" class="btn-add-phone" title="Добавить ещё телефон" aria-label="Добавить ещё телефон">+</button>
    </div>
  `;
  document.getElementById('client-form').dataset.index = '';
  trapFocus(modal);
});

// Modal focus trap
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

  firstElement.focus();
}

// Close modal
document.querySelector('#client-modal .close').addEventListener('click', () => {
  modal.style.display = 'none';
  document.getElementById('add-client').focus();
});

// Dynamic phone inputs
document.getElementById('phones-container').addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-add-phone')) {
    const container = document.getElementById('phones-container');
    const newPhone = document.createElement('div');
    newPhone.classList.add('phone-group');
    newPhone.innerHTML = '<input placeholder="Телефон" name="phone" style="margin: 10px 0;" aria-label="Номер телефона">';
    container.appendChild(newPhone);
  }
});

// Form submission
document.getElementById('client-form').addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Форма отправлена');

  const phones = Array.from(document.querySelectorAll('#phones-container input[name="phone"]'))
    .map(input => input.value.trim())
    .filter(v => v);

  const social = document.getElementById('social').value.trim();
  const website = document.getElementById('website').value.trim();

  if (social && !isValidUrl(social)) {
    showNotification('Некорректный URL соцсети');
    console.log('Ошибка валидации: social URL');
    return;
  }
  if (website && !isValidUrl(website)) {
    showNotification('Некорректный URL сайта');
    console.log('Ошибка валидации: website URL');
    return;
  }

  const data = {
    name: document.getElementById('name').value.trim(),
    company: document.getElementById('company').value.trim(),
    social,
    website,
    phones,
    image: document.getElementById('image').value.trim(),
    tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
    deadline: document.getElementById('deadline').value,
    status: document.getElementById('status').value,
    notes: document.getElementById('notes').value.trim(),
    favorite: document.getElementById('favorite').checked,
    priority: document.getElementById('status').value === 'priority' ? 1 : 0,
    createdAt: new Date().toISOString()
  };

  console.log('Данные клиента:', data);

  const index = e.target.dataset.index;
  if (index !== '') {
    clients[index] = data;
    console.log('Клиент обновлён, индекс:', index);
  } else {
    clients.push(data);
    console.log('Новый клиент добавлен');
  }

  clients.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  try {
    localStorage.setItem('clients', JSON.stringify(clients));
    console.log('Клиенты сохранены в localStorage:', clients);
  } catch (error) {
    console.error('Ошибка сохранения в localStorage:', error);
    showNotification('Ошибка сохранения данных');
    return;
  }

  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
  modal.style.display = 'none';
  showNotification('Клиент сохранён');
  checkDeadlineNotification(data);
});

// Edit client
window.editClient = (index) => {
  modal.style.display = 'flex';
  const client = clients[index];
  document.getElementById('name').value = client.name;
  document.getElementById('company').value = client.company || '';
  document.getElementById('social').value = client.social;
  document.getElementById('website').value = client.website;
  const phonesContainer = document.getElementById('phones-container');
  phonesContainer.innerHTML = client.phones?.length ? client.phones.map((phone, i) => `
    <div class="phone-group">
      <input placeholder="Телефон" name="phone" value="${phone}" style="margin: 10px 0;" aria-label="Номер телефона">
      ${i === 0 ? '<button type="button" class="btn-add-phone" title="Добавить ещё телефон" aria-label="Добавить ещё телефон">+</button>' : ''}
    </div>
  `).join('') : `
    <div class="phone-group">
      <input placeholder="Телефон" name="phone" aria-label="Номер телефона">
      <button type="button" class="btn-add-phone" title="Добавить ещё телефон" aria-label="Добавить ещё телефон">+</button>
    </div>
  `;
  document.getElementById('image').value = client.image || '';
  document.getElementById('tags').value = client.tags?.join(', ') || '';
  document.getElementById('deadline').value = client.deadline || '';
  document.getElementById('status').value = client.status;
  document.getElementById('notes').value = client.notes;
  document.getElementById('favorite').checked = client.favorite || false;
  document.getElementById('client-form').dataset.index = index;
  trapFocus(modal);
};

// Delete with confirmation
window.showConfirmDelete = (index) => {
  deleteIndex = index;
  confirmModal.style.display = 'flex';
  trapFocus(confirmModal);
};

document.getElementById('confirm-delete-cancel').addEventListener('click', () => {
  confirmModal.style.display = 'none';
  deleteIndex = null;
});

document.getElementById('confirm-delete-ok').addEventListener('click', () => {
  if (deleteIndex !== null) {
    clients.splice(deleteIndex, 1);
    localStorage.setItem('clients', JSON.stringify(clients));
    currentPage = 0; // Сбрасываем страницу
    renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''));
    showNotification('Клиент удалён');
    confirmModal.style.display = 'none';
    deleteIndex = null;
  }
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPage = 0; // Сбрасываем страницу
    renderClients(btn.id.replace('filter-', ''), 
                 document.getElementById('tag-filter').value, 
                 document.getElementById('date-filter-start').value,
                 document.getElementById('date-filter-end').value);
  });
});

document.getElementById('tag-filter').addEventListener('input', (e) => {
  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''), 
               e.target.value, 
               document.getElementById('date-filter-start').value,
               document.getElementById('date-filter-end').value);
});

document.getElementById('date-filter-start').addEventListener('change', (e) => {
  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''), 
               document.getElementById('tag-filter').value, 
               e.target.value,
               document.getElementById('date-filter-end').value);
});

document.getElementById('date-filter-end').addEventListener('change', (e) => {
  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''), 
               document.getElementById('tag-filter').value, 
               document.getElementById('date-filter-start').value,
               e.target.value);
});

// Search
document.getElementById('search').addEventListener('input', () => {
  currentPage = 0; // Сбрасываем страницу
  renderClients(document.querySelector('.filter-btn.active').id.replace('filter-', ''), 
               document.getElementById('tag-filter').value, 
               document.getElementById('date-filter-start').value,
               document.getElementById('date-filter-end').value);
});

// Export
document.getElementById('export-btn').addEventListener('click', () => {
  const escapeCsvValue = (value) => {
    if (!value) return '';
    return `"${value.replace(/"/g, '""').replace(/\n/g, '\\n')}"`;
  };

  const clientsToExport = selectedClients.size > 0 
    ? clients.filter((_, index) => selectedClients.has(index))
    : clients;

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
    "Имя,Компания,Телефоны,Соцсеть,Сайт,Изображение,Теги,Дедлайн,Статус,Заметки,Избранный,Дата создания\n" +
    clientsToExport.map(c => [
      escapeCsvValue(c.name),
      escapeCsvValue(c.company),
      escapeCsvValue(c.phones?.join(';')),
      escapeCsvValue(c.social),
      escapeCsvValue(c.website),
      escapeCsvValue(c.image),
      escapeCsvValue(c.tags?.join(';')),
      escapeCsvValue(c.deadline),
      escapeCsvValue(c.status),
      escapeCsvValue(c.notes),
      c.favorite,
      escapeCsvValue(c.createdAt)
    ].join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'clients.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Данные экспортированы');
});

// Import
document.getElementById('import-btn').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = [];
        let currentLine = '';
        let inQuotes = false;

        for (let char of text) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === '\n' && !inQuotes) {
            lines.push(currentLine);
            currentLine = '';
          } else {
            currentLine += char;
          }
        }
        if (currentLine) lines.push(currentLine);

        clients = lines.slice(1).map(line => {
          const fields = [];
          let currentField = '';
          let inQuotes = false;

          for (let char of line) {
            if (char === '"' && !inQuotes) {
              inQuotes = true;
            } else if (char === '"' && inQuotes) {
              inQuotes = false;
            } else if (char === ',' && !inQuotes) {
              fields.push(currentField);
              currentField = '';
            } else {
              currentField += char;
            }
          }
          fields.push(currentField);

          if (fields.length < 12) throw new Error('Некорректный формат CSV');

          const [name, company, phones, social, website, image, tags, deadline, status, notes, favorite, createdAt] = fields;
          return {
            name: name.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            company: company.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            phones: phones.replace(/^"|"$/g, '').replace(/""/g, '"').split(';').filter(p => p) || [],
            social: social.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            website: website.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            image: image.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            tags: tags.replace(/^"|"$/g, '').replace(/""/g, '"').split(';').filter(t => t) || [],
            deadline: deadline.replace(/^"|"$/g, '').replace(/""/g, '"') || '',
            status: status.replace(/^"|"$/g, '').replace(/""/g, '"') || 'active',
            notes: notes.replace(/^"|"$/g, '').replace(/""/g, '"').replace(/\\n/g, '\n') || '',
            favorite: favorite === 'true',
            createdAt: createdAt.replace(/^"|"$/g, '').replace(/""/g, '"') || new Date().toISOString()
          };
        }).filter(c => c.name);

        localStorage.setItem('clients', JSON.stringify(clients));
        currentPage = 0; // Сбрасываем страницу
        renderClients();
        showNotification('Данные импортированы');
      } catch (error) {
        showNotification('Ошибка импорта: ' + error.message);
      }
    };
    reader.onerror = () => {
      showNotification('Ошибка при чтении файла');
    };
    reader.readAsText(file, 'UTF-8');
  };
  input.click();
});

// Send email
document.getElementById('send-email').addEventListener('click', () => {
  const email = document.getElementById('social').value;
  if (email && isValidEmail(email)) {
    window.location.href = `mailto:${email}`;
  } else {
    showNotification('Некорректный email');
  }
});

// Add to calendar
document.getElementById('add-to-calendar').addEventListener('click', () => {
  const deadline = document.getElementById('deadline').value;
  const name = document.getElementById('name').value;
  if (deadline) {
    const date = new Date(deadline);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name)}&dates=${date.toISOString().replace(/-|:|\.\d\d\d/g, '')}/${date.toISOString().replace(/-|:|\.\d\d\d/g, '')}`;
    window.open(googleCalendarUrl, '_blank');
  } else {
    showNotification('Укажите дедлайн');
  }
});

// Stats
function updateStats() {
  document.getElementById('total-clients').textContent = clients.length;
  document.getElementById('active-clients').textContent = clients.filter(c => c.status === 'active').length;
  document.getElementById('pending-tasks').textContent = clients.filter(c => c.status === 'priority').length;
  document.getElementById('favorites').textContent = clients.filter(c => c.favorite).length;
}

// Notifications
function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('active');
  setTimeout(() => notification.classList.remove('active'), 2000);
}

// Deadline notifications
function checkDeadlineNotification(client) {
  if (client.deadline && 'Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        const deadline = new Date(client.deadline);
        const now = new Date();
        const timeUntilDeadline = deadline - now;
        
        if (timeUntilDeadline > 0 && timeUntilDeadline <= 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            new Notification('Напоминание о дедлайне', {
              body: `Дедлайн для клиента ${client.name} наступит через 24 часа!`,
              icon: '/favicon.png'
            });
          }, timeUntilDeadline - 24 * 60 * 60 * 1000);
        }
      }
    });
  }
}

// Deadline progress
function calculateProgress(deadline) {
  const now = new Date();
  const due = new Date(deadline);
  const created = new Date(clients.find(c => c.deadline === deadline)?.createdAt || now);
  const total = due - created;
  const elapsed = now - created;
  return total > 0 ? Math.max(0, (elapsed / total) * 100) : 100;
}

// Chart
async function updateChart() {
  await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js');
  const ctx = document.getElementById('client-growth-chart').getContext('2d');

  const monthlyData = {};
  clients.forEach(client => {
    const date = new Date(client.createdAt || new Date());
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
  });

  const labels = Object.keys(monthlyData).sort();
  const data = labels.map(label => monthlyData[label]);

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].borderColor = document.body.classList.contains('dark') ? '#bb86fc' : '#7c4dff';
    chartInstance.data.datasets[0].backgroundColor = 'rgba(124, 77, 255, 0.1)';
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Новые клиенты',
          data,
          borderColor: document.body.classList.contains('dark') ? '#bb86fc' : '#7c4dff',
          backgroundColor: 'rgba(124, 77, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: true, title: { display: true, text: 'Месяц' } },
          y: { beginAtZero: true, title: { display: true, text: 'Клиенты' } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// Initial render
renderClients();
initSortable();

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker зарегистрирован'))
      .catch(err => console.error('Ошибка регистрации Service Worker:', err));
  });
}

// Футер - - - - - - - - - - - -
document.getElementById('current-year').textContent = new Date().getFullYear();

document.getElementById('back-to-top').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

document.querySelector('.feedback-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('feedback-modal');
});

document.getElementById('feedback-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const feedback = document.getElementById('feedback-text').value;
  const subject = encodeURIComponent('Feedback on Client Flow');
  const body = encodeURIComponent(`Feedback:\n${feedback}`);
  window.location.href = `mailto:dev_geniy_partner@protonmail.com?subject=${subject}&body=${body}`;
  showNotification('Спасибо за ваш отзыв! Отправка через ваш email-клиент...');
  closeModal(document.getElementById('feedback-modal'));
  e.target.reset();
});

document.querySelector('.bug-report-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('bug-report-modal');
});

document.getElementById('bug-report-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const bugReport = document.getElementById('bug-report-text').value;
  const subject = encodeURIComponent('Bug Report for Client Flow');
  const body = encodeURIComponent(`Bug Report:\n${bugReport}\n\nBrowser: ${navigator.userAgent}\nVersion: 1.1`);
  window.location.href = `mailto:dev_geniy_partner@protonmail.com?subject=${subject}&body=${body}`;
  showNotification('Спасибо за сообщение об ошибке! Отправка через ваш email-клиент...');
  closeModal(document.getElementById('bug-report-modal'));
  e.target.reset();
});

document.querySelector('.features-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('features-modal');
});

document.querySelector('.support-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('support-modal');
});

document.querySelector('.contact-link').addEventListener('click', (e) => {
  e.preventDefault();
  openModal('contact-modal');
});

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

document.querySelector('.changelog-btn').addEventListener('click', () => {
  openModal('changelog-modal');
});

document.querySelector('#client-form button[type="submit"]').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('client-form').dispatchEvent(new Event('submit'));
});

// ВРЕМЕННАЯ ПРОВЕРКА ЛОКАЛ СТОРЕДЖ
document.addEventListener('DOMContentLoaded', () => {
  try {
    localStorage.setItem('test', 'ok');
    console.log('localStorage работает:', localStorage.getItem('test'));
  } catch (e) {
    console.error('localStorage недоступен:', e);
    showNotification('Хранилище недоступно на устройстве');
  }
});
// КОНЕЦ ПРОВЕРКИ
