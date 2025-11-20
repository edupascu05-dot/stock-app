// ========= SEED & STORAGE =========

// Seed users; mutabele 'users' i.p.v. hardcoded
const defaultUsers = {
  '1234': 'Nat',
  '5678': 'Alex',
  '4444': 'Edu',
  '9999': 'Iri'
};

function loadUsers() {
  const raw = localStorage.getItem('users');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}
function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
function ensureUsersSeed() {
  let users = loadUsers();
  if (!users) { users = { ...defaultUsers }; saveUsers(users); }
  return users;
}

// ========= GLOBAL STATE =========
let users = ensureUsersSeed();               // code -> naam
const stockManagementPassword = '1111';

let loggedInUser = null;                     // naam
let selectedContext = null;
let stock = JSON.parse(localStorage.getItem('stock')) || {};   // { barcode: {name, quantity} }
let logbook = JSON.parse(localStorage.getItem('logbook')) || [];

// ========= PERSIST =========
function saveStock() { localStorage.setItem('stock', JSON.stringify(stock)); }
function saveLogbook() { localStorage.setItem('logbook', JSON.stringify(logbook)); }
function saveUser(user) { localStorage.setItem('loggedInUser', user); }
function loadUser() { return localStorage.getItem('loggedInUser'); }

// ========= RENDERING =========
function renderProductList() {
  const datalist = document.getElementById('productList');
  if (!datalist) return;
  datalist.innerHTML = '';
  Object.values(stock)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .forEach(item => {
      const option = document.createElement('option');
      option.value = item.name;
      datalist.appendChild(option);
    });
}
function renderLowStockList() {
  const ul = document.getElementById('lowStockList');
  if (!ul) return;
  ul.innerHTML = '';
  let hasLow = false;
  Object.entries(stock).forEach(([code, data]) => {
    if (data.quantity <= 5) {
      hasLow = true;
      const li = document.createElement('li');
      li.textContent = `${data.name || code} - Voorraad: ${data.quantity}`;
      li.classList.add('lowStock');
      ul.appendChild(li);
    }
  });
  if (!hasLow) {
    const li = document.createElement('li');
    li.textContent = 'Geen producten met lage voorraad.';
    ul.appendChild(li);
  }
}
function renderUsageLog() {
  const ul = document.getElementById('logList');
  if (!ul) return;
  ul.innerHTML = '';
  const filtered = logbook.filter(entry => entry.quantity < 0);
  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Geen gebruik geregistreerd.';
    ul.appendChild(li);
    return;
  }
  filtered.forEach(entry => {
    const date = new Date(entry.timestamp);
    const name = stock[entry.product]?.name || entry.product;
    const li = document.createElement('li');
    li.textContent = `${entry.user} gebruikte ${name} (${entry.quantity}) op ${date.toLocaleString()} in ${entry.context}`;
    ul.appendChild(li);
  });
}
function renderFullLog() {
  const tbody = document.querySelector('#fullLogList tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (logbook.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5; td.style.textAlign = 'center'; td.textContent = 'Logboek is leeg.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  logbook.forEach(entry => {
    const date = new Date(entry.timestamp);
    const name = stock[entry.product]?.name || entry.product;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.user}</td>
      <td>${name}</td>
      <td>${entry.quantity}</td>
      <td>${date.toLocaleString()}</td>
      <td>${entry.context}</td>
    `;
    tbody.appendChild(tr);
  });
}
function renderStockList() {
  const ul = document.getElementById('stockList');
  if (!ul) return;
  ul.innerHTML = '';
  Object.entries(stock)
    .sort((a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0]))
    .forEach(([code, data]) => {
      const li = document.createElement('li');
      li.textContent = `${data.name || code} - Voorraad: ${data.quantity}`;
      ul.appendChild(li);
    });
}
function renderUserInfo() {
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  userInfo.textContent = `👤 Ingelogd als: ${loggedInUser || ''}`;
}

// ========= PUBLIC PRODUCTS (READ-ONLY) =========
function renderPublicProducts() {
  const tbody = document.querySelector('#publicProductsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.entries(stock)
    .sort((a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0]))
    .forEach(([barcode, data]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${barcode}</td>
        <td>${data.name}</td>
        <td>${data.quantity}</td>
      `;
      tbody.appendChild(tr);
    });
}

// ========= ADMIN RENDER =========
function renderAdminProducts() {
  const tbody = document.querySelector('#adminProductsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.entries(stock)
    .sort((a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0]))
    .forEach(([barcode, data]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${barcode}</td>
        <td>${data.name}</td>
        <td>${data.quantity}</td>
        <td>
          <button class="danger-btn delete-product-btn" data-barcode="${barcode}">Verwijderen</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bc = btn.getAttribute('data-barcode');
      removeProduct(bc);
    });
  });
}
function renderAdminUsers() {
  const tbody = document.querySelector('#adminUsersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  Object.entries(users)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([code, name]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${code}</td>
        <td>${name}</td>
        <td>
          <button class="danger-btn" data-code="${code}">Verwijderen</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll('button.danger-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      removeUser(code);
    });
  });
}

// ========= LOOKUPS =========
function findBarcodeByName(name) {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase();
  return Object.keys(stock).find(
    key => (stock[key].name || '').trim().toLowerCase() === cleaned
  );
}
function isAdminUser(name) { return name === 'Edu' || name === 'Nat'; }

// ========= NORMALIZE (UI) =========
function normalizeProductFieldToName(inputEl) {
  if (!inputEl) return;
  const raw = (inputEl.value || '').trim();
  if (!raw) return;
  if (stock.hasOwnProperty(raw)) { inputEl.value = stock[raw].name; return; }
  const bc = findBarcodeByName(raw);
  if (bc) inputEl.value = stock[bc].name;
}

// ========= VALIDATORS / CLEARS =========
function hasValidPositiveQty() {
  const el = document.getElementById('quantity');
  const n = Number((el?.value || '').trim());
  return Number.isFinite(n) && n > 0;
}
function clearUsageInputs() {
  const bc = document.getElementById('barcode');
  const qty = document.getElementById('quantity');
  if (bc) bc.value = ''; if (qty) qty.value = '';
  clearMessages();
}
function clearContextSelection() {
  document.querySelectorAll('.context-button').forEach(b => b.classList.remove('selected'));
  selectedContext = null;
}
function clearMessages() {
  const ids = ['appMessage','loginWarning','addStockWarning','newProductWarning','adminUsersWarning'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}
function clearStockAddInputs() {
  const sel = document.getElementById('selectProductStock');
  const qty = document.getElementById('quantityStock');
  if (sel) sel.value = ''; if (qty) qty.value = '';
}
function clearNewProductInputs() {
  ['newCode','newName','newQty'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

// ========= CORE FLOWS =========
function registerAction() {
  const inputEl = document.getElementById('barcode');
  const qtyEl = document.getElementById('quantity');
  const message = document.getElementById('appMessage');
  if (!inputEl || !qtyEl) return;

  clearMessages();

  const input = inputEl.value.trim();
  let barcodeValue = null;

  if (stock.hasOwnProperty(input)) {
    barcodeValue = input;                      // scanner barcode
    inputEl.value = stock[input].name;         // toon naam
  } else {
    barcodeValue = findBarcodeByName(input);   // handmatig ingevoerde naam
  }

  const quantityValue = qtyEl.value.trim();

  if (!barcodeValue || !stock[barcodeValue]) {
    if (message) { message.textContent = 'Product niet gevonden.'; message.className = 'error'; }
    return;
  }
  if (!quantityValue || isNaN(quantityValue) || Number(quantityValue) <= 0) {
    if (message) { message.textContent = 'Vul een geldig positief aantal in.'; message.className = 'error'; }
    return;
  }
  if (!selectedContext) {
    if (message) { message.textContent = 'Selecteer een kabinet.'; message.className = 'error'; }
    return;
  }

  const delta = -Math.abs(Number(quantityValue));
  if (stock[barcodeValue].quantity + delta < 0) {
    if (message) { message.textContent = `Niet genoeg voorraad. (${stock[barcodeValue].quantity} beschikbaar)`; message.className = 'error'; }
    return;
  }

  stock[barcodeValue].quantity += delta;
  saveStock();
  logbook.push({ user: loggedInUser, product: barcodeValue, quantity: delta, timestamp: Date.now(), context: selectedContext });
  saveLogbook();

  if (message) { message.textContent = `Gebruik van ${stock[barcodeValue].name} geregistreerd: ${-delta} stuks.`; message.className = 'success'; }

  renderLowStockList();
  renderUsageLog();
  renderFullLog();

  clearUsageInputs(); // context behouden
  inputEl.focus();
}

function openStockManagement() {
  const pwd = prompt('Wachtwoord voor voorraadbeheer:');
  if (pwd !== stockManagementPassword) { alert('Onjuist wachtwoord!'); return; }
  document.getElementById('appSection')?.classList.add('hidden');
  document.getElementById('stockManagementSection')?.classList.remove('hidden');
  renderStockList();
  renderFullLog();
  clearUsageInputs();
  clearMessages();
}

function backToApp() {
  document.getElementById('stockManagementSection')?.classList.add('hidden');
  document.getElementById('appSection')?.classList.remove('hidden');
  renderLowStockList();
  renderUsageLog();
  clearUsageInputs();
  clearMessages();
}

function addToStock() {
  const inputEl = document.getElementById('selectProductStock');
  const qtyEl = document.getElementById('quantityStock');
  const warning = document.getElementById('addStockWarning');
  if (!inputEl || !qtyEl) return;

  if (warning) warning.textContent = '';

  const raw = inputEl.value.trim();
  let barcode = null;
  if (stock.hasOwnProperty(raw)) barcode = raw;
  else barcode = findBarcodeByName(raw);

  const qty = Number(qtyEl.value.trim());

  if (!barcode || !stock[barcode] || isNaN(qty) || qty <= 0) {
    if (warning) warning.textContent = 'Ongeldige invoer of product bestaat niet.';
    return;
  }

  stock[barcode].quantity += qty;
  saveStock();
  logbook.push({ user: loggedInUser, product: barcode, quantity: qty, timestamp: Date.now(), context: 'Voorraadbeheer' });
  saveLogbook();

  inputEl.value = stock[barcode].name;

  renderStockList();
  renderLowStockList();
  renderUsageLog();
  renderFullLog();
  if (warning) warning.textContent = `Voorraad van ${stock[barcode].name} aangevuld met ${qty}.`;
  clearStockAddInputs();
  inputEl.focus();
}

function addNewProduct() {
  const codeEl = document.getElementById('newCode');
  const nameEl = document.getElementById('newName');
  const qtyEl = document.getElementById('newQty');
  const warning = document.getElementById('newProductWarning');
  if (!codeEl || !nameEl || !qtyEl) return;

  if (warning) warning.textContent = '';

  const code = codeEl.value.trim();
  const name = nameEl.value.trim();
  const qty = Number(qtyEl.value.trim());

  // Unieke code + unieke NAAM (case-insensitive)
  const nameExists = Object.values(stock).some(
    p => (p.name || '').trim().toLowerCase() === name.toLowerCase()
  );

  if (!code || !name || isNaN(qty) || qty < 0 || stock.hasOwnProperty(code) || nameExists) {
    if (warning) warning.textContent = 'Ongeldige invoer, product bestaat al (code of naam).';
    return;
  }

  stock[code] = { name, quantity: qty };
  saveStock();
  logbook.push({ user: loggedInUser, product: code, quantity: qty, timestamp: Date.now(), context: 'Nieuw product' });
  saveLogbook();

  renderStockList();
  renderLowStockList();
  renderUsageLog();
  renderFullLog();
  renderProductList();
  if (warning) warning.textContent = `Nieuw product "${name}" toegevoegd met voorraad ${qty}.`;
  clearNewProductInputs();
}

// ========= ADMIN ONLY =========
function openAdmin() {
  if (!isAdminUser(loggedInUser)) return;
  document.getElementById('appSection')?.classList.add('hidden');
  document.getElementById('stockManagementSection')?.classList.add('hidden');
  document.getElementById('adminSection')?.classList.remove('hidden');
  renderAdminProducts();
  renderAdminUsers();
}
function closeAdmin() {
  document.getElementById('adminSection')?.classList.add('hidden');
  document.getElementById('appSection')?.classList.remove('hidden');
}

function addUser() {
  const codeEl = document.getElementById('newUserCode');
  const nameEl = document.getElementById('newUserName');
  const warning = document.getElementById('adminUsersWarning');
  if (!codeEl || !nameEl || !warning) return;

  warning.textContent = '';
  const code = (codeEl.value || '').trim();
  const name = (nameEl.value || '').trim();

  if (!code || !name) { warning.textContent = 'Vul code en naam in.'; return; }
  if (users[code]) { warning.textContent = 'Deze code bestaat al.'; return; }
  const nameExists = Object.values(users).some(n => n.trim().toLowerCase() === name.toLowerCase());
  if (nameExists) { warning.textContent = 'Deze naam bestaat al.'; return; }

  users[code] = name;
  saveUsers(users);
  codeEl.value = ''; nameEl.value = '';
  renderAdminUsers();
}

function removeUser(code) {
  const warning = document.getElementById('adminUsersWarning');
  if (!warning) return;

  if (!isAdminUser(loggedInUser)) { warning.textContent = 'Alleen admins kunnen gebruikers verwijderen.'; return; }
  if (!users[code]) { warning.textContent = 'Gebruiker bestaat niet.'; return; }

  if (users[code] === loggedInUser) { warning.textContent = 'Je kunt jezelf niet verwijderen.'; return; }

  const isTargetAdmin = isAdminUser(users[code]);
  if (isTargetAdmin) {
    const otherAdminStillExists = Object.values(users).some(n => isAdminUser(n) && n !== users[code]);
    if (!otherAdminStillExists) { warning.textContent = 'Er moet minstens één admin overblijven.'; return; }
  }

  delete users[code];
  saveUsers(users);
  renderAdminUsers();
}

function removeProduct(barcode) {
  if (!isAdminUser(loggedInUser)) return;
  const prod = stock[barcode];
  if (!prod) return;

  const baseMsg = `Product "${prod.name}" (${barcode}) verwijderen?`;
  if (!confirm(`${baseMsg}\nHuidige voorraad: ${prod.quantity}`)) return;

  if (prod.quantity > 0) {
    if (!confirm(`Er staat nog ${prod.quantity} op voorraad.\nToch definitief verwijderen?`)) return;
  }

  delete stock[barcode];
  saveStock();

  renderProductList();
  renderStockList();
  renderLowStockList();
  renderPublicProducts();
  renderAdminProducts();
  renderFullLog();

  const warning = document.getElementById('newProductWarning');
  if (warning) warning.textContent = `Product "${prod.name}" verwijderd.`;
}

function downloadLogbookExcel() {
  const headers = ['Medewerker','Barcode','Productnaam','Aantal','Tijdstip','Kabinet'];
  const rows = logbook.map(entry => {
    const date = new Date(entry.timestamp);
    const name = stock[entry.product]?.name || '';
    return [
      entry.user,
      entry.product,
      name,
      entry.quantity,
      date.toLocaleString(),
      entry.context
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Logboek");
  XLSX.writeFile(workbook, "logboek.xlsx");
}

// ========= INIT =========
window.onload = function () {
  const savedUser = loadUser();
  if (savedUser && Object.values(users).includes(savedUser)) {
    loggedInUser = savedUser;
    document.getElementById('loginSection')?.classList.add('hidden');
    document.getElementById('appSection')?.classList.remove('hidden');
    const lo = document.getElementById('logoutBtn');
    if (lo) lo.style.display = 'block';
    renderProductList();
    renderLowStockList();
    renderUsageLog();
    renderFullLog();
    renderUserInfo();

    const adminBtn = document.getElementById('openAdminBtn');
    if (adminBtn) adminBtn.classList.toggle('hidden', !isAdminUser(loggedInUser));

    document.getElementById('barcode')?.focus();
  }

  // Kabinetknoppen
  document.querySelectorAll('.context-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.context-button').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
      selectedContext = button.getAttribute('data-context');
    });
  });

  // Scanner gebruiksregistratie (debounce) – auto-register ALLEEN als qty>0 & kabinet gekozen
  let barcodeTypingTimer;
  const barcodeInput = document.getElementById('barcode');
  if (barcodeInput) {
    barcodeInput.addEventListener('input', function () {
      clearTimeout(barcodeTypingTimer);
      barcodeTypingTimer = setTimeout(() => {
        const value = barcodeInput.value.trim();
        if (!value) return;
        normalizeProductFieldToName(barcodeInput);
        if (hasValidPositiveQty() && selectedContext) {
          registerAction();
        }
      }, 200);
    });
    barcodeInput.addEventListener('blur', function () {
      const value = barcodeInput.value.trim();
      if (!value) return;
      normalizeProductFieldToName(barcodeInput);
      if (hasValidPositiveQty() && selectedContext) {
        registerAction();
      }
    });
  }

  // Voorraad aanvullen: normaliseer naar NAAM (geen auto-add)
  const stockInput = document.getElementById('selectProductStock');
  if (stockInput) {
    let normalizeTimer;
    stockInput.addEventListener('input', function () {
      clearTimeout(normalizeTimer);
      normalizeTimer = setTimeout(() => {
        normalizeProductFieldToName(stockInput);
      }, 200);
    });
    stockInput.addEventListener('blur', function () {
      normalizeProductFieldToName(stockInput);
    });
  }

  // Live validatie nieuw product
  const newCodeEl = document.getElementById('newCode');
  const newNameEl = document.getElementById('newName');
  if (newCodeEl) {
    let t; newCodeEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(validateNewProductLive, 150); });
    newCodeEl.addEventListener('blur', validateNewProductLive);
  }
  if (newNameEl) {
    let t2; newNameEl.addEventListener('input', () => { clearTimeout(t2); t2 = setTimeout(validateNewProductLive, 150); });
    newNameEl.addEventListener('blur', validateNewProductLive);
  }

  // Login
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      const code = document.getElementById('codeInput').value.trim();
      const warning = document.getElementById('loginWarning');

      if (!code) { if (warning) warning.textContent = 'Voer je persoonlijke code in.'; return; }

      const name = users[code];
      if (name) {
        loggedInUser = name; saveUser(loggedInUser);
        if (warning) warning.textContent = '';

        document.getElementById('loginSection')?.classList.add('hidden');
        document.getElementById('appSection')?.classList.remove('hidden');
        const loBtn = document.getElementById('logoutBtn');
        if (loBtn) loBtn.style.display = 'block';

        const adminBtn2 = document.getElementById('openAdminBtn');
        if (adminBtn2) adminBtn2.classList.toggle('hidden', !isAdminUser(loggedInUser));

        renderProductList();
        renderLowStockList();
        renderUsageLog();
        renderFullLog();
        renderUserInfo();
        document.getElementById('barcode')?.focus();
      } else {
        if (warning) warning.textContent = 'Onbekende code.';
      }

      document.getElementById('codeInput').value = '';
    });
  }

  // Uitloggen
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      loggedInUser = null;
      localStorage.removeItem('loggedInUser');
      document.getElementById('loginSection')?.classList.remove('hidden');
      document.getElementById('appSection')?.classList.add('hidden');
      document.getElementById('stockManagementSection')?.classList.add('hidden');
      document.getElementById('adminSection')?.classList.add('hidden');
      logoutBtn.style.display = 'none';
      renderUserInfo();
      clearUsageInputs();
      clearContextSelection();
      clearMessages();
    });
  }

  // Voorraadbeheer
  document.getElementById('openStockBtn')?.addEventListener('click', openStockManagement);

  // Beheer openen (alleen admin)
  document.getElementById('openAdminBtn')?.addEventListener('click', () => {
    if (!isAdminUser(loggedInUser)) return;
    openAdmin();
  });

  // Gebruiker toevoegen
  document.getElementById('addUserBtn')?.addEventListener('click', () => {
    if (!isAdminUser(loggedInUser)) return;
    addUser();
  });

  // Logboek download
  document.getElementById('downloadLogBtn')?.addEventListener('click', () => {
    if (!isAdminUser(loggedInUser)) return;
    downloadLogbookExcel();
  });

  // Register-knop
  const registerBtn = document.getElementById('registerBtn');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerAction();
    });
  }

  // Publieke producten-overzicht (read-only) togglen
  const togglePublicBtn = document.getElementById('togglePublicProductsBtn');
  const publicPanel = document.getElementById('publicProductsPanel');
  if (togglePublicBtn && publicPanel) {
    togglePublicBtn.addEventListener('click', () => {
      const isHidden = publicPanel.classList.contains('hidden');
      if (isHidden) {
        renderPublicProducts();
        publicPanel.classList.remove('hidden');
        togglePublicBtn.textContent = 'Verberg producten-overzicht';
      } else {
        publicPanel.classList.add('hidden');
        togglePublicBtn.textContent = 'Toon (read-only) producten-overzicht';
      }
    });
  }
};

// ========= Live validatie nieuw product =========
function validateNewProductLive() {
  const codeEl = document.getElementById('newCode');
  const nameEl = document.getElementById('newName');
  const warning = document.getElementById('newProductWarning');
  if (!codeEl || !nameEl || !warning) return;

  const code = (codeEl.value || '').trim();
  const name = (nameEl.value || '').trim();
  let msg = '';

  if (code && stock.hasOwnProperty(code)) {
    const existingName = stock[code].name || '';
    if (!name) nameEl.value = existingName;
    msg = `Deze barcode bestaat al voor "${existingName}". Je kunt dit product niet opnieuw toevoegen.`;
  }
  if (name) {
    const nameExists = Object.values(stock).some(
      p => (p.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (nameExists) msg = msg || 'Deze productnaam bestaat al. Kies een andere naam.';
  }
  warning.textContent = msg;
}

// ============= ANALYTICS HELPERS =============
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
function addDays(ts, n){ const d=new Date(ts); d.setDate(d.getDate()+n); return d.getTime(); }

function getPeriodBounds(kind='week'){
  const now = new Date();
  if (kind === 'week') {
    const to = now.getTime();
    const from = addDays(startOfDay(now), -6); // incl. vandaag → 7 dagen
    return { from, to };
  }
  if (kind === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    const from = new Date(y, m, 1).getTime();
    const to = now.getTime();
    return { from, to };
  }
  return { from:0, to: Date.now() };
}

function filterByPeriod(entries, from, to){
  return entries.filter(e => e.timestamp >= from && e.timestamp <= to);
}

function groupUsageByProduct(entries){
  const map = {};
  entries.forEach(e=>{
    const used = e.quantity < 0 ? -e.quantity : 0;
    if (!used) return;
    map[e.product] = (map[e.product] || 0) + used;
  });
  return map;
}

function groupUsageByUser(entries){
  const map = {};
  entries.forEach(e=>{
    const used = e.quantity < 0 ? -e.quantity : 0;
    if (!used) return;
    map[e.user] = (map[e.user] || 0) + used;
  });
  return map;
}

function dailyTimeline(entries){
  const map = {};
  entries.forEach(e=>{
    const used = e.quantity < 0 ? -e.quantity : 0;
    if (!used) return;
    const day = startOfDay(e.timestamp);
    map[day] = (map[day] || 0) + used;
  });
  return map;
}

function toArraySorted(obj, labelMapper=(k)=>k){
  return Object.keys(obj)
    .map(k=>({ key:k, label: labelMapper(k), value: obj[k] }))
    .sort((a,b)=>b.value - a.value);
}

function computeDelta(currMap, prevMap){
  const keys = new Set([...Object.keys(currMap||{}), ...Object.keys(prevMap||{})]);
  const arr = [];
  keys.forEach(k=>{
    const curr = currMap[k] || 0;
    const prev = prevMap[k] || 0;
    const delta = curr - prev;
    const deltaPct = prev === 0 ? (curr>0 ? 1 : 0) : (delta / prev);
    arr.push({ key:k, value:curr, prev, delta, deltaPct });
  });
  arr.sort((a,b)=>Math.abs(b.delta) - Math.abs(a.delta));
  return arr;
}

function detectSpikes(dayMap){
  const days = Object.keys(dayMap).map(Number).sort((a,b)=>a-b);
  const vals = days.map(d=>dayMap[d]);
  if (vals.length < 3) return [];
  const avg = vals.reduce((s,v)=>s+v,0)/vals.length;
  const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-avg)*(v-avg),0)/vals.length);
  const threshold = avg + 2*sd;
  return days
    .filter(d => dayMap[d] > threshold)
    .map(d => ({ day:d, value: dayMap[d], avg, sd, threshold }));
}

// ============= RUN ANALYTICS =============
function runAnalytics(period='week'){
  const {from, to} = getPeriodBounds(period);
  const cur = filterByPeriod(logbook, from, to);

  const spanDays = period==='week' ? 7 : 30;
  const prevFrom = addDays(from, -spanDays);
  const prevTo   = addDays(to,   -spanDays);
  const prev = filterByPeriod(logbook, prevFrom, prevTo);

  const curByProduct = groupUsageByProduct(cur);
  const prevByProduct = groupUsageByProduct(prev);
  const curByUser = groupUsageByUser(cur);

  const deltas = computeDelta(curByProduct, prevByProduct);
  const timeline = dailyTimeline(cur);
  const spikes = detectSpikes(timeline);

  const labelByBarcode = (bc)=> (stock[bc]?.name || bc);

  return {
    period: {from, to, prevFrom, prevTo},
    perProduct: toArraySorted(curByProduct, labelByBarcode),
    perUser: toArraySorted(curByUser, k=>k),
    deltas: deltas.map(d=>({
      ...d,
      label: labelByBarcode(d.key)
    })),
    spikes
  };
}

// ============= TEXT SUMMARY (voor in e-mail) =============
function buildSummaryText(ana){
  const fmtDate = ts => new Date(ts).toLocaleDateString();
  const topUp = ana.deltas.filter(d=>d.delta>0).slice(0,3);
  const topDown = ana.deltas.filter(d=>d.delta<0).slice(0,3);

  const upLines = topUp.map(d=>`↑ ${d.label}: +${d.delta} t.o.v. vorige periode`);
  const downLines = topDown.map(d=>`↓ ${d.label}: ${d.delta} t.o.v. vorige periode`);

  const spikeLines = ana.spikes.map(s=>`⚠ ${fmtDate(s.day)}: ${s.value} (gem ${s.avg.toFixed(1)} | drempel ${s.threshold.toFixed(1)})`);

  return [
    `Periode: ${fmtDate(ana.period.from)} – ${fmtDate(ana.period.to)}`,
    '',
    'Top stijgers:',
    ...(upLines.length? upLines : ['—']),
    '',
    'Top dalers:',
    ...(downLines.length? downLines : ['—']),
    '',
    'Spikes (opvallende pieken per dag):',
    ...(spikeLines.length? spikeLines : ['—'])
  ].join('\n');
}

// ============= EXCEL EXPORT (meerdere tabs) =============
function downloadAnalyticsExcel(period='week'){
  const ana = runAnalytics(period);

  const summaryText = buildSummaryText(ana);
  const summaryRows = summaryText.split('\n').map(line=>[line]);

  const ppHeaders = ['Barcode','Naam','Verbruik'];
  const ppRows = ana.perProduct.map(r=>[r.key, r.label, r.value]);

  const puHeaders = ['Medewerker','Verbruik'];
  const puRows = ana.perUser.map(r=>[r.label, r.value]);

  const dHeaders = ['Barcode','Naam','Huidig','Vorige','Delta','Delta %'];
  const dRows = ana.deltas.map(d=>[
    d.key, d.label, d.value, d.prev, d.delta, (d.deltaPct*100).toFixed(1)+'%'
  ]);

  const tlHeaders = ['Datum','Totaal verbruik'];
  const tlMap = dailyTimeline(filterByPeriod(logbook, ana.period.from, ana.period.to));
  const tlRows = Object.keys(tlMap).sort().map(dayTs=>[
    new Date(Number(dayTs)).toLocaleDateString(),
    tlMap[dayTs]
  ]);

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  const ws2 = XLSX.utils.aoa_to_sheet([ppHeaders, ...ppRows]);
  const ws3 = XLSX.utils.aoa_to_sheet([puHeaders, ...puRows]);
  const ws4 = XLSX.utils.aoa_to_sheet([dHeaders, ...dRows]);
  const ws5 = XLSX.utils.aoa_to_sheet([tlHeaders, ...tlRows]);

  XLSX.utils.book_append_sheet(wb, ws1, 'Samenvatting');
  XLSX.utils.book_append_sheet(wb, ws2, 'PerProduct');
  XLSX.utils.book_append_sheet(wb, ws3, 'PerUser');
  XLSX.utils.book_append_sheet(wb, ws4, 'Deltas');
  XLSX.utils.book_append_sheet(wb, ws5, 'Timeline');

  const filename = `rapport_${period}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ============= FAKE DATA SEEDER (voor testen) =============
(function(){
  let __seed = 42;
  function rnd(){ __seed = (__seed*9301 + 49297) % 233280; return __seed / 233280; }
  function randi(a,b){ return Math.floor(rnd()*(b-a+1))+a; }
  function choice(arr){ return arr[randi(0,arr.length-1)]; }
  function startOfDayLocal(ts){ const d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }

  const DEFAULT_USERS = { '1234':'Nat','5678':'Alex','4444':'Edu','9999':'Iri' };

  const PRODUCT_CATALOG = [
    { code:'+ADT10131255', name:'zak', qty:120 },
    { code:'+ADT20021111', name:'klem A', qty:60 },
    { code:'+ADT3003BLUE', name:'spuitje blauw', qty:180 },
    { code:'IMPL-3.5x11', name:'implantaat 3.5x11', qty:15 },
    { code:'IMPL-4.0x10', name:'implantaat 4.0x10', qty:12 },
    { code:'COMP-A2',      name:'composiet A2', qty:90 },
    { code:'COMP-A3',      name:'composiet A3', qty:100 },
    { code:'ETCH-37',      name:'etsgel 37%', qty:45 },
    { code:'BOND-Opti',    name:'bonding', qty:55 },
    { code:'ANES-Art',     name:'verdoving articaine', qty:80 },
    { code:'ANES-Lido',    name:'verdoving lidocaïne', qty:70 },
    { code:'GLASSION',     name:'glasionomeer', qty:30 },
    { code:'NAALD-30G',    name:'naald 30G', qty:200 },
    { code:'RUB-DAM',      name:'rubberdam', qty:40 },
  ];

  const USERS = ['Nat','Alex','Edu','Iri'];
  const KAB = ['Kabinet 1','Kabinet 2','Kabinet 3','Kabinet 4','Kabinet 5','Kabinet 6'];

  function seedFakeData(opts={}){
    const {
      clearExisting = true,
      days = 45,
      spikeDays = 2
    } = opts;

    if (clearExisting) {
      localStorage.removeItem('stock');
      localStorage.removeItem('logbook');
      localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
    } else {
      if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
      }
    }

    const stockLocal = {};
    PRODUCT_CATALOG.forEach(p => stockLocal[p.code] = { name: p.name, quantity: p.qty });
    const logLocal = [];
    const now = Date.now();

    function addLog(user, barcode, qty, ts, ctx){
      logLocal.push({ user, product: barcode, quantity: qty, timestamp: ts, context: ctx });
      stockLocal[barcode].quantity += qty;
    }

    const dayOffsets = Array.from({length: days}, (_,i)=>i);
    const spikeOffsets = new Set();
    while (spikeOffsets.size < Math.min(spikeDays, days)) {
      spikeOffsets.add(randi(0, days-1));
    }

    for (let d = days-1; d >= 0; d--) {
      const dayStart = startOfDayLocal(now - d*24*3600*1000);
      const eventsToday = spikeOffsets.has(d) ? randi(14,22) : randi(5,12);

      for (let e = 0; e < eventsToday; e++) {
        const prod = choice(PRODUCT_CATALOG);
        const bc = prod.code;
        const user = choice(USERS);
        const ctxUse = choice(KAB);
        const ts = dayStart + randi(8*3600*1000, 17*3600*1000);

        if (rnd() < 0.8) {
          const useQty = randi(1,3);
          const available = stockLocal[bc].quantity;
          if (available < useQty) {
            const restockQty = randi(10,30);
            addLog(choice(['Nat','Edu']), bc, +restockQty, ts - 10*60*1000, 'Voorraadbeheer');
          }
          addLog(user, bc, -useQty, ts, ctxUse);
        } else {
          const refill = randi(5,25);
          addLog(choice(['Nat','Edu']), bc, +refill, ts, 'Voorraadbeheer');
        }
      }
    }

    const lowTargets = choice(PRODUCT_CATALOG.slice(0,6));
    stockLocal[lowTargets.code].quantity = randi(2,5);
    const lowTargets2 = choice(PRODUCT_CATALOG.slice(6,12));
    stockLocal[lowTargets2.code].quantity = randi(1,4);

    localStorage.setItem('stock', JSON.stringify(stockLocal));
    localStorage.setItem('logbook', JSON.stringify(logLocal));

    const totalEntries = logLocal.length;
    const usedTotal = logLocal.filter(x=>x.quantity<0).reduce((s,x)=>s+(-x.quantity),0);
    const addedTotal = logLocal.filter(x=>x.quantity>0).reduce((s,x)=>s+(x.quantity),0);

    console.log('%cFake data klaar ✅', 'color: #0a8754; font-weight:bold;');
    console.table(PRODUCT_CATALOG.map(p=>({barcode:p.code, name:p.name, eindVoorraad: stockLocal[p.code].quantity})));
    console.log(`Entries: ${totalEntries} | Verbruikt: ${usedTotal} | Aangevuld: ${addedTotal}`);
    console.log('Tip: refresh de app om de UI te updaten.');
  }

  window.seedFakeData = seedFakeData;
})();
