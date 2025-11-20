// ================== BASIS CONFIG ==================

const userCodes = {
  '1234': 'Nat',
  '5678': 'Alex',
  '4444': 'Edu',
  '9999': 'Iri'
};

const stockManagementPassword = '1111';

// ================== STATE ==================

let loggedInUser = null;              // naam (Nat, Alex, Edu, Iri)
let selectedContext = null;           // Kabinet 1, 2, ...
let stock = JSON.parse(localStorage.getItem('stock')) || {};     // { barcode: { name, quantity } }
let logbook = JSON.parse(localStorage.getItem('logbook')) || []; // [{ user, product, quantity, timestamp, context }]

// ================== STORAGE HELPERS ==================

function saveStock() {
  localStorage.setItem('stock', JSON.stringify(stock));
}
function saveLogbook() {
  localStorage.setItem('logbook', JSON.stringify(logbook));
}
function saveUser(user) {
  localStorage.setItem('loggedInUser', user);
}
function loadUser() {
  return localStorage.getItem('loggedInUser');
}

// ================== RENDER FUNCTIES ==================

function renderProductList() {
  const datalist = document.getElementById('productList');
  if (!datalist) return;
  datalist.innerHTML = '';

  Object.values(stock)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .forEach(item => {
      const option = document.createElement('option');
      option.value = item.name; // alleen naam tonen
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
    td.colSpan = 5;
    td.style.textAlign = 'center';
    td.textContent = 'Logboek is leeg.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
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
  if (loggedInUser) {
    userInfo.textContent = `👤 Ingelogd als: ${loggedInUser}`;
  } else {
    userInfo.textContent = '';
  }
}

// ================== HELPERS ==================

function findBarcodeByName(name) {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase();
  return Object.keys(stock).find(
    key => (stock[key].name || '').trim().toLowerCase() === cleaned
  );
}

function hasValidPositiveQty() {
  const el = document.getElementById('quantity');
  const n = Number((el?.value || '').trim());
  return Number.isFinite(n) && n > 0;
}

function normalizeProductFieldToName(inputEl) {
  if (!inputEl) return;
  const raw = (inputEl.value || '').trim();
  if (!raw) return;

  if (stock.hasOwnProperty(raw)) {
    inputEl.value = stock[raw].name;
    return;
  }

  const bc = findBarcodeByName(raw);
  if (bc) {
    inputEl.value = stock[bc].name;
  }
}

function clearInputFields() {
  const bc = document.getElementById('barcode');
  const qty = document.getElementById('quantity');
  if (bc) bc.value = '';
  if (qty) qty.value = '';

  // kabinet resetten (zelfde gedrag als je oude code)
  document.querySelectorAll('.context-button').forEach(b => b.classList.remove('selected'));
  selectedContext = null;

  clearMessages();
}

function clearMessages() {
  const ids = ['appMessage', 'loginWarning', 'addStockWarning', 'newProductWarning'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function clearStockAddInputs() {
  const sel = document.getElementById('selectProductStock');
  const qty = document.getElementById('quantityStock');
  if (sel) sel.value = '';
  if (qty) qty.value = '';
}

function clearNewProductInputs() {
  ['newCode', 'newName', 'newQty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ================== CORE FLOWS ==================

function registerAction() {
  const inputEl = document.getElementById('barcode');
  const qtyEl = document.getElementById('quantity');
  const message = document.getElementById('appMessage');
  if (!inputEl || !qtyEl || !message) return;

  clearMessages();

  const input = inputEl.value.trim();
  let barcodeValue = null;

  // scanner → barcode
  if (stock.hasOwnProperty(input)) {
    barcodeValue = input;
    inputEl.value = stock[input].name; // toon naam
  } else {
    // manueel → naam
    barcodeValue = findBarcodeByName(input);
  }

  const quantityValue = qtyEl.value.trim();

  if (!barcodeValue || !stock[barcodeValue]) {
    message.textContent = 'Product niet gevonden.';
    message.className = 'error';
    return;
  }

  if (!quantityValue || isNaN(quantityValue) || Number(quantityValue) <= 0) {
    message.textContent = 'Vul een geldig positief aantal in.';
    message.className = 'error';
    return;
  }

  if (!selectedContext) {
    message.textContent = 'Selecteer een kabinet.';
    message.className = 'error';
    return;
  }

  const delta = -Math.abs(Number(quantityValue));
  if (stock[barcodeValue].quantity + delta < 0) {
    message.textContent = `Niet genoeg voorraad. (${stock[barcodeValue].quantity} beschikbaar)`;
    message.className = 'error';
    return;
  }

  stock[barcodeValue].quantity += delta;
  saveStock();

  logbook.push({
    user: loggedInUser,
    product: barcodeValue,
    quantity: delta,
    timestamp: Date.now(),
    context: selectedContext
  });
  saveLogbook();

  const displayName = stock[barcodeValue].name || barcodeValue;
  message.textContent = `Gebruik van ${displayName} geregistreerd: ${-delta} stuks.`;
  message.className = 'success';

  renderLowStockList();
  renderUsageLog();
  renderFullLog();

  clearInputFields();
  inputEl.focus();
}

function openStockManagement() {
  const pwd = prompt('Wachtwoord voor voorraadbeheer:');
  if (pwd !== stockManagementPassword) {
    alert('Onjuist wachtwoord!');
    return;
  }

  document.getElementById('appSection')?.classList.add('hidden');
  document.getElementById('stockManagementSection')?.classList.remove('hidden');

  renderStockList();
  renderFullLog();
  clearInputFields();
  clearMessages();
}

function backToApp() {
  document.getElementById('stockManagementSection')?.classList.add('hidden');
  document.getElementById('appSection')?.classList.remove('hidden');

  renderLowStockList();
  renderUsageLog();
  clearInputFields();
  clearMessages();
}

function addToStock() {
  const inputEl = document.getElementById('selectProductStock');
  const qtyEl = document.getElementById('quantityStock');
  const warning = document.getElementById('addStockWarning');
  if (!inputEl || !qtyEl || !warning) return;

  warning.textContent = '';

  const raw = inputEl.value.trim();
  let barcode = null;

  if (stock.hasOwnProperty(raw)) {
    barcode = raw;
  } else {
    barcode = findBarcodeByName(raw);
  }

  const qty = Number(qtyEl.value.trim());

  if (!barcode || !stock[barcode] || isNaN(qty) || qty <= 0) {
    warning.textContent = 'Ongeldige invoer of product bestaat niet.';
    return;
  }

  stock[barcode].quantity += qty;
  saveStock();

  logbook.push({
    user: loggedInUser,
    product: barcode,
    quantity: qty,
    timestamp: Date.now(),
    context: 'Voorraadbeheer'
  });
  saveLogbook();

  // toon naam in veld
  inputEl.value = stock[barcode].name || barcode;

  renderStockList();
  renderLowStockList();
  renderUsageLog();
  renderFullLog();

  warning.textContent = `Voorraad van ${stock[barcode].name || barcode} aangevuld met ${qty}.`;
  clearStockAddInputs();
  inputEl.focus();
}

function addNewProduct() {
  const codeEl = document.getElementById('newCode');
  const nameEl = document.getElementById('newName');
  const qtyEl = document.getElementById('newQty');
  const warning = document.getElementById('newProductWarning');
  if (!codeEl || !nameEl || !qtyEl || !warning) return;

  warning.textContent = '';

  const code = codeEl.value.trim();
  const name = nameEl.value.trim();
  const qty = Number(qtyEl.value.trim());

  const nameExists = Object.values(stock).some(
    p => (p.name || '').trim().toLowerCase() === name.toLowerCase()
  );

  if (!code || !name || isNaN(qty) || qty < 0 || stock.hasOwnProperty(code) || nameExists) {
    warning.textContent = 'Ongeldige invoer, product bestaat al (code of naam).';
    return;
  }

  stock[code] = { name, quantity: qty };
  saveStock();

  logbook.push({
    user: loggedInUser,
    product: code,
    quantity: qty,
    timestamp: Date.now(),
    context: 'Nieuw product'
  });
  saveLogbook();

  renderStockList();
  renderLowStockList();
  renderUsageLog();
  renderFullLog();
  renderProductList();

  warning.textContent = `Nieuw product "${name}" toegevoegd met voorraad ${qty}.`;
  clearNewProductInputs();
}

// ================== INIT ==================

window.onload = function () {
  // Auto-login als er iemand in localStorage zit
  const savedUser = loadUser();
  if (savedUser && Object.values(userCodes).includes(savedUser)) {
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
    document.getElementById('barcode')?.focus();
  }

  // Kabinet knoppen
  document.querySelectorAll('.context-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.context-button').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
      selectedContext = button.getAttribute('data-context');
    });
  });

  // Barcode scanner / input (auto-registreer als alles ingevuld is)
  const barcodeInput = document.getElementById('barcode');
  if (barcodeInput) {
    let barcodeTypingTimer;
    barcodeInput.addEventListener('input', function () {
      clearTimeout(barcodeTypingTimer);
      barcodeTypingTimer = setTimeout(() => {
        const value = barcodeInput.value.trim();
        if (!value) return;
        // pas alleen auto-registratie toe als aantal + kabinet al gekozen
        if (hasValidPositiveQty() && selectedContext) {
          registerAction();
        }
      }, 250);
    });
    barcodeInput.addEventListener('blur', function () {
      const value = barcodeInput.value.trim();
      if (!value) return;
      if (hasValidPositiveQty() && selectedContext) {
        registerAction();
      }
    });
  }

  // Voorraad aanvullen: alleen normaliseren naar naam (geen auto-add)
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

  // Login
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      const codeInput = document.getElementById('codeInput');
      const warning = document.getElementById('loginWarning');
      const code = codeInput.value.trim();

      if (!code) {
        warning.textContent = 'Voer je persoonlijke code in.';
        return;
      }

      const name = userCodes[code];
      if (name) {
        loggedInUser = name;
        saveUser(loggedInUser);
        warning.textContent = '';

        document.getElementById('loginSection')?.classList.add('hidden');
        document.getElementById('appSection')?.classList.remove('hidden');
        const loBtn = document.getElementById('logoutBtn');
        if (loBtn) loBtn.style.display = 'block';

        renderProductList();
        renderLowStockList();
        renderUsageLog();
        renderFullLog();
        renderUserInfo();
        document.getElementById('barcode')?.focus();
      } else {
        warning.textContent = 'Onbekende code.';
      }

      codeInput.value = '';
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
      logoutBtn.style.display = 'none';

      renderUserInfo();
      clearInputFields();
      clearMessages();
    });
  }

  // Voorraadbeheer knop (in app)
  document.getElementById('openStockBtn')?.addEventListener('click', openStockManagement);

  // Register-knop
  const registerBtn = document.getElementById('registerBtn');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerAction();
    });
  }
};

// ================== FAKE DATA SEEDER (OPTIONEEL) ==================

(function () {
  let __seed = 42;
  function rnd() { __seed = (__seed * 9301 + 49297) % 233280; return __seed / 233280; }
  function randi(a, b) { return Math.floor(rnd() * (b - a + 1)) + a; }
  function choice(arr) { return arr[randi(0, arr.length - 1)]; }
  function startOfDayLocal(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

  const PRODUCT_CATALOG = [
    { code: '+ADT10131255', name: 'zak', qty: 120 },
    { code: '+ADT20021111', name: 'klem A', qty: 60 },
    { code: '+ADT3003BLUE', name: 'spuitje blauw', qty: 180 },
    { code: 'IMPL-3.5x11', name: 'implantaat 3.5x11', qty: 15 },
    { code: 'IMPL-4.0x10', name: 'implantaat 4.0x10', qty: 12 },
    { code: 'COMP-A2', name: 'composiet A2', qty: 90 },
    { code: 'COMP-A3', name: 'composiet A3', qty: 100 },
    { code: 'ETCH-37', name: 'etsgel 37%', qty: 45 },
    { code: 'BOND-Opti', name: 'bonding', qty: 55 },
    { code: 'ANES-Art', name: 'verdoving articaine', qty: 80 },
    { code: 'ANES-Lido', name: 'verdoving lidocaïne', qty: 70 },
    { code: 'GLASSION', name: 'glasionomeer', qty: 30 },
    { code: 'NAALD-30G', name: 'naald 30G', qty: 200 },
    { code: 'RUB-DAM', name: 'rubberdam', qty: 40 }
  ];

  const USERS = ['Nat', 'Alex', 'Edu', 'Iri'];
  const KAB = ['Kabinet 1', 'Kabinet 2', 'Kabinet 3', 'Kabinet 4', 'Kabinet 5', 'Kabinet 6'];

  function seedFakeData(opts = {}) {
    const {
      clearExisting = true,
      days = 45
    } = opts;

    if (clearExisting) {
      localStorage.removeItem('stock');
      localStorage.removeItem('logbook');
    }

    const stockLocal = {};
    PRODUCT_CATALOG.forEach(p => stockLocal[p.code] = { name: p.name, quantity: p.qty });
    const logLocal = [];
    const now = Date.now();

    function addLog(user, barcode, qty, ts, ctx) {
      logLocal.push({ user, product: barcode, quantity: qty, timestamp: ts, context: ctx });
      stockLocal[barcode].quantity += qty;
    }

    for (let d = days - 1; d >= 0; d--) {
      const dayStart = startOfDayLocal(now - d * 24 * 3600 * 1000);
      const eventsToday = randi(5, 15);

      for (let e = 0; e < eventsToday; e++) {
        const prod = choice(PRODUCT_CATALOG);
        const bc = prod.code;
        const user = choice(USERS);
        const ctxUse = choice(KAB);
        const ts = dayStart + randi(8 * 3600 * 1000, 17 * 3600 * 1000);

        if (rnd() < 0.8) {
          const useQty = randi(1, 3);
          const available = stockLocal[bc].quantity;
          if (available < useQty) {
            const restockQty = randi(10, 30);
            addLog(choice(['Nat', 'Edu']), bc, +restockQty, ts - 10 * 60 * 1000, 'Voorraadbeheer');
          }
          addLog(user, bc, -useQty, ts, ctxUse);
        } else {
          const refill = randi(5, 25);
          addLog(choice(['Nat', 'Edu']), bc, +refill, ts, 'Voorraadbeheer');
        }
      }
    }

    localStorage.setItem('stock', JSON.stringify(stockLocal));
    localStorage.setItem('logbook', JSON.stringify(logLocal));

    console.log('%cFake data klaar ✅', 'color:#0a8754;font-weight:bold;');
    console.log('Tip: refresh de app om de UI te updaten.');
  }

  // Globaal beschikbaar in console
  window.seedFakeData = seedFakeData;
})();
