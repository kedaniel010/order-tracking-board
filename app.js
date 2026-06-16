const demoOrders = [
  {
    id: "o-001",
    order_date: "2026-06-09",
    customer_code: "harvey",
    customer_invoice_no: "CUS-INV-2401",
    factory_invoice_no: "FAC-INV-7712",
    fe_date: "2026-06-12",
    te_date: "2026-06-14",
    production_finish_date: "2026-06-21",
    oa_process: "Approval sent",
    production_status: "in_production",
    u9_before_shipment: "Check carton marks",
    so_no: "SO-9021",
    etd: "2026-06-25",
    eta: "2026-06-28",
    notes: "Customer wants packing photos first"
  },
  {
    id: "o-002",
    order_date: "2026-06-11",
    customer_code: "greenhome",
    customer_invoice_no: "CUS-INV-2402",
    factory_invoice_no: "FAC-INV-7719",
    fe_date: "2026-06-15",
    te_date: "",
    production_finish_date: "2026-06-24",
    oa_process: "Waiting OA confirmation",
    production_status: "pending",
    u9_before_shipment: "Confirm label file",
    so_no: "SO-9033",
    etd: "2026-06-27",
    eta: "2026-07-01",
    notes: "Need final artwork approval"
  }
];

const statusLabels = {
  pending: "Pending",
  in_production: "In Production",
  packing: "Packing",
  ready: "Ready to Ship",
  shipped: "Shipped"
};

const state = {
  supabase: null,
  mode: "demo",
  orders: [],
  selectedOrderId: null,
  session: null,
  profile: null,
  authOpen: false,
  advancedOpen: false
};

const els = {
  authPanel: document.getElementById("authPanel"),
  authBody: document.getElementById("authBody"),
  authModeBadge: document.getElementById("authModeBadge"),
  authMessage: document.getElementById("authMessage"),
  authToggleButton: document.getElementById("authToggleButton"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authCustomerCode: document.getElementById("authCustomerCode"),
  advancedToggleButton: document.getElementById("advancedToggleButton"),
  advancedBody: document.getElementById("advancedBody"),
  signInButton: document.getElementById("signInButton"),
  signUpButton: document.getElementById("signUpButton"),
  signOutButton: document.getElementById("signOutButton"),
  exportExcelButton: document.getElementById("exportExcelButton"),
  orderForm: document.getElementById("orderForm"),
  entryCard: document.getElementById("entryCard"),
  customerCode: document.getElementById("customerCode"),
  orderNotes: document.getElementById("orderNotes"),
  orderFormMessage: document.getElementById("orderFormMessage"),
  orderTableBody: document.getElementById("orderTableBody"),
  orderCards: document.getElementById("orderCards"),
  orderDetailPanel: document.getElementById("orderDetailPanel"),
  detailTitle: document.getElementById("detailTitle"),
  detailSubtitle: document.getElementById("detailSubtitle"),
  detailGrid: document.getElementById("detailGrid"),
  toast: document.getElementById("toast"),
  totalOrders: document.getElementById("totalOrders"),
  activeOrders: document.getElementById("activeOrders"),
  etaThisWeek: document.getElementById("etaThisWeek"),
  followupOrders: document.getElementById("followupOrders")
};

init();

async function init() {
  bindForm();
  bindSelection();
  bindInlineEditing();
  bindAuth();
  bindExport();
  bindNotesField();
  setupSupabase();
  await loadOrders();
  renderAll();
}

function bindForm() {
  els.customerCode.addEventListener("input", clearOrderFormMessage);

  els.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      order_date: document.getElementById("orderDate").value,
      customer_code: document.getElementById("customerCode").value.trim().toLowerCase(),
      customer_invoice_no: document.getElementById("customerInvoiceNo").value.trim(),
      factory_invoice_no: document.getElementById("factoryInvoiceNo").value.trim(),
      fe_date: document.getElementById("feDate").value,
      te_date: document.getElementById("teDate").value,
      oa_process: document.getElementById("oaProcess").value.trim(),
      production_finish_date: document.getElementById("productionFinishDate").value,
      production_status: document.getElementById("productionStatus").value,
      u9_before_shipment: document.getElementById("u9BeforeShipment").value.trim(),
      so_no: document.getElementById("soNo").value.trim(),
      etd: document.getElementById("etd").value,
      eta: document.getElementById("eta").value,
      notes: document.getElementById("orderNotes").value.trim()
    };

    if (!payload.order_date || !payload.customer_invoice_no) {
      clearOrderFormMessage();
      showToast("Please enter order date and customer invoice number.");
      return;
    }

    if (!payload.customer_code) {
      state.advancedOpen = true;
      syncAdvancedPanelState();
      setOrderFormMessage("Please fill in Customer Short Name under Advanced before saving.");
      els.customerCode.focus();
      showToast("Customer short name is required.");
      return;
    }

    if (!canManageOrders()) {
      clearOrderFormMessage();
      showToast("Only admin accounts can create or edit orders.");
      return;
    }

    clearOrderFormMessage();
    const savedOrder = await saveOrder(payload);
    if (!savedOrder) {
      return;
    }

    state.orders = [savedOrder, ...state.orders.filter((item) => item.id !== savedOrder.id)];
    state.selectedOrderId = savedOrder.id;
    els.orderForm.reset();
    els.orderNotes.classList.remove("is-expanded");
    renderAll();
    await loadOrders();
    renderAll();

    if (state.mode === "cloud" && !state.orders.length) {
      showToast("The order may be saved, but this account cannot read the order list yet.");
      return;
    }

    showToast("Order record saved.");
  });
}

function bindSelection() {
  els.orderTableBody.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-order-id]");
    if (!row) {
      return;
    }

    state.selectedOrderId = row.dataset.orderId;
    renderAll();
  });

  els.orderCards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-order-id]");
    if (!card) {
      return;
    }

    state.selectedOrderId = card.dataset.orderId;
    renderAll();
  });
}

function bindInlineEditing() {
  els.orderTableBody.addEventListener("change", async (event) => {
    const field = event.target.dataset.field;
    const orderId = event.target.dataset.orderId;

    if (!field || !orderId) {
      return;
    }

    if (!canManageOrders()) {
      showToast("Only admin accounts can edit orders.");
      renderAll();
      return;
    }

    await updateOrderField(orderId, field, event.target.value);
  });
}

function bindAuth() {
  els.authToggleButton.addEventListener("click", toggleAuthPanel);
  els.advancedToggleButton.addEventListener("click", toggleAdvancedPanel);
  els.signInButton.addEventListener("click", signIn);
  els.signUpButton.addEventListener("click", signUp);
  els.signOutButton.addEventListener("click", signOut);
}

function bindExport() {
  els.exportExcelButton.addEventListener("click", exportOrdersToExcel);
}

function bindNotesField() {
  els.orderNotes.addEventListener("focus", () => {
    els.orderNotes.classList.add("is-expanded");
  });

  els.orderNotes.addEventListener("blur", () => {
    if (!els.orderNotes.value.trim()) {
      els.orderNotes.classList.remove("is-expanded");
    }
  });

  els.orderNotes.addEventListener("input", () => {
    if (els.orderNotes.value.trim()) {
      els.orderNotes.classList.add("is-expanded");
    }
  });
}

function setupSupabase() {
  const config = window.APP_CONFIG || {};
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
    setDemoMode("Demo mode. Connect Supabase to enable sign-in.");
    return;
  }

  state.supabase = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );
  state.mode = "cloud";
}

async function loadOrders() {
  if (state.mode === "demo" || !state.supabase) {
    state.orders = [...demoOrders];
    if (!state.selectedOrderId && state.orders.length) {
      state.selectedOrderId = state.orders[0].id;
    }
    return;
  }

  const {
    data: { session }
  } = await state.supabase.auth.getSession();
  state.session = session;

  if (!session) {
    state.profile = null;
    state.orders = [];
    state.selectedOrderId = null;
    return;
  }

  state.profile = await loadProfile(session.user.id);

  const { data, error } = await state.supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    showToast(error.message);
    state.orders = [];
    state.selectedOrderId = null;
    return;
  }

  state.orders = data || [];

  if (!state.selectedOrderId || !state.orders.some((item) => item.id === state.selectedOrderId)) {
    state.selectedOrderId = state.orders[0]?.id || null;
  }
}

async function loadProfile(userId) {
  const { data, error } = await state.supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

async function saveOrder(payload) {
  if (state.mode === "demo" || !state.supabase) {
    const newOrder = {
      id: `o-${crypto.randomUUID()}`,
      ...payload
    };
    demoOrders.unshift(newOrder);
    return newOrder;
  }

  const { data, error } = await state.supabase
    .from("orders")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    showToast(error.message);
    return false;
  }

  return data;
}

async function updateOrderField(orderId, field, value) {
  const nextValue = value ?? "";

  if (state.mode === "demo" || !state.supabase) {
    const stateOrder = state.orders.find((item) => item.id === orderId);
    const demoOrder = demoOrders.find((item) => item.id === orderId);

    if (stateOrder) {
      stateOrder[field] = nextValue;
    }

    if (demoOrder) {
      demoOrder[field] = nextValue;
    }

    renderMetrics();
    renderCards();
    renderDetailPanel();
    showToast("Order updated.");
    return;
  }

  const { error } = await state.supabase
    .from("orders")
    .update({ [field]: nextValue })
    .eq("id", orderId);

  if (error) {
    showToast(error.message);
    return;
  }

  const stateOrder = state.orders.find((item) => item.id === orderId);
  if (stateOrder) {
    stateOrder[field] = nextValue;
  }

  renderMetrics();
  renderCards();
  renderDetailPanel();
  showToast("Order updated.");
}

async function signUp() {
  if (!state.supabase) {
    showToast("Supabase is not configured.");
    return;
  }

  const email = els.authEmail.value.trim().toLowerCase();
  const password = els.authPassword.value.trim();
  const customerCode = els.authCustomerCode.value.trim().toLowerCase();

  if (!email || !password || !customerCode) {
    showToast("Please enter email, password, and customer short name.");
    return;
  }

  const { error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        customer_code: customerCode
      }
    }
  });

  if (error) {
    showToast(error.message);
    return;
  }

  els.authCustomerCode.value = "";
  showToast("Sign-up submitted. Check your email if confirmation is required.");
}

async function signIn() {
  if (!state.supabase) {
    showToast("Supabase is not configured.");
    return;
  }

  const email = els.authEmail.value.trim().toLowerCase();
  const password = els.authPassword.value.trim();

  if (!email || !password) {
    showToast("Please enter email and password.");
    return;
  }

  const { error } = await state.supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast(error.message);
    return;
  }

  await loadOrders();
  renderAll();
  showToast("Signed in.");
}

async function signOut() {
  if (!state.supabase || !state.session) {
    showToast("No active session.");
    return;
  }

  await state.supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  await loadOrders();
  renderAll();
  showToast("Signed out.");
}

function renderAll() {
  renderAuthPanel();
  syncAdvancedPanelState();
  renderTable();
  renderCards();
  renderDetailPanel();
  renderMetrics();
}

function renderAuthPanel() {
  syncAuthPanelState();

  if (state.mode === "demo") {
    els.authModeBadge.textContent = "Demo";
    els.authMessage.textContent = "";
    els.entryCard.classList.remove("is-restricted");
    return;
  }

  if (!state.session) {
    els.authModeBadge.textContent = "Cloud";
    els.authMessage.textContent = "";
    els.entryCard.classList.add("is-restricted");
    return;
  }

  const roleLabel = canManageOrders() ? "Admin" : "Customer";
  els.authModeBadge.textContent = roleLabel;
  els.authMessage.textContent = "";

  if (canManageOrders()) {
    els.entryCard.classList.remove("is-restricted");
  } else {
    els.entryCard.classList.add("is-restricted");
  }
}

function toggleAuthPanel() {
  state.authOpen = !state.authOpen;
  syncAuthPanelState();
}

function syncAuthPanelState() {
  els.authBody.classList.toggle("is-collapsed", !state.authOpen);
  els.authToggleButton.textContent = state.authOpen ? "Hide" : "Open";
  els.authToggleButton.setAttribute("aria-expanded", state.authOpen ? "true" : "false");
}

function toggleAdvancedPanel() {
  state.advancedOpen = !state.advancedOpen;
  syncAdvancedPanelState();
}

function syncAdvancedPanelState() {
  els.advancedBody.classList.toggle("is-collapsed", !state.advancedOpen);
  els.advancedToggleButton.textContent = state.advancedOpen ? "Hide Advanced" : "Advanced";
  els.advancedToggleButton.setAttribute("aria-expanded", state.advancedOpen ? "true" : "false");
}

function setOrderFormMessage(message) {
  els.orderFormMessage.textContent = message;
  els.orderFormMessage.classList.remove("is-hidden");
}

function clearOrderFormMessage() {
  els.orderFormMessage.textContent = "";
  els.orderFormMessage.classList.add("is-hidden");
}

function renderTable() {
  if (!state.orders.length) {
    const message = state.mode === "cloud" && !state.session
      ? "Sign in to load your orders."
      : "No order records yet. Add your first one to get started.";
    els.orderTableBody.innerHTML =
      `<tr><td class="empty-row" colspan="14">${message}</td></tr>`;
    return;
  }

  const editable = canManageOrders();

  els.orderTableBody.innerHTML = state.orders
    .map(
      (order) => `
        <tr data-order-id="${safe(order.id)}" class="${state.selectedOrderId === order.id ? "is-selected" : ""}">
          <td>${safe(order.order_date)}</td>
          <td>${safe(order.customer_code)}</td>
          <td>${safe(order.customer_invoice_no)}</td>
          <td>${safe(order.factory_invoice_no)}</td>
          <td>${safe(order.fe_date)}</td>
          <td>${safe(order.te_date)}</td>
          <td>${editable ? renderTextInput(order.id, "oa_process", order.oa_process, "OA Process") : safe(order.oa_process)}</td>
          <td>${editable ? renderDateInput(order.id, "production_finish_date", order.production_finish_date) : safe(order.production_finish_date)}</td>
          <td>${editable ? renderStatusSelect(order.id, order.production_status) : renderStatusPill(order.production_status)}</td>
          <td>${editable ? renderTextInput(order.id, "u9_before_shipment", order.u9_before_shipment, "U9 before shipment") : safe(order.u9_before_shipment)}</td>
          <td>${editable ? renderTextInput(order.id, "so_no", order.so_no, "SO") : safe(order.so_no)}</td>
          <td>${editable ? renderDateInput(order.id, "etd", order.etd) : safe(order.etd)}</td>
          <td>${editable ? renderDateInput(order.id, "eta", order.eta) : safe(order.eta)}</td>
          <td>${editable ? renderTextarea(order.id, "notes", order.notes, "Notes") : safe(order.notes)}</td>
        </tr>
      `
    )
    .join("");
}

function renderCards() {
  if (!state.orders.length) {
    const message = state.mode === "cloud" && !state.session
      ? "Sign in to view your orders."
      : "No order records yet.";
    els.orderCards.innerHTML = `<div class="empty-card">${message}</div>`;
    return;
  }

  els.orderCards.innerHTML = state.orders
    .map(
      (order) => `
        <article class="order-card ${state.selectedOrderId === order.id ? "is-selected" : ""}" data-order-id="${safe(order.id)}">
          <div class="order-card-top">
            <div>
              <strong>${safe(order.customer_invoice_no)}</strong>
              <span>${safe(order.customer_code)}</span>
            </div>
            <span class="mobile-status ${safeClass(order.production_status)}">${safe(
              statusLabels[order.production_status] || order.production_status
            )}</span>
          </div>

          <div class="order-card-grid">
            ${dataBox("Date", order.order_date)}
            ${dataBox("ETA", order.eta)}
            ${dataBox("ETD", order.etd)}
            ${dataBox("SO", order.so_no)}
          </div>
        </article>
      `
    )
    .join("");
}

function renderDetailPanel() {
  const order = state.orders.find((item) => item.id === state.selectedOrderId);

  if (!order) {
    els.orderDetailPanel.classList.add("is-hidden");
    els.detailTitle.textContent = "Order Details";
    els.detailSubtitle.textContent = "Select an order from the list above.";
    els.detailGrid.innerHTML = "";
    return;
  }

  els.orderDetailPanel.classList.remove("is-hidden");
  els.detailTitle.textContent = order.customer_invoice_no || "Order Details";
  els.detailSubtitle.textContent = `Status: ${statusLabels[order.production_status] || order.production_status}`;
  els.detailGrid.innerHTML = [
    dataBox("Customer Short Name", order.customer_code),
    dataBox("Date of Order", order.order_date),
    dataBox("Customer Invoice", order.customer_invoice_no),
    dataBox("Factory Invoice", order.factory_invoice_no),
    dataBox("F.E.", order.fe_date),
    dataBox("T.E.", order.te_date),
    dataBox("OA Process", order.oa_process, true),
    dataBox("Production Finish Date", order.production_finish_date),
    dataBox("Production Status", statusLabels[order.production_status] || order.production_status),
    dataBox("U9 before shipment", order.u9_before_shipment, true),
    dataBox("SO", order.so_no),
    dataBox("ETD", order.etd),
    dataBox("ETA", order.eta),
    dataBox("Notes", order.notes, true)
  ].join("");
}

function renderMetrics() {
  const total = state.orders.length;
  const active = state.orders.filter((item) =>
    ["pending", "in_production", "packing", "ready"].includes(item.production_status)
  ).length;
  const weekEta = state.orders.filter((item) => isWithinNext7Days(item.eta)).length;
  const followup = state.orders.filter(
    (item) => item.production_status === "pending" || !item.fe_date || !item.te_date
  ).length;

  els.totalOrders.textContent = String(total);
  els.activeOrders.textContent = String(active);
  els.etaThisWeek.textContent = String(weekEta);
  els.followupOrders.textContent = String(followup);
}

function exportOrdersToExcel() {
  if (!state.orders.length) {
    showToast("No orders to export.");
    return;
  }

  if (!window.XLSX) {
    showToast("Excel export is not available right now.");
    return;
  }

  const rows = state.orders.map((order) => ({
    "Date of Order": order.order_date || "",
    "Customer Short Name": order.customer_code || "",
    "Customer Invoice No.": order.customer_invoice_no || "",
    "Factory Invoice No.": order.factory_invoice_no || "",
    "F.E.": order.fe_date || "",
    "T.E.": order.te_date || "",
    "OA Process": order.oa_process || "",
    "Production Finish Date": order.production_finish_date || "",
    "Production Status": statusLabels[order.production_status] || order.production_status || "",
    "U9 before shipment": order.u9_before_shipment || "",
    "SO": order.so_no || "",
    "ETD": order.etd || "",
    "ETA": order.eta || "",
    "Notes": order.notes || ""
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  window.XLSX.writeFile(workbook, `order-tracking-${formatExportDate(new Date())}.xlsx`);
  showToast("Excel exported.");
}

function formatExportDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function canManageOrders() {
  return state.mode === "demo" || state.profile?.role === "admin";
}

function setDemoMode(message) {
  state.mode = "demo";
  state.session = null;
  state.profile = null;
  els.authModeBadge.textContent = "Demo";
  els.authMessage.textContent = "";
}

function renderDateInput(orderId, field, value) {
  return `<input class="cell-input" type="date" data-order-id="${safe(orderId)}" data-field="${safe(field)}" value="${safeAttr(
    value
  )}" />`;
}

function renderTextInput(orderId, field, value, placeholder) {
  return `<input class="cell-input" type="text" data-order-id="${safe(orderId)}" data-field="${safe(field)}" value="${safeAttr(
    value
  )}" placeholder="${safeAttr(placeholder)}" />`;
}

function renderTextarea(orderId, field, value, placeholder) {
  return `<textarea class="cell-textarea" data-order-id="${safe(orderId)}" data-field="${safe(field)}" placeholder="${safeAttr(
    placeholder
  )}">${safe(value)}</textarea>`;
}

function renderStatusSelect(orderId, value) {
  const options = Object.entries(statusLabels)
    .map(
      ([optionValue, label]) =>
        `<option value="${safeAttr(optionValue)}" ${optionValue === value ? "selected" : ""}>${safe(label)}</option>`
    )
    .join("");

  return `<select class="cell-select" data-order-id="${safe(orderId)}" data-field="production_status">${options}</select>`;
}

function renderStatusPill(value) {
  return `<span class="table-pill ${safeClass(value)}">${safe(statusLabels[value] || value)}</span>`;
}

function dataBox(label, value, wide = false) {
  return `
    <div class="data-box ${wide ? "wide" : ""}">
      <label>${safe(label)}</label>
      <span>${safe(value)}</span>
    </div>
  `;
}

function safe(value) {
  if (!value) {
    return "-";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeAttr(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeClass(value) {
  return String(value || "")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "")
    .trim();
}

function isWithinNext7Days(dateString) {
  if (!dateString) {
    return false;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);

  return target >= now && target <= end;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2200);
}
