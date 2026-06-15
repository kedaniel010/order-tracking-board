const demoOrders = [
  {
    id: "o-001",
    order_date: "2026-06-09",
    customer_invoice_no: "CUS-INV-2401",
    factory_invoice_no: "FAC-INV-7712",
    customer_name: "Harvey Trading",
    factory_name: "Ningbo Prime",
    fe_date: "2026-06-12",
    te_date: "2026-06-14",
    production_finish_date: "2026-06-21",
    oa_process: "Approval sent",
    production_status: "in_production",
    so_no: "SO-9021",
    up_before_shipment: "Check carton marks",
    eta: "2026-06-28",
    notes: "Customer wants packing photos first"
  },
  {
    id: "o-002",
    order_date: "2026-06-11",
    customer_invoice_no: "CUS-INV-2402",
    factory_invoice_no: "FAC-INV-7719",
    customer_name: "Green Home",
    factory_name: "Foshan Link",
    fe_date: "2026-06-15",
    te_date: "",
    production_finish_date: "2026-06-24",
    oa_process: "Waiting OA confirmation",
    production_status: "pending",
    so_no: "SO-9033",
    up_before_shipment: "Confirm label file",
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
  session: null,
  orders: [],
  mode: "demo"
};

const els = {
  authStatus: document.getElementById("authStatus"),
  syncBadge: document.getElementById("syncBadge"),
  orderForm: document.getElementById("orderForm"),
  orderTableBody: document.getElementById("orderTableBody"),
  orderCards: document.getElementById("orderCards"),
  toast: document.getElementById("toast"),
  totalOrders: document.getElementById("totalOrders"),
  activeOrders: document.getElementById("activeOrders"),
  etaThisWeek: document.getElementById("etaThisWeek"),
  followupOrders: document.getElementById("followupOrders"),
  signInButton: document.getElementById("signInButton"),
  signUpButton: document.getElementById("signUpButton"),
  signOutButton: document.getElementById("signOutButton"),
  emailInput: document.getElementById("emailInput"),
  passwordInput: document.getElementById("passwordInput")
};

init();

async function init() {
  bindForm();
  bindAuth();
  setupSupabase();
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
      customer_name: document.getElementById("customerName").value.trim(),
      factory_name: document.getElementById("factoryName").value.trim(),
      fe_date: document.getElementById("feDate").value,
      te_date: document.getElementById("teDate").value,
      production_finish_date: document.getElementById("productionFinishDate").value,
      oa_process: document.getElementById("oaProcess").value.trim(),
      production_status: document.getElementById("productionStatus").value,
      so_no: document.getElementById("soNo").value.trim(),
      up_before_shipment: document.getElementById("upBeforeShipment").value.trim(),
      eta: document.getElementById("eta").value,
      notes: document.getElementById("orderNotes").value.trim()
    };

    if (!payload.order_date || !payload.customer_invoice_no || !payload.customer_name) {
      showToast("Please enter order date, customer invoice number, and customer name.");
      return;
    }

    if (state.mode === "cloud" && !state.session) {
      showToast("Please sign in before saving to the cloud.");
      return;
    }

    await saveOrder(payload);
    els.orderForm.reset();
    await loadOrders();
    renderAll();
    showToast("Order record saved.");
  });
}

function bindAuth() {
  els.signInButton.addEventListener("click", () => signIn());
  els.signUpButton.addEventListener("click", () => signUp());
  els.signOutButton.addEventListener("click", () => signOut());
}

function setupSupabase() {
  const config = window.APP_CONFIG || {};
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
    setDemoMode("Supabase is not configured yet. Showing demo board.");
    return;
  }

  state.supabase = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );
  state.mode = "cloud";
  els.syncBadge.textContent = "Cloud Sync";
  els.syncBadge.className = "status-badge success";
  els.authStatus.textContent = "Cloud sync is connected. Sign in on any device to view the same data.";
}

async function loadOrders() {
  if (state.mode === "demo" || !state.supabase) {
    state.orders = [...demoOrders];
    return;
  }

  const {
    data: { session }
  } = await state.supabase.auth.getSession();
  state.session = session;

  if (!session) {
    state.orders = [];
    els.authStatus.textContent = "Please sign in to load your order board.";
    return;
  }

  els.authStatus.textContent = `Signed in: ${session.user.email}`;

  const { data, error } = await state.supabase
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    setDemoMode("Cloud tables are not ready yet. Switched back to demo mode.");
    return;
  }

  state.orders = data || [];
}

async function saveOrder(payload) {
  if (state.mode === "demo" || !state.supabase) {
    demoOrders.unshift({
      id: `o-${crypto.randomUUID()}`,
      ...payload
    });
    return;
  }

  const { error } = await state.supabase.from("orders").insert(payload);
  if (error) {
    showToast(error.message);
  }
}

async function signUp() {
  if (!state.supabase) {
    showToast("Configure Supabase before using sign up.");
    return;
  }

  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value.trim();
  if (!email || !password) {
    showToast("Please enter email and password.");
    return;
  }

  const { error } = await state.supabase.auth.signUp({ email, password });
  if (error) {
    showToast(error.message);
    return;
  }

  els.authStatus.textContent = "Sign-up started. Please confirm your email first.";
  showToast("Confirmation email sent.");
}

async function signIn() {
  if (!state.supabase) {
    showToast("Configure Supabase before using sign in.");
    return;
  }

  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value.trim();
  if (!email || !password) {
    showToast("Please enter email and password.");
    return;
  }

  const { data, error } = await state.supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast(error.message);
    return;
  }

  state.session = data.session;
  await loadOrders();
  renderAll();
  showToast("Your order data is synced.");
}

async function signOut() {
  if (!state.supabase || !state.session) {
    showToast("No account is currently signed in.");
    return;
  }

  await state.supabase.auth.signOut();
  state.session = null;
  await loadOrders();
  renderAll();
  els.authStatus.textContent = "Signed out.";
  showToast("Signed out.");
}

function renderAll() {
  renderTable();
  renderCards();
  renderMetrics();
}

function renderTable() {
  if (!state.orders.length) {
    els.orderTableBody.innerHTML =
      '<tr><td class="empty-row" colspan="14">No order records yet. Add your first one to get started.</td></tr>';
    return;
  }

  els.orderTableBody.innerHTML = state.orders
    .map(
      (order) => `
        <tr>
          <td>${safe(order.order_date)}</td>
          <td>${safe(order.customer_invoice_no)}</td>
          <td>${safe(order.factory_invoice_no)}</td>
          <td>${safe(order.customer_name)}</td>
          <td>${safe(order.factory_name)}</td>
          <td>${safe(order.fe_date)}</td>
          <td>${safe(order.te_date)}</td>
          <td>${safe(order.production_finish_date)}</td>
          <td>${safe(order.oa_process)}</td>
          <td><span class="table-pill ${safeClass(order.production_status)}">${safe(
            statusLabels[order.production_status] || order.production_status
          )}</span></td>
          <td>${safe(order.so_no)}</td>
          <td>${safe(order.up_before_shipment)}</td>
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
        <article class="order-card">
          <div class="order-card-top">
            <div>
              <strong>${safe(order.customer_name)}</strong>
              <span>${safe(order.customer_invoice_no)}</span>
            </div>
            <span class="mobile-status ${safeClass(order.production_status)}">${safe(
              statusLabels[order.production_status] || order.production_status
            )}</span>
          </div>

          <div class="order-card-grid">
            ${dataBox("Date", order.order_date)}
            ${dataBox("ETA", order.eta)}
            ${dataBox("Factory Invoice", order.factory_invoice_no)}
            ${dataBox("Factory", order.factory_name)}
            ${dataBox("F.E.", order.fe_date)}
            ${dataBox("T.E.", order.te_date)}
            ${dataBox("Finish", order.production_finish_date)}
            ${dataBox("SO", order.so_no)}
            ${dataBox("OA Process", order.oa_process, true)}
            ${dataBox("UP before shipment", order.up_before_shipment, true)}
            ${dataBox("Notes", order.notes, true)}
          </div>
        </article>
      `
    )
    .join("");
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

function setDemoMode(message) {
  state.mode = "demo";
  state.supabase = null;
  state.session = null;
  els.syncBadge.textContent = "Demo Mode";
  els.syncBadge.className = "status-badge warning";
  els.authStatus.textContent = message;
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
