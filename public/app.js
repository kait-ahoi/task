// ── State ──────────────────────────────────────────────────────────────────
const state = {
  lang: localStorage.getItem('lang') || 'et',
  filters: { country: '', status: '', ai_tool: '' },
  editingId: null,
  deletingId: null,
};

// ── i18n ───────────────────────────────────────────────────────────────────
async function loadLang(code) {
  const res = await fetch(`/i18n/${code}.json`);
  window.translations = await res.json();
  state.lang = code;
  localStorage.setItem('lang', code);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === code);
  });

  applyTranslations();
}

function t(key) {
  return (window.translations && window.translations[key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Update filter option labels
  document.querySelectorAll('option[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

// ── Formatting ─────────────────────────────────────────────────────────────
function fmtMoney(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
}

function fmtDate(val) {
  if (!val) return '—';
  return val.slice(0, 10);
}

const COUNTRY_FLAGS = { EE: '🇪🇪', LV: '🇱🇻', LT: '🇱🇹', ENG: '🌐' };

function resourceTags(val) {
  if (!val) return '—';
  return val.split(',').filter(Boolean).map(r => `<span class="res-tag">@${r.trim()}</span>`).join(' ');
}

function countryTags(val) {
  if (!val) return '—';
  return val.split(',').filter(Boolean).map(c => `${COUNTRY_FLAGS[c.trim()] || ''} ${c.trim()}`).join(', ');
}

function statusBadge(status) {
  const label = t(`status_${status}`) || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

// ── Stats ──────────────────────────────────────────────────────────────────
async function renderStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-total').textContent = data.totalProjects;
    document.getElementById('stat-planned').textContent = fmtMoney(data.totalPlannedSavings);
    document.getElementById('stat-actual').textContent = fmtMoney(data.totalActualSavings);
  } catch (e) {
    console.error('Stats fetch failed', e);
  }
}

// ── Projects list ──────────────────────────────────────────────────────────
async function loadProjects() {
  const params = new URLSearchParams();
  if (state.filters.country) params.set('country', state.filters.country);
  if (state.filters.status) params.set('status', state.filters.status);
  if (state.filters.ai_tool) params.set('ai_tool', state.filters.ai_tool);

  try {
    const res = await fetch('/api/projects?' + params);
    const projects = await res.json();
    renderTable(projects);
  } catch (e) {
    console.error('Projects fetch failed', e);
  }
}

function renderTable(projects) {
  const tbody = document.getElementById('projects-body');
  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">${t('no_projects')}</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td><strong>${esc(p.name)}</strong>${p.description ? `<br><small style="color:var(--text-muted)">${esc(p.description.slice(0, 60))}${p.description.length > 60 ? '…' : ''}</small>` : ''}</td>
      <td class="country-tag">${countryTags(p.country)}</td>
      <td>${esc(p.responsible)}</td>
      <td>${esc(p.department)}</td>
      <td>${esc(p.ai_tool)}</td>
      <td>${esc(p.service_provider || '—')}</td>
      <td>${statusBadge(p.status)}</td>
      <td style="text-align:right">${fmtMoney(p.planned_savings)}</td>
      <td style="text-align:right">${fmtMoney(p.actual_savings)}</td>
      <td>${fmtDate(p.start_date)}</td>
      <td>${resourceTags(p.resources)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openEditModal(${p.id})" title="${t('btn_edit')}">✏️</button>
          <button class="btn-icon danger" onclick="openDeleteModal(${p.id})" title="${t('btn_delete')}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Add modal ──────────────────────────────────────────────────────────────
function openAddModal() {
  state.editingId = null;
  document.getElementById('modal-title').textContent = t('modal_add_title');
  document.getElementById('project-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('pin-group').hidden = true;
  document.getElementById('form-pin').value = '';
  document.querySelectorAll('[name="resources"],[name="country"],[name="department"]').forEach(cb => cb.checked = false);
  clearFormErrors();
  showModal('modal-overlay');
}

// ── Edit modal ─────────────────────────────────────────────────────────────
async function openEditModal(id) {
  state.editingId = id;
  document.getElementById('modal-title').textContent = t('modal_edit_title');
  clearFormErrors();

  try {
    const res = await fetch(`/api/projects?`);
    const all = await res.json();
    const p = all.find(x => x.id === id);
    if (!p) return;

    document.getElementById('form-id').value = p.id;
    document.getElementById('form-name').value = p.name;
    document.getElementById('form-responsible').value = p.responsible;
    document.getElementById('form-tool').value = p.ai_tool;

    const selCountries = (p.country || '').split(',').map(c => c.trim()).filter(Boolean);
    document.querySelectorAll('[name="country"]').forEach(cb => { cb.checked = selCountries.includes(cb.value); });

    const selDepts = (p.department || '').split(',').map(d => d.trim()).filter(Boolean);
    document.querySelectorAll('[name="department"]').forEach(cb => { cb.checked = selDepts.includes(cb.value); });
    document.getElementById('form-provider').value = p.service_provider || '';
    document.getElementById('form-status').value = p.status;
    document.getElementById('form-planned').value = p.planned_savings || '';
    document.getElementById('form-actual').value = p.actual_savings || '';
    document.getElementById('form-start').value = p.start_date || '';
    document.getElementById('form-description').value = p.description || '';
    document.getElementById('form-pin').value = '';

    const selected = (p.resources || '').split(',').map(r => r.trim()).filter(Boolean);
    document.querySelectorAll('[name="resources"]').forEach(cb => {
      cb.checked = selected.includes(cb.value);
    });

    document.getElementById('pin-group').hidden = false;
    showModal('modal-overlay');
  } catch (e) {
    console.error('Failed to load project', e);
  }
}

// ── Form submit ────────────────────────────────────────────────────────────
async function submitProject(e) {
  e.preventDefault();
  clearFormErrors();

  const isEdit = !!state.editingId;
  const body = {
    name: document.getElementById('form-name').value.trim(),
    country: Array.from(document.querySelectorAll('[name="country"]:checked')).map(cb => cb.value).join(','),
    responsible: document.getElementById('form-responsible').value.trim(),
    department: Array.from(document.querySelectorAll('[name="department"]:checked')).map(cb => cb.value).join(','),
    ai_tool: document.getElementById('form-tool').value,
    service_provider: document.getElementById('form-provider').value.trim(),
    status: document.getElementById('form-status').value,
    planned_savings: parseFloat(document.getElementById('form-planned').value) || 0,
    actual_savings: parseFloat(document.getElementById('form-actual').value) || 0,
    start_date: document.getElementById('form-start').value || null,
    description: document.getElementById('form-description').value.trim(),
    resources: Array.from(document.querySelectorAll('[name="resources"]:checked')).map(cb => cb.value).join(','),
  };

  const required = ['name', 'country', 'responsible', 'department', 'ai_tool', 'status'];
  let valid = true;
  required.forEach(f => {
    if (!body[f]) {
      const idMap = { ai_tool: 'form-tool', country: 'form-country-grp', department: 'form-department-grp' };
      const inputId = idMap[f] || `form-${f}`;
      const el = document.getElementById(inputId);
      if (el) el.classList.add('error');
      valid = false;
    }
  });
  if (!valid) return;

  const pin = isEdit ? document.getElementById('form-pin').value : null;
  const headers = { 'Content-Type': 'application/json' };
  if (pin) headers['x-admin-pin'] = pin;

  const url = isEdit ? `/api/projects/${state.editingId}` : '/api/projects';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    if (res.status === 403) {
      const pinErr = document.getElementById('pin-error');
      pinErr.hidden = false;
      document.getElementById('form-pin').classList.add('error');
      return;
    }
    if (!res.ok) throw new Error(await res.text());

    hideModal('modal-overlay');
    await loadProjects();
    await renderStats();
  } catch (e) {
    alert(t('err_network'));
    console.error(e);
  }
}

function clearFormErrors() {
  document.querySelectorAll('.form-group input.error, .form-group select.error, .check-group.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(el => el.hidden = true);
}

// ── Delete modal ───────────────────────────────────────────────────────────
function openDeleteModal(id) {
  state.deletingId = id;
  document.getElementById('delete-pin').value = '';
  document.getElementById('delete-pin-error').hidden = true;
  showModal('delete-overlay');
}

async function confirmDelete() {
  const pin = document.getElementById('delete-pin').value;
  try {
    const res = await fetch(`/api/projects/${state.deletingId}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': pin }
    });
    if (res.status === 403) {
      document.getElementById('delete-pin-error').hidden = false;
      document.getElementById('delete-pin').classList.add('error');
      return;
    }
    if (!res.ok) throw new Error(await res.text());

    hideModal('delete-overlay');
    await loadProjects();
    await renderStats();
  } catch (e) {
    alert(t('err_network'));
    console.error(e);
  }
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function showModal(id) { document.getElementById(id).hidden = false; }
function hideModal(id) { document.getElementById(id).hidden = true; }

// ── Event listeners ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadLang(state.lang);
  await loadProjects();
  await renderStats();

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => loadLang(btn.dataset.lang));
  });

  // Add button
  document.getElementById('btn-open-add').addEventListener('click', openAddModal);

  // Form submit
  document.getElementById('project-form').addEventListener('submit', submitProject);

  // Cancel / close
  document.getElementById('btn-cancel').addEventListener('click', () => hideModal('modal-overlay'));
  document.getElementById('modal-close').addEventListener('click', () => hideModal('modal-overlay'));
  document.getElementById('delete-cancel').addEventListener('click', () => hideModal('delete-overlay'));
  document.getElementById('delete-close').addEventListener('click', () => hideModal('delete-overlay'));

  // Confirm delete
  document.getElementById('delete-confirm').addEventListener('click', confirmDelete);

  // Close on overlay click
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal('modal-overlay');
  });
  document.getElementById('delete-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal('delete-overlay');
  });

  // Filters
  ['filter-country', 'filter-status', 'filter-tool'].forEach(id => {
    const map = { 'filter-country': 'country', 'filter-status': 'status', 'filter-tool': 'ai_tool' };
    document.getElementById(id).addEventListener('change', e => {
      state.filters[map[id]] = e.target.value;
      loadProjects();
    });
  });
});
