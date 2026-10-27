"use strict";

const SEED_ADVANCES = [
  { id: 1048, technician: "Carlos Mendoza", truck: "TQX-482", amount: 2400000, date: "2026-10-02", status: "Abierto" },
  { id: 1047, technician: "Carlos Mendoza", truck: "JRM-291", amount: 1850000, date: "2026-09-28", status: "Abierto" },
  { id: 1046, technician: "Laura Peña", truck: "VSC-807", amount: 980000, date: "2026-09-14", status: "Legalizado" },
];

const SEED_EXPENSES = [
  { id: 2088, advanceId: 1048, truck: "TQX-482", category: "Repuestos", supplier: "AutoPartes Central", amount: 680000, date: "2026-10-04", status: "Pendiente", support: "factura_2088.pdf" },
  { id: 2087, advanceId: 1048, truck: "TQX-482", category: "Mano de obra", supplier: "Taller El Norte", amount: 420000, date: "2026-10-03", status: "Aprobado", support: "recibo_taller.jpg", reviewer: "María Gómez", reviewedAt: "2026-10-04" },
  { id: 2086, advanceId: 1047, truck: "JRM-291", category: "Llantas", supplier: "Ruedas SAS", amount: 1210000, date: "2026-10-01", status: "Pendiente", support: "factura_2086.pdf" },
  { id: 2085, advanceId: 1047, truck: "JRM-291", category: "Lubricantes", supplier: "LubriExpress", amount: 185000, date: "2026-09-30", status: "Rechazado", support: "soporte_2085.jpg", reviewer: "María Gómez", reviewedAt: "2026-10-01", reason: "El valor no coincide con el soporte." },
];

const DEMO_USERS = [
  { username: "gerencia", password: "Sigma2026", name: "María Gómez", role: "Gerencia", initials: "MG" },
  { username: "administrativa", password: "Sigma2026", name: "Daniela Ruiz", role: "Administrativa", initials: "DR" },
  { username: "tecnico", password: "Sigma2026", name: "Carlos Mendoza", role: "Técnico", initials: "CM" },
];

const state = {
  view: "Resumen",
  user: DEMO_USERS.find((item) => item.username === localStorage.getItem("sigma-pure-session")) || null,
  role: "Técnico",
  expenseFilter: "Todos",
  advances: readStorage("sigma-pure-advances", SEED_ADVANCES),
  expenses: readStorage("sigma-pure-expenses", SEED_EXPENSES),
};

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const content = document.querySelector("#app-content");
const modalRoot = document.querySelector("#modal-root");
document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function save() {
  localStorage.setItem("sigma-pure-advances", JSON.stringify(state.advances));
  localStorage.setItem("sigma-pure-expenses", JSON.stringify(state.expenses));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function daysOpen(value) {
  return Math.max(1, Math.floor((new Date("2026-10-10") - new Date(value)) / 86400000));
}

function status(value) {
  return `<span class="status ${value.toLowerCase()}">${value}</span>`;
}

function icon(name) {
  const paths = {
    Resumen: '<path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z"/>',
    Anticipos: '<path d="M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    Gastos: '<path d="M3 6h18M5 6v14h14V6M8 10h8M8 14h5"/>',
    Reportes: '<path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function renderNav() {
  const pending = state.expenses.filter((item) => item.status === "Pendiente").length;
  document.querySelector("#main-nav").innerHTML = ["Resumen", "Anticipos", "Gastos", "Reportes"].map((item) => `
    <button type="button" class="${state.view === item ? "active" : ""}" data-view="${item}">
      ${icon(item)}<span>${item}</span>${item === "Gastos" && pending ? `<b>${pending}</b>` : ""}
    </button>`).join("");
  document.querySelector("#page-title").textContent = state.view;
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    render();
  }));
}

function render() {
  if (!state.user) return showLogin();
  state.role = state.user.role;
  document.querySelector("#login-screen").classList.add("hidden");
  document.querySelector("#application").classList.remove("hidden");
  renderNav();
  document.querySelector("#role-label").textContent = state.role;
  document.querySelector("#user-name").textContent = state.user.name;
  document.querySelector("#user-avatar").textContent = state.user.initials;
  if (state.view === "Resumen") renderDashboard();
  if (state.view === "Anticipos") renderAdvances();
  if (state.view === "Gastos") renderExpenses();
  if (state.view === "Reportes") renderReports();
  bindCommonActions();
}

function totals() {
  const approved = state.expenses.filter((item) => item.status === "Aprobado");
  const openAdvances = state.advances.filter((item) => item.status === "Abierto");
  return {
    approved,
    openAdvances,
    balance: 12500000 - approved.reduce((sum, item) => sum + item.amount, 0) - openAdvances.reduce((sum, item) => sum + item.amount, 0),
    monthSpend: approved.filter((item) => item.date.startsWith("2026-10")).reduce((sum, item) => sum + item.amount, 0),
  };
}

function renderDashboard() {
  const { approved, openAdvances, balance, monthSpend } = totals();
  const pending = state.expenses.filter((item) => item.status === "Pendiente");
  content.innerHTML = `
    <section class="welcome">
      <div><span class="eyebrow">Control financiero de flota</span><h2>Todo bajo control, ${state.user.name.split(" ")[0]}.</h2><p>Este es el estado actual de los recursos de mantenimiento.</p></div>
      <div class="quick-actions">
        ${state.role !== "Gerencia" ? '<button class="secondary" data-action="new-expense">+ Registrar gasto</button>' : ""}
        ${state.role !== "Técnico" ? '<button class="primary" data-action="new-advance">+ Nuevo anticipo</button>' : ""}
      </div>
    </section>
    ${balance < 0 ? '<div class="alert"><strong>Saldo de caja negativo</strong><span>Revisa los anticipos abiertos antes de asignar nuevos recursos.</span></div>' : ""}
    <section class="metric-grid">
      <article class="metric featured"><span>Saldo disponible en caja</span><strong>${money.format(balance)}</strong><small>Actualizado con gastos aprobados</small></article>
      <article class="metric"><span>Gasto aprobado este mes</span><strong>${money.format(monthSpend)}</strong><small>Octubre de 2026</small></article>
      <article class="metric"><span>Anticipos abiertos</span><strong>${openAdvances.length}</strong><small>${money.format(openAdvances.reduce((sum, item) => sum + item.amount, 0))} asignados</small></article>
      <article class="metric"><span>Pendientes por revisar</span><strong>${pending.length}</strong><small>Requieren decisión de gerencia</small></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel">
        <div class="panel-heading"><div><h3>Anticipos abiertos</h3><p>Seguimiento a legalizaciones pendientes</p></div><button class="text-button" data-go="Anticipos">Ver todos</button></div>
        <div>${openAdvances.map((item) => `<div class="advance-item"><div class="truck-icon">${item.truck.slice(0, 2)}</div><div><strong>${item.truck}</strong><span>${item.technician} · Anticipo #${item.id}</span></div><div class="amount"><strong>${money.format(item.amount)}</strong><span class="${daysOpen(item.date) > 7 ? "late" : ""}">${daysOpen(item.date)} días abierto</span></div></div>`).join("")}</div>
      </article>
      <article class="panel">
        <div class="panel-heading"><div><h3>Gastos por aprobar</h3><p>Soportes listos para revisión</p></div><button class="text-button" data-go="Gastos">Ver todos</button></div>
        <div>${pending.map((item) => `<button class="expense-item" data-review="${item.id}"><div><strong>${item.supplier}</strong><span>${item.truck} · ${item.category}</span></div><div class="amount"><strong>${money.format(item.amount)}</strong><span>${formatDate(item.date)}</span></div></button>`).join("")}</div>
      </article>
    </section>`;
}

function renderAdvances() {
  content.innerHTML = `
    <div class="page-lead"><div><h2>Anticipos de efectivo</h2><p>Consulta los recursos entregados y su proceso de legalización.</p></div>${state.role !== "Técnico" ? '<button class="primary" data-action="new-advance">+ Nuevo anticipo</button>' : ""}</div>
    <div class="table-card"><table><thead><tr><th>Anticipo</th><th>Responsable</th><th>Vehículo</th><th>Fecha</th><th>Valor</th><th>Disponible</th><th>Estado</th></tr></thead>
    <tbody>${state.advances.map((item) => {
      const used = state.expenses.filter((expense) => expense.advanceId === item.id && expense.status !== "Rechazado").reduce((sum, expense) => sum + expense.amount, 0);
      return `<tr><td><strong>#${item.id}</strong><small>${daysOpen(item.date)} días transcurridos</small></td><td>${item.technician}</td><td><span class="plate">${item.truck}</span></td><td>${formatDate(item.date)}</td><td>${money.format(item.amount)}</td><td><strong>${money.format(item.amount - used)}</strong></td><td>${status(item.status)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}

function renderExpenses() {
  const visible = state.role === "Técnico" ? state.expenses.filter((item) => [1048, 1047].includes(item.advanceId)) : state.expenses;
  const filtered = state.expenseFilter === "Todos" ? visible : visible.filter((item) => item.status === state.expenseFilter);
  content.innerHTML = `
    <div class="page-lead"><div><h2>Gastos de mantenimiento</h2><p>Revisa soportes y conserva la trazabilidad de cada decisión.</p></div>${state.role !== "Gerencia" ? '<button class="primary" data-action="new-expense">+ Registrar gasto</button>' : ""}</div>
    <div class="filter-bar">${["Todos", "Pendiente", "Aprobado", "Rechazado"].map((item) => `<button class="${state.expenseFilter === item ? "active" : ""}" data-filter="${item}">${item}</button>`).join("")}</div>
    <div class="table-card"><table><thead><tr><th>Gasto</th><th>Vehículo</th><th>Proveedor / Categoría</th><th>Valor</th><th>Soporte</th><th>Estado</th><th></th></tr></thead>
    <tbody>${filtered.map((item) => `<tr><td><strong>#${item.id}</strong><small>${formatDate(item.date)}</small></td><td><span class="plate">${item.truck}</span></td><td><strong>${item.supplier}</strong><small>${item.category}</small></td><td><strong>${money.format(item.amount)}</strong></td><td><span class="document">${item.support}</span></td><td>${status(item.status)}${item.reviewer ? `<small>por ${item.reviewer}</small>` : ""}</td><td>${item.status === "Pendiente" && state.role === "Gerencia" ? `<button class="review-button" data-review="${item.id}">Revisar</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderReports() {
  const approved = state.expenses.filter((item) => item.status === "Aprobado");
  const trucks = ["TQX-482", "JRM-291", "VSC-807"].map((truck) => ({ truck, total: approved.filter((item) => item.truck === truck).reduce((sum, item) => sum + item.amount, 0) }));
  const max = Math.max(...trucks.map((item) => item.total), 1);
  content.innerHTML = `
    <div class="page-lead"><div><h2>Reportes</h2><p>Los resultados incluyen únicamente gastos aprobados.</p></div><span class="period">Octubre 2026</span></div>
    <section class="report-grid">
      <article class="panel report-total"><span>Gasto aprobado del mes</span><strong>${money.format(approved.filter((item) => item.date.startsWith("2026-10")).reduce((sum, item) => sum + item.amount, 0))}</strong><p>${approved.length} movimientos aprobados registrados</p></article>
      <article class="panel"><div class="panel-heading"><div><h3>Gasto por camión</h3><p>Distribución de recursos aprobados</p></div></div>
      <div class="bars">${trucks.map((item) => `<div><div><strong>${item.truck}</strong><span>${money.format(item.total)}</span></div><i><b style="width:${item.total / max * 100}%"></b></i></div>`).join("")}</div></article>
    </section>`;
}

function bindCommonActions() {
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { state.view = button.dataset.go; render(); }));
  document.querySelectorAll("[data-action='new-expense']").forEach((button) => button.addEventListener("click", openExpenseModal));
  document.querySelectorAll("[data-action='new-advance']").forEach((button) => button.addEventListener("click", openAdvanceModal));
  document.querySelectorAll("[data-review]").forEach((button) => button.addEventListener("click", () => {
    if (state.role === "Gerencia") openReviewModal(Number(button.dataset.review));
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    state.expenseFilter = button.dataset.filter;
    renderExpenses();
    bindCommonActions();
  }));
}

function modal(title, subtitle, body) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal"><div class="modal-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-close aria-label="Cerrar">×</button></div>${body}</section></div>`;
  modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeModal();
  });
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function openAdvanceModal() {
  modal("Crear anticipo", "Asigna efectivo para el mantenimiento de un vehículo.", `
    <form id="advance-form">
      <label>Técnico responsable<select name="technician"><option>Carlos Mendoza</option><option>Laura Peña</option></select></label>
      <div class="field-row"><label>Camión<select name="truck"><option>TQX-482</option><option>JRM-291</option><option>VSC-807</option></select></label><label>Valor del anticipo<input name="amount" type="number" min="1" required placeholder="0"></label></div>
      <div class="form-actions"><button type="button" class="secondary" data-close-form>Cancelar</button><button class="primary">Crear anticipo</button></div>
    </form>`);
  modalRoot.querySelector("[data-close-form]").addEventListener("click", closeModal);
  modalRoot.querySelector("#advance-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.advances.unshift({ id: Math.max(...state.advances.map((item) => item.id)) + 1, technician: data.get("technician"), truck: data.get("truck"), amount: Number(data.get("amount")), date: "2026-10-10", status: "Abierto" });
    save(); closeModal(); state.view = "Anticipos"; render(); toast("Anticipo creado correctamente");
  });
}

function openExpenseModal() {
  modal("Registrar nuevo gasto", "El gasto quedará pendiente de aprobación.", `
    <form id="expense-form">
      <label>Anticipo asociado<select name="advance" required>${state.advances.filter((item) => item.status === "Abierto").map((item) => `<option value="${item.id}">#${item.id} · ${item.truck} · ${money.format(item.amount)}</option>`).join("")}</select></label>
      <div class="field-row"><label>Categoría<select name="category"><option>Repuestos</option><option>Mano de obra</option><option>Llantas</option><option>Lubricantes</option><option>Otros</option></select></label><label>Valor del gasto<input name="amount" type="number" min="1" required placeholder="0"></label></div>
      <label>Proveedor<input name="supplier" required placeholder="Nombre del proveedor"></label>
      <label>Soporte (foto o PDF)<input name="support" type="file" accept="image/*,.pdf" required></label>
      <div class="form-actions"><button type="button" class="secondary" data-close-form>Cancelar</button><button class="primary">Registrar gasto</button></div>
    </form>`);
  modalRoot.querySelector("[data-close-form]").addEventListener("click", closeModal);
  modalRoot.querySelector("#expense-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const advanceId = Number(data.get("advance"));
    const advance = state.advances.find((item) => item.id === advanceId);
    const amount = Number(data.get("amount"));
    const spent = state.expenses.filter((item) => item.advanceId === advanceId && item.status !== "Rechazado").reduce((sum, item) => sum + item.amount, 0);
    if (amount > advance.amount - spent) return toast("El gasto supera el saldo disponible del anticipo");
    const file = event.currentTarget.elements.support.files[0];
    state.expenses.unshift({ id: Math.max(...state.expenses.map((item) => item.id)) + 1, advanceId, truck: advance.truck, category: data.get("category"), supplier: data.get("supplier"), amount, date: "2026-10-10", status: "Pendiente", support: file.name });
    save(); closeModal(); state.view = "Gastos"; render(); toast("Gasto registrado y enviado a revisión");
  });
}

function openReviewModal(id) {
  const expense = state.expenses.find((item) => item.id === id);
  modal(`Revisar gasto #${expense.id}`, `${expense.truck} · Anticipo #${expense.advanceId}`, `
    <div class="review-summary"><div><span>Proveedor</span><strong>${expense.supplier}</strong></div><div><span>Categoría</span><strong>${expense.category}</strong></div><div><span>Valor</span><strong>${money.format(expense.amount)}</strong></div><div><span>Soporte</span><strong>${expense.support}</strong></div></div>
    <label>Motivo de rechazo<textarea id="rejection-reason" placeholder="Obligatorio únicamente si rechazas el gasto"></textarea></label>
    <div class="form-actions split"><button class="danger" id="reject-expense">Rechazar gasto</button><button class="primary" id="approve-expense">Aprobar gasto</button></div>`);
  modalRoot.querySelector("#approve-expense").addEventListener("click", () => decideExpense(id, "Aprobado"));
  modalRoot.querySelector("#reject-expense").addEventListener("click", () => {
    const reason = modalRoot.querySelector("#rejection-reason").value.trim();
    if (!reason) return toast("Indica el motivo del rechazo");
    decideExpense(id, "Rechazado", reason);
  });
}

function decideExpense(id, decision, reason = "") {
  state.expenses = state.expenses.map((item) => item.id === id ? { ...item, status: decision, reviewer: state.user.name, reviewedAt: "2026-10-10", reason } : item);
  save(); closeModal(); render(); toast(`Gasto ${decision.toLowerCase()} correctamente`);
}

let toastTimer;
function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 2800);
}

function showLogin() {
  document.querySelector("#application").classList.add("hidden");
  document.querySelector("#login-screen").classList.remove("hidden");
}

function login(user) {
  state.user = user;
  state.role = user.role;
  localStorage.setItem("sigma-pure-session", user.username);
  document.querySelector("#login-error").textContent = "";
  render();
}

document.querySelector("#demo-users").innerHTML = `<strong>Usuarios de demostración</strong>${DEMO_USERS.map((user) => `<button type="button" data-login="${user.username}"><span>${user.name}<small>${user.role}</small></span><code>${user.username}</code></button>`).join("")}<p>Contraseña para todos: <b>Sigma2026</b></p>`;
document.querySelectorAll("[data-login]").forEach((button) => button.addEventListener("click", () => login(DEMO_USERS.find((user) => user.username === button.dataset.login))));
document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const user = DEMO_USERS.find((item) => item.username === data.get("username") && item.password === data.get("password"));
  if (!user) return document.querySelector("#login-error").textContent = "Usuario o contraseña incorrectos.";
  login(user);
});
document.querySelector("#logout").addEventListener("click", () => {
  state.user = null;
  localStorage.removeItem("sigma-pure-session");
  showLogin();
});

document.querySelector("#reset-data").addEventListener("click", () => {
  state.advances = structuredClone(SEED_ADVANCES);
  state.expenses = structuredClone(SEED_EXPENSES);
  save();
  render();
  toast("Datos de demostración restaurados");
});

render();
