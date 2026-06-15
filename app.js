const demoOrders = [
  {
    id: "o-001",
    order_date: "2026-06-09",
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
  orders: [],
  mode: "demo",
  selectedOrderId: null
};

const els = {
  orderForm: document.getElementById("orderForm"),
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
  await loadOrders();
  renderAll();
}

function bindForm() {
  els.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      order_date: document.getElementById("orderDate").value,
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
      showToast("Please enter order date and customer invoice number.");
      return;
    }

    await saveOrder(payload);
    els.orderForm.reset();
    await loadOrders();
    renderAll();
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

async function loadOrders() {
  state.orders = [...demoOrders];
}

async function saveOrder(payload) {
  demoOrders.unshift({
    id: `o-${crypto.randomUUID()}`,
    ...payload
  });
}

function renderAll() {
  renderTable();
  renderCards();
  renderDetailPanel();
  renderMetrics();
}

function renderTable() {
  if (!state.orders.length) {
    els.orderTableBody.innerHTML =
      '<tr><td class="empty-row" colspan="13">No order records yet. Add your first one to get started.</td></tr>';
    return;
  }

  els.orderTableBody.innerHTML = state.orders
    .map(
      (order) => `
        <tr data-order-id="${safe(order.id)}" class="${state.selectedOrderId === order.id ? "is-selected" : ""}">
          <td>${safe(order.order_date)}</td>
          <td>${safe(order.customer_invoice_no)}</td>
          <td>${safe(order.factory_invoice_no)}</td>
          <td>${safe(order.fe_date)}</td>
          <td>${safe(order.te_date)}</td>
          <td>${safe(order.oa_process)}</td>
          <td>${safe(order.production_finish_date)}</td>
          <td><span class="table-pill ${safeClass(order.production_status)}">${safe(
            statusLabels[order.production_status] || order.production_status
          )}</span></td>
          <td>${safe(order.u9_before_shipment)}</td>
          <td>${safe(order.so_no)}</td>
          <td>${safe(order.etd)}</td>
          <td>${safe(order.eta)}</td>
          <td>${safe(order.notes)}</td>
        </tr>
      `
    )
    .join("");
}

function renderCards() {
  if (!state.orders.length) {
    els.orderCards.innerHTML = '<div class="empty-card">No order records yet. Add your first one to get started.</div>';
    return;
  }

  els.orderCards.innerHTML = state.orders
    .map(
      (order) => `
        <article class="order-card ${state.selectedOrderId === order.id ? "is-selected" : ""}" data-order-id="${safe(order.id)}">
          <div class="order-card-top">
            <div>
              <strong>${safe(order.customer_invoice_no)}</strong>
              <span>${safe(order.factory_invoice_no)}</span>
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
    dataBox("Date of Order", order.order_date),
    dataBox("ETA", order.eta),
    dataBox("Customer Invoice", order.customer_invoice_no),
    dataBox("Factory Invoice", order.factory_invoice_no),
    dataBox("F.E.", order.fe_date),
    dataBox("T.E.", order.te_date),
    dataBox("Production Finish Date", order.production_finish_date),
    dataBox("SO", order.so_no),
    dataBox("OA Process", order.oa_process, true),
    dataBox("U9 before shipment", order.u9_before_shipment, true),
    dataBox("ETD", order.etd),
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
