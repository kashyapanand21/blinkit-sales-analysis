// ============================================================
// Frontend logic: reads filters, calls the Express API with fetch(),
// and draws the results with Chart.js and plain HTML tables.
// ============================================================

const COLORS = ['#0c831f', '#f8cb46', '#2e7d9a', '#e07a3f', '#7b5ea7', '#9aa53b', '#c2185b', '#5d6d7e'];
const charts = {};     // Chart.js instances, so we can update instead of re-creating
const lastSql = {};    // last SQL per endpoint, shown in the SQL modal
let recordsPage = 1;

// ---------- Helpers ----------
const $ = sel => document.querySelector(sel);
const fmtMoney = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtShort = n => {
  n = Number(n || 0);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return fmtMoney(n);
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Current filter values -> "?location=Tier%201&size=Medium"
function filterQuery() {
  const params = new URLSearchParams();
  document.querySelectorAll('[data-filter]').forEach(sel => {
    if (sel.value !== 'All') params.set(sel.dataset.filter, sel.value);
  });
  const qs = params.toString();
  return qs ? '?' + qs : '';
}

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

// Fetch one analytics endpoint, remember its SQL, return rows
async function analytics(name) {
  const { sql, data } = await api(`/api/analytics/${name}${filterQuery()}`);
  lastSql[name] = sql;
  return data;
}

// Create a chart the first time, update its data afterwards
function drawChart(id, type, labels, values, extra = {}) {
  if (charts[id]) {
    charts[id].data.labels = labels;
    charts[id].data.datasets[0].data = values;
    charts[id].update();
    return;
  }
  const isRound = type === 'doughnut' || type === 'pie';
  charts[id] = new Chart(document.getElementById(id), {
    type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: isRound ? COLORS : (extra.color || COLORS[0]),
        borderColor: type === 'line' ? COLORS[0] : '#fff',
        borderWidth: isRound ? 2 : (type === 'line' ? 3 : 0),
        borderRadius: type === 'bar' ? 6 : 0,
        tension: 0.3,
        fill: type === 'line' ? { target: 'origin', above: 'rgba(12,131,31,.08)' } : false,
        pointBackgroundColor: COLORS[1],
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: extra.horizontal ? 'y' : 'x',
      plugins: {
        legend: { display: isRound, position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ' ' + fmtMoney(ctx.parsed.y ?? ctx.parsed.x ?? ctx.parsed) } }
      },
      scales: isRound ? {} : {
        [extra.horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { callback: v => fmtShort(v) }, grid: { color: '#f0f0f0' } },
        [extra.horizontal ? 'y' : 'x']: { grid: { display: false } }
      }
    }
  });
}

function renderTable(id, columns, rows) {
  const head = '<tr>' + columns.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('') + '</tr>';
  const body = rows.length
    ? rows.map(r => '<tr>' + columns.map(c => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('') + '</tr>').join('')
    : `<tr><td colspan="${columns.length}">No data for these filters</td></tr>`;
  document.getElementById(id).innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

// ---------- Dashboard ----------
async function loadDashboard() {
  try {
    const [kpi, fat, size, loc, items, years, outletTypes, topItems, belowAvg] = await Promise.all([
      analytics('kpis'), analytics('fat-content'), analytics('outlet-size'), analytics('location'),
      analytics('item-type'), analytics('establishment-year'), analytics('outlet-type'),
      analytics('top-items-by-outlet'), analytics('below-average')
    ]);

    const k = kpi[0];
    $('#kpiTotal').textContent = fmtShort(k.total_sales);
    $('#kpiAvg').textContent = fmtMoney(k.avg_sales);
    $('#kpiItems').textContent = Number(k.total_items).toLocaleString('en-IN');
    $('#kpiRating').textContent = k.avg_rating ?? '–';

    drawChart('chartFat', 'doughnut', fat.map(r => r.item_fat_content), fat.map(r => r.total_sales));
    drawChart('chartSize', 'pie', size.map(r => r.outlet_size), size.map(r => r.total_sales));
    drawChart('chartLocation', 'bar', loc.map(r => r.outlet_location_type), loc.map(r => r.total_sales), { color: COLORS[1] });
    drawChart('chartItemType', 'bar', items.map(r => `${r.item_type} (${r.pct_of_total}%)`), items.map(r => r.total_sales), { horizontal: true });
    drawChart('chartYear', 'line', years.map(r => r.year), years.map(r => r.total_sales));

    renderTable('tableOutletType', [
      { key: 'outlet_type', label: 'Outlet Type' },
      { label: 'Total Sales', num: true, render: r => fmtMoney(r.total_sales) },
      { key: 'item_count', label: 'Items', num: true },
      { label: 'Avg Sales', num: true, render: r => fmtMoney(r.avg_sales) },
      { key: 'avg_rating', label: 'Avg Rating', num: true },
      { key: 'avg_visibility', label: 'Avg Visibility', num: true }
    ], outletTypes);

    renderTable('tableTopItems', [
      { key: 'outlet_type', label: 'Outlet Type' },
      { label: '#', render: r => `<span class="rank">${r.sales_rank}</span>` },
      { key: 'item_type', label: 'Item Type' },
      { label: 'Sales', num: true, render: r => fmtShort(r.total_sales) }
    ], topItems);

    renderTable('tableBelowAvg', [
      { key: 'item_type', label: 'Item Type' },
      { label: 'Avg Sales', num: true, render: r => fmtMoney(r.avg_sales) },
      { key: 'item_count', label: 'Items', num: true }
    ], belowAvg);
  } catch (err) {
    console.error(err);
    alert('Could not load dashboard: ' + err.message);
  }
}

async function loadFilters() {
  const options = await api('/api/analytics/filters');
  document.querySelectorAll('[data-filter]').forEach(sel => {
    sel.innerHTML = '<option>All</option>' + options[sel.dataset.filter].map(v => `<option>${esc(v)}</option>`).join('');
    sel.addEventListener('change', loadDashboard);
  });
  // Item types are also used by the "add sale" form
  $('#addForm [name=item_type]').innerHTML = options.itemType.map(v => `<option>${esc(v)}</option>`).join('');
}

async function loadOutlets() {
  const outlets = await api('/api/records/outlets');
  $('#addForm [name=outlet_identifier]').innerHTML = outlets
    .map(o => `<option value="${esc(o.outlet_identifier)}">${esc(o.outlet_identifier)} · ${esc(o.outlet_type)} · ${esc(o.outlet_location_type)}</option>`)
    .join('');
}

// ---------- Records (CRUD) ----------
async function loadRecords() {
  const search = encodeURIComponent($('#search').value.trim());
  const { data, page, pages, total } = await api(`/api/records?page=${recordsPage}&search=${search}`);
  renderTable('tableRecords', [
    { key: 'id', label: 'ID', num: true },
    { key: 'item_identifier', label: 'Item ID' },
    { key: 'item_type', label: 'Item Type' },
    { key: 'item_fat_content', label: 'Fat' },
    { key: 'outlet_identifier', label: 'Outlet' },
    { key: 'outlet_type', label: 'Outlet Type' },
    { key: 'outlet_location_type', label: 'Tier' },
    { label: 'Sales', num: true, render: r => fmtMoney(r.sales) },
    { key: 'rating', label: 'Rating', num: true },
    { label: '', render: r => `<button class="del" data-id="${r.id}">Delete</button>` }
  ], data);
  $('#pageInfo').textContent = `Page ${page} of ${pages} · ${total.toLocaleString('en-IN')} records`;
  $('#prevPage').disabled = page <= 1;
  $('#nextPage').disabled = page >= pages;
}

function showMsg(text, ok) {
  const el = $('#formMsg');
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'err');
}

$('#addForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    const { id } = await api('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    showMsg(`Saved to MySQL as record #${id}. Dashboard updated.`, true);
    e.target.reset();
    recordsPage = 1;
    await Promise.all([loadRecords(), loadDashboard()]);
  } catch (err) {
    showMsg(err.message, false);
  }
});

$('#tableRecords').addEventListener('click', async e => {
  const btn = e.target.closest('.del');
  if (!btn) return;
  if (!confirm(`Delete record #${btn.dataset.id}?`)) return;
  try {
    await api(`/api/records/${btn.dataset.id}`, { method: 'DELETE' });
    showMsg(`Record #${btn.dataset.id} deleted.`, true);
    await Promise.all([loadRecords(), loadDashboard()]);
  } catch (err) {
    showMsg(err.message, false);
  }
});

let searchTimer;
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { recordsPage = 1; loadRecords(); }, 300);
});
$('#prevPage').addEventListener('click', () => { recordsPage--; loadRecords(); });
$('#nextPage').addEventListener('click', () => { recordsPage++; loadRecords(); });

// ---------- Filters reset + SQL modal ----------
$('#resetFilters').addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(s => (s.value = 'All'));
  loadDashboard();
});

document.addEventListener('click', e => {
  const btn = e.target.closest('.sql-btn');
  if (!btn) return;
  $('#sqlText').textContent = lastSql[btn.dataset.sql] || 'Not loaded yet';
  $('#sqlModal').showModal();
});
$('#closeModal').addEventListener('click', () => $('#sqlModal').close());

// ---------- Start ----------
async function init() {
  try {
    const health = await api('/api/health');
    $('#dbStatus').textContent = `● MySQL connected · ${health.db} · ${Number(health.rows_in_table).toLocaleString('en-IN')} rows`;
    $('#dbStatus').classList.add('ok');
  } catch (err) {
    $('#dbStatus').textContent = '● Database not connected';
    $('#dbStatus').classList.add('err');
    return;
  }
  await Promise.all([loadFilters(), loadOutlets()]);
  await Promise.all([loadDashboard(), loadRecords()]);
}

init();
