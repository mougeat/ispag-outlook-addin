/* ISPAG CRM – add-in Outlook : modèles de mails avec champs dynamiques. */
const API_BASE = 'https://app.ispag-asp.ch/wp-json/ispag/v1';
const STORE_KEY = 'ispag_outlook_token';

const $ = (id) => document.getElementById(id);
const state = { token: null, templates: [], current: null, context: {}, values: {} };

// Libellés lisibles pour les champs connus ; les autres affichent leur clé.
const FIELD_LABELS = {
  deal_name: 'Nom du deal', deal_offer_num: "N° d'offre", deal_total: 'Montant',
  contact_first_name: 'Prénom', contact_last_name: 'Nom', contact_full_name: 'Nom complet',
  contact_email: 'E-mail', contact_phone: 'Téléphone', company_name: 'Entreprise',
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function saveToken(t) { try { t ? localStorage.setItem(STORE_KEY, t) : localStorage.removeItem(STORE_KEY); } catch (e) { /* stockage indisponible */ } }
function loadToken() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }

async function api(path, { method = 'GET', params, body } = {}) {
  const url = new URL(API_BASE + path);
  if (params) Object.entries(params).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(state.token ? { 'X-ISPAG-API-Key': state.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) { const e = new Error('auth'); e.auth = true; throw e; }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erreur ' + res.status);
  return res.json();
}

/* ---------- Connexion ---------- */
function showLogin(msg) {
  $('view-app').hidden = true;
  $('view-login').hidden = false;
  $('login-error').textContent = msg || '';
}

async function login() {
  try {
    const r = await api('/auth/login', { method: 'POST', body: { username: $('login-user').value.trim(), password: $('login-pass').value } });
    state.token = r.token;
    saveToken(r.token);
    $('login-pass').value = '';
    await startApp(r.display_name);
  } catch (e) { showLogin(e.message === 'auth' ? 'Identifiants incorrects' : e.message); }
}

function logout() { state.token = null; saveToken(null); showLogin(); }

async function startApp(name) {
  $('view-login').hidden = true;
  $('view-app').hidden = false;
  try {
    if (!name) name = (await api('/auth/me')).display_name;
    $('user-name').textContent = name;
    await loadFolders();
    await loadTemplates();
  } catch (e) { e.auth ? logout() : ($('tpl-list').innerHTML = `<li>${escapeHtml(e.message)}</li>`); }
}

/* ---------- Modèles ---------- */
async function loadFolders() {
  const folders = await api('/mail-template-folders');
  $('folder').innerHTML = '<option value="">Tous les dossiers</option>' +
    folders.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
}

async function loadTemplates() {
  state.templates = await api('/mail-templates', { params: { lang: $('lang').value, folder_id: $('folder').value } });
  renderTemplates();
}

function renderTemplates() {
  const q = $('tpl-search').value.toLowerCase();
  const items = state.templates.filter((t) => (t.name + ' ' + (t.subject || '')).toLowerCase().includes(q));
  const ul = $('tpl-list');
  ul.innerHTML = items.length ? '' : '<li>Aucun modèle</li>';
  items.forEach((t) => {
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(t.name)}<small>${escapeHtml(t.folder_name || '')}</small>`;
    li.onclick = () => selectTemplate(t);
    ul.appendChild(li);
  });
}

/* ---------- Deal ---------- */
async function searchDeals() {
  const q = $('deal-search').value.trim();
  const ul = $('deal-results');
  ul.innerHTML = '';
  if (q.length < 2) return;
  try {
    (await api('/deals-search', { params: { q } })).forEach((d) => {
      const li = document.createElement('li');
      li.innerHTML = `${escapeHtml(d.ObjetCommande || '')}<small>${escapeHtml(d.NumCommande || '')}</small>`;
      li.onclick = () => selectDeal(d);
      ul.appendChild(li);
    });
  } catch (e) { e.auth ? logout() : (ul.innerHTML = `<li>${escapeHtml(e.message)}</li>`); }
}

async function selectDeal(d) {
  $('deal-results').innerHTML = '';
  $('deal-search').value = '';
  $('deal-selected').textContent = `${d.ObjetCommande} (${d.NumCommande})`;
  try { state.context = await api('/deal-context', { params: { deal_id: d.hubspot_deal_id } }); }
  catch (e) { state.context = {}; $('deal-selected').textContent += ' — contexte indisponible'; }
  if (state.current) selectTemplate(state.current, true); // re-préremplit les champs
}

/* ---------- Champs & aperçu ---------- */
const tagsOf = (t) => [...new Set([...((t.subject || '') + (t.content || '')).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];

function fill(text) {
  return (text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (state.values[k] ? escapeHtml(state.values[k]) : `<mark>${m}</mark>`));
}

function selectTemplate(t, keepEdits) {
  state.current = t;
  const keys = tagsOf(t);
  const prev = keepEdits ? state.values : {};
  state.values = {};
  keys.forEach((k) => { state.values[k] = prev[k] || state.context[k] || ''; });
  $('fields').innerHTML = '';
  keys.forEach((k) => {
    const label = document.createElement('label');
    label.textContent = FIELD_LABELS[k] || k;
    const input = document.createElement('input');
    input.value = state.values[k];
    input.oninput = () => { state.values[k] = input.value; renderPreview(); };
    label.appendChild(input);
    $('fields').appendChild(label);
  });
  $('step-fields').hidden = false;
  $('status').textContent = '';
  renderPreview();
}

function renderPreview() {
  const t = state.current;
  $('preview').innerHTML = `<strong>${fill(escapeHtml(t.subject || ''))}</strong><hr>${fill(t.content)}`;
}

/* ---------- Insertion ---------- */
const officeCall = (fn) => new Promise((resolve, reject) => fn((r) => (r.status === Office.AsyncResultStatus.Succeeded ? resolve(r.value) : reject(r.error))));

async function insert() {
  const t = state.current;
  const plain = (s) => (s || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => state.values[k] || m);
  const html = (t.content || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (state.values[k] ? escapeHtml(state.values[k]) : m));
  const item = Office.context.mailbox.item;
  try {
    if (t.subject) await officeCall((cb) => item.subject.setAsync(plain(t.subject), cb));
    await officeCall((cb) => item.body.setSelectedDataAsync(html, { coercionType: Office.CoercionType.Html }, cb));
    // Destinataire : seulement si un e-mail est connu et que la liste « À » est vide.
    const email = state.values.contact_email || state.context.contact_email;
    if (email) {
      const to = await officeCall((cb) => item.to.getAsync(cb));
      if (!to.length) await officeCall((cb) => item.to.setAsync([email], cb));
    }
    const missing = Object.keys(state.values).filter((k) => !state.values[k]);
    $('status').textContent = missing.length ? `Inséré — champs vides : ${missing.join(', ')}` : 'Modèle inséré ✔';
  } catch (e) { $('status').textContent = 'Erreur : ' + (e.message || e); }
}

/* ---------- Démarrage ---------- */
Office.onReady(() => {
  $('login-btn').onclick = login;
  $('logout-btn').onclick = logout;
  $('lang').onchange = loadTemplates;
  $('folder').onchange = loadTemplates;
  $('tpl-search').oninput = renderTemplates;
  $('deal-search').oninput = debounce(searchDeals);
  $('insert-btn').onclick = insert;
  $('cancel-btn').onclick = () => { state.current = null; $('step-fields').hidden = true; };

  state.token = loadToken();
  state.token ? startApp() : showLogin();
});
