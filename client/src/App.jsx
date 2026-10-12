import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { io } from "socket.io-client";
import {
  Activity, AlarmClock, BarChart3, Bell, CheckCircle2, ChevronDown,
  CircleGauge, Clock3, Download, FileBarChart, Filter, Gauge, History,
  LayoutDashboard, LogOut, Menu, Radio, RefreshCw, Search, Settings,
  ShieldCheck, SlidersHorizontal, Thermometer, TriangleAlert, UserRound,
  Waves, Wrench, X, Zap
} from "lucide-react";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (BACKEND_URL || (window.location.port === "5173" ? `http://${window.location.hostname}:4000` : window.location.origin));
const statusLabels = { NORMAL: "Normal", WATCH: "Watch", WARNING: "Warning", CRITICAL: "Critical", OFFLINE: "Offline" };

const statusColors = { NORMAL: "#16a34a", WATCH: "#0ea5e9", WARNING: "#f59e0b", CRITICAL: "#ef4444", OFFLINE: "#64748b" };

async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Permintaan tidak dapat diproses.");
  }
  return response.json();
}

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("df-session") || "null"));
  if (!session) return <Login onLogin={(value) => { localStorage.setItem("df-session", JSON.stringify(value)); setSession(value); }} />;
  return <ControlCenter session={session} onLogout={() => { localStorage.removeItem("df-session"); setSession(null); }} />;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("operator@reoc.local");
  const [password, setPassword] = useState("Operator123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      onLogin(result);
    } catch (err) { setError(err.message || "API belum tersedia."); }
    finally { setLoading(false); }
  }

  return <main className="login-page">
    <section className="login-visual">
      <div className="grid-overlay" />
      <div className="login-brand"><BrandMark /><div><b>DF-EWDSS</b><span>REOC MONITORING SYSTEM</span></div></div>
      <div className="hero-copy">
        <div className="eyebrow"><Radio size={14} /> LIVE OPERATIONAL INTELLIGENCE</div>
        <h1>Protecting flow.<br /><em>Powering reliability.</em></h1>
        <p>Sistem peringatan dini dan pendukung keputusan untuk menjaga performa debris filter pada unit pembangkit.</p>
        <div className="hero-metrics">
          <div><strong>24/7</strong><span>Monitoring</span></div><div><strong>&lt;5s</strong><span>Data refresh</span></div><div><strong>5</strong><span>Risk levels</span></div>
        </div>
      </div>
      <div className="flow-lines"><i /><i /><i /><i /></div>
    </section>
    <section className="login-panel">
      <form className="login-card" onSubmit={submit}>
        <div className="mobile-brand"><BrandMark /><b>DF-EWDSS</b></div>
        <span className="secure-label"><ShieldCheck size={15} /> SECURE ACCESS</span>
        <h2>Control Center Login</h2>
        <p>Masuk dengan akun operasional REOC Anda.</p>
        <label>Email operasional<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="form-error"><TriangleAlert size={16} />{error}</div>}
        <button className="primary-button" disabled={loading}>{loading ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />}{loading ? "Menghubungkan..." : "Masuk ke Dashboard"}</button>
        <div className="demo-access"><span>Demo operator</span><code>operator@reoc.local / Operator123!</code></div>
        <small>DF-EWDSS v1.0.0 &bull; Internal System</small>
      </form>
    </section>
  </main>;
}

function ControlCenter({ session, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [summary, setSummary] = useState(null);
  const [units, setUnits] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [trend, setTrend] = useState([]);
  const [hours, setHours] = useState(24);
  const [toast, setToast] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { token, user } = session;

  async function loadCore() {
    try {
      const [summaryData, unitData, alarmData, thresholdData] = await Promise.all([
        api("/dashboard/summary", token), api("/units/status", token), api("/alarms", token), api("/settings/thresholds", token)
      ]);
      setSummary(summaryData); setUnits(unitData); setAlarms(alarmData); setThresholds(thresholdData); setLastUpdate(new Date());
    } catch (err) { if (String(err.message).includes("Sesi")) onLogout(); else showToast(err.message); }
  }

  async function loadTrend() {
    try { setTrend(await api(`/sensor/trend?unit_id=${selectedUnit}&hours=${hours}`, token)); }
    catch (err) { showToast(err.message); }
  }

  function showToast(message) { setToast(message); window.setTimeout(() => setToast(""), 3200); }

  useEffect(() => { loadCore(); }, []);
  useEffect(() => { loadTrend(); }, [selectedUnit, hours]);
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("sensor:update", ({ unit, summary: nextSummary }) => {
      setUnits((current) => current.map((item) => item.id === unit.id ? unit : item));
      setSummary(nextSummary); setLastUpdate(new Date());
      if (unit.id === selectedUnit) setTrend((current) => [...current.slice(-199), unit.latest]);
    });
    socket.on("alarm:new", (alarm) => { setAlarms((current) => [alarm, ...current]); showToast(`Alarm baru: ${alarm.name}`); });
    socket.on("alarm:updated", () => loadCore());
    return () => socket.disconnect();
  }, [selectedUnit]);

  const navigation = [
    ["dashboard", "Overview", LayoutDashboard], ["monitoring", "Monitoring", Activity], ["alarms", "Alarm Center", AlarmClock],
    ["trend", "Trend & Historis", BarChart3], ["reports", "Laporan", FileBarChart], ["settings", "Pengaturan", Settings]
  ];
  const titles = { dashboard: ["Operational Overview", "Visibilitas kondisi debris filter lintas pembangkit"], monitoring: ["Unit Monitoring", "Analisis parameter dan kondisi filter secara detail"], alarms: ["Alarm Center", "Kelola peringatan dan tindak lanjut operasional"], trend: ["Trend & Historical", "Analisis perubahan parameter berbasis waktu"], reports: ["Report Center", "Dokumentasi kondisi operasional unit"], settings: ["System Settings", "Konfigurasi threshold early warning"] };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? "open" : ""}`}>
      <div className="sidebar-brand"><BrandMark /><div><b>DF-EWDSS</b><span>REOC CONTROL CENTER</span></div><button onClick={() => setSidebar(false)}><X size={20} /></button></div>
      <nav>
        <span className="nav-caption">OPERATIONS</span>
        {navigation.slice(0, 4).map(([id, label, Icon]) => <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setSidebar(false); }}><Icon size={19} /><span>{label}</span>{id === "alarms" && summary?.active_alarms > 0 && <i>{summary.active_alarms}</i>}</button>)}
        <span className="nav-caption">MANAGEMENT</span>
        {navigation.slice(4).map(([id, label, Icon]) => <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setSidebar(false); }}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
      <div className="system-health"><div><span>System health</span><b>All services operational</b></div><i /></div>
      <div className="sidebar-user"><div className="avatar">{user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div><b>{user.name}</b><span>{user.role}</span></div><button onClick={onLogout} title="Keluar"><LogOut size={18} /></button></div>
    </aside>
    {sidebar && <div className="backdrop" onClick={() => setSidebar(false)} />}
    <div className="main-area">
      <header className="topbar">
        <button className="menu-button" onClick={() => setSidebar(true)}><Menu size={22} /></button>
        <div><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div>
        <div className="top-actions"><div className="live-pill"><i /> LIVE <span>&bull; 5 sec</span></div><button className="icon-button"><Bell size={19} />{summary?.active_alarms > 0 && <i />}</button><div className="date-box"><Clock3 size={17} /><span>{new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span></div></div>
      </header>
      <main className="page-content">
        {page === "dashboard" && <Dashboard summary={summary} units={units} alarms={alarms} trend={trend} lastUpdate={lastUpdate} selectUnit={(id) => { setSelectedUnit(id); setPage("monitoring"); }} />}
        {page === "monitoring" && <Monitoring units={units} selected={selectedUnit} setSelected={setSelectedUnit} trend={trend} hours={hours} setHours={setHours} />}
        {page === "alarms" && <Alarms alarms={alarms} token={token} reload={loadCore} notify={showToast} />}
        {page === "trend" && <Trends units={units} selected={selectedUnit} setSelected={setSelectedUnit} trend={trend} hours={hours} setHours={setHours} />}
        {page === "reports" && <Reports token={token} units={units} notify={showToast} />}
        {page === "settings" && <SettingsPage user={user} token={token} thresholds={thresholds} setThresholds={setThresholds} notify={showToast} />}
      </main>
    </div>
    {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
  </div>;
}

function Dashboard({ summary, units, alarms, trend, lastUpdate, selectUnit }) {
  if (!summary) return <Loading />;
  const cards = [["Total Unit", summary.total_units, "Connected assets", Gauge, "total"], ["Normal", summary.normal, "Operating safely", CheckCircle2, "normal"], ["Watch", summary.watch, "Need observation", Activity, "watch"], ["Warning", summary.warning, "Action required", TriangleAlert, "warning"], ["Critical / Offline", summary.critical + summary.offline, "Immediate response", AlarmClock, "critical"]];
  const focus = [...units].sort((a, b) => b.risk_score - a.risk_score)[0];
  return <>
    <div className="update-strip"><span><Radio size={15} /> SENSOR NETWORK ONLINE</span><span>Last sync {lastUpdate.toLocaleTimeString("id-ID")} <RefreshCw size={14} /></span></div>
    <section className="summary-grid">{cards.map(([label, value, detail, Icon, type]) => <div className={`summary-card ${type}`} key={label}><div className="summary-icon"><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><div className="micro-bars"><i /><i /><i /><i /><i /></div></div>)}</section>
    <section className="section-heading"><div><span>FLEET STATUS</span><h2>Debris Filter Units</h2></div><button className="text-button">Semua unit <ChevronDown size={16} /></button></section>
    <section className="unit-grid">{units.map((unit) => <UnitCard key={unit.id} unit={unit} onClick={() => selectUnit(unit.id)} />)}</section>
    <section className="dashboard-bottom">
      <Panel title="Fleet DP Trend" subtitle="Differential pressure real-time" icon={Waves} className="chart-panel"><TrendChart data={trend} metrics={["differential_pressure"]} height={260} /></Panel>
      <Panel title="Active Alarms" subtitle={`${summary.active_alarms} peringatan memerlukan perhatian`} icon={Bell} className="alarm-panel">
        <div className="alarm-list">{alarms.filter((a) => a.status !== "RESOLVED").slice(0, 4).map((alarm) => <div className="alarm-row" key={alarm.id}><i className={alarm.level.toLowerCase()} /><div><b>{alarm.name}</b><span>{alarm.unit?.plant} &bull; {timeAgo(alarm.triggered_at)}</span></div><StatusBadge value={alarm.level} /></div>)}</div>
      </Panel>
      {focus && <Panel title="Decision Support" subtitle="Rekomendasi prioritas tertinggi" icon={ShieldCheck} className="decision-panel"><div className={`decision-focus ${focus.status.toLowerCase()}`}><div className="risk-ring" style={{ "--risk": `${focus.risk_score * 3.6}deg`, "--color": statusColors[focus.status] }}><span><b>{focus.risk_score}</b>/100</span></div><div><StatusBadge value={focus.status} /><h3>{focus.plant} &bull; {focus.name}</h3><p>{focus.recommendation}</p></div></div><div className="decision-footer"><Wrench size={17} /><span>Tindakan operator tetap memerlukan verifikasi kondisi lapangan.</span></div></Panel>}
    </section>
  </>;
}

function UnitCard({ unit, onClick }) {
  const value = unit.latest || {};
  return <button className={`unit-card ${unit.status.toLowerCase()}`} onClick={onClick}>
    <div className="unit-top"><div><span>{unit.code}</span><h3>{unit.plant}</h3><small>{unit.name} &bull; {unit.filter_name}</small></div><StatusBadge value={unit.status} /></div>
    <div className="unit-risk"><div><span>Risk score</span><strong>{unit.risk_score}<small>/100</small></strong></div><div className="risk-track"><i style={{ width: `${unit.risk_score}%` }} /></div></div>
    <div className="unit-values"><Metric label="Diff. pressure" value={value.differential_pressure ?? "--"} unit="bar" /><Metric label="Flow rate" value={value.flow_rate ?? "--"} unit="m3/h" /><Metric label="Temperature" value={value.temperature ?? "--"} unit="C" /></div>
    <div className="unit-card-footer"><span><i /> {value.sensor_status || "NO DATA"}</span><span>Lihat detail <span>&rarr;</span></span></div>
  </button>;
}

function Monitoring({ units, selected, setSelected, trend, hours, setHours }) {
  const unit = units.find((item) => item.id === selected) || units[0];
  if (!unit) return <Loading />;
  const value = unit.latest;
  return <>
    <Toolbar units={units} selected={selected} setSelected={setSelected} hours={hours} setHours={setHours} />
    <section className="monitor-hero">
      <div className="filter-schematic">
        <div className="schematic-title"><span>PROCESS VISUALIZATION</span><StatusBadge value={unit.status} /></div>
        <div className="process-line"><div className="pipe inlet"><span>INLET</span><b>{value.pressure_inlet} bar</b></div><div className="pump-symbol"><i /><Activity size={25} /></div><div className={`filter-symbol ${unit.status.toLowerCase()}`}><Filter size={34} /><span>{unit.filter_name}</span><i>DP {value.differential_pressure} bar</i></div><div className="pipe outlet"><span>OUTLET</span><b>{value.pressure_outlet} bar</b></div></div>
        <div className="flow-caption"><Waves size={17} /><span>Cooling water flow</span><b>{value.flow_rate} m3/h</b><i style={{ width: `${Math.min(100, value.flow_rate / 65)}%` }} /></div>
      </div>
      <div className="risk-overview"><span>COMBINED RISK SCORE</span><div className="large-gauge"><ReactECharts option={gaugeOption(unit.risk_score, unit.status)} style={{ height: 190 }} /></div><StatusBadge value={unit.status} /><p>{unit.recommendation}</p></div>
    </section>
    <section className="sensor-grid"><SensorCard icon={Gauge} label="Differential pressure" value={value.differential_pressure} unit="bar" note={`Limit warning ${2} bar`} status={unit.status} /><SensorCard icon={Waves} label="Flow rate" value={value.flow_rate} unit="m3/h" note={`Drop ${value.flow_drop || 0}% dari desain`} /><SensorCard icon={Thermometer} label="Water temperature" value={value.temperature} unit="C" note="Dalam rentang operasi" /><SensorCard icon={Zap} label="Pump current" value={value.pump_current} unit="A" note={`Valve ${value.valve_position}% open`} /></section>
    <Panel title="Live Operational Trend" subtitle={`${unit.plant} - ${unit.name}`} icon={BarChart3} className="full-chart"><TrendChart data={trend} metrics={["differential_pressure", "flow_rate", "risk_score"]} height={340} /></Panel>
  </>;
}

function Alarms({ alarms, token, reload, notify }) {
  const [level, setLevel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const visible = alarms.filter((a) => (level === "ALL" || a.level === level) && (status === "ALL" || a.status === status));
  async function action(alarm, type) {
    const note = window.prompt(`Catatan ${type === "acknowledge" ? "acknowledgement" : "penyelesaian"}:`, alarm.note || "");
    if (note === null) return;
    try { await api(`/alarms/${alarm.id}/${type}`, token, { method: "POST", body: JSON.stringify({ note }) }); notify(`Alarm #${alarm.id} berhasil diperbarui.`); reload(); }
    catch (err) { notify(err.message); }
  }
  return <>
    <div className="alarm-kpis"><div><Bell /><span>Active<strong>{alarms.filter((a) => a.status === "ACTIVE").length}</strong></span></div><div><TriangleAlert /><span>Critical<strong>{alarms.filter((a) => a.level === "CRITICAL" && a.status !== "RESOLVED").length}</strong></span></div><div><CheckCircle2 /><span>Acknowledged<strong>{alarms.filter((a) => a.status === "ACKNOWLEDGED").length}</strong></span></div><div><History /><span>Resolved<strong>{alarms.filter((a) => a.status === "RESOLVED").length}</strong></span></div></div>
    <Panel title="Alarm Log" subtitle="Peringatan aktif dan histori tindakan" icon={AlarmClock} className="table-panel">
      <div className="table-tools"><div className="search-box"><Search size={17} /><span>{visible.length} alarm ditemukan</span></div><select value={level} onChange={(e) => setLevel(e.target.value)}><option value="ALL">Semua level</option><option>WATCH</option><option>WARNING</option><option>CRITICAL</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Semua status</option><option>ACTIVE</option><option>ACKNOWLEDGED</option><option>RESOLVED</option><option>ESCALATED</option></select></div>
      <div className="table-scroll"><table><thead><tr><th>Alarm / Unit</th><th>Level</th><th>Waktu</th><th>Status</th><th>Catatan operator</th><th>Tindakan</th></tr></thead><tbody>{visible.map((alarm) => <tr key={alarm.id}><td><b>{alarm.name}</b><span>{alarm.unit?.plant} &bull; {alarm.code}</span></td><td><StatusBadge value={alarm.level} /></td><td>{new Date(alarm.triggered_at).toLocaleString("id-ID")}</td><td><span className="plain-status">{alarm.status}</span></td><td className="note-cell">{alarm.note || "Belum ada catatan"}</td><td><div className="row-actions">{alarm.status === "ACTIVE" && <button onClick={() => action(alarm, "acknowledge")}>Acknowledge</button>}{alarm.status !== "RESOLVED" && <button className="resolve" onClick={() => action(alarm, "resolve")}>Resolve</button>}</div></td></tr>)}</tbody></table></div>
    </Panel>
  </>;
}

function Trends({ units, selected, setSelected, trend, hours, setHours }) {
  return <><Toolbar units={units} selected={selected} setSelected={setSelected} hours={hours} setHours={setHours} /><div className="trend-layout"><Panel title="Differential Pressure" subtitle="bar" icon={Gauge}><TrendChart data={trend} metrics={["differential_pressure"]} height={300} /></Panel><Panel title="Flow Rate" subtitle="m3/h" icon={Waves}><TrendChart data={trend} metrics={["flow_rate"]} height={300} /></Panel><Panel title="Pressure Inlet vs Outlet" subtitle="bar" icon={Activity}><TrendChart data={trend} metrics={["pressure_inlet", "pressure_outlet"]} height={300} /></Panel><Panel title="Risk Score" subtitle="weighted composite score" icon={ShieldCheck}><TrendChart data={trend} metrics={["risk_score"]} height={300} /></Panel></div></>;
}

function Reports({ token, units, notify }) {
  const [busy, setBusy] = useState("");
  async function download(format) {
    setBusy(format);
    try {
      const response = await fetch(`${API}/reports/daily?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Gagal membuat laporan.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `DF-EWDSS-${new Date().toISOString().slice(0, 10)}.${format}`; anchor.click(); URL.revokeObjectURL(url); notify(`Laporan ${format.toUpperCase()} berhasil dibuat.`);
    } catch (err) { notify(err.message); } finally { setBusy(""); }
  }
  return <div className="report-layout"><section className="report-builder"><span className="section-label">REPORT GENERATOR</span><h2>Laporan Kondisi Harian</h2><p>Ringkasan status, risk score, dan parameter terkini seluruh debris filter dalam format siap dokumentasi.</p><div className="report-form"><label>Tanggal laporan<input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Cakupan unit<select><option>Seluruh unit ({units.length})</option>{units.map((u) => <option key={u.id}>{u.plant} - {u.name}</option>)}</select></label></div><div className="export-buttons"><button onClick={() => download("pdf")} disabled={busy}><FileBarChart />{busy === "pdf" ? "Membuat..." : "Export PDF"}</button><button onClick={() => download("xlsx")} disabled={busy}><BarChart3 />{busy === "xlsx" ? "Membuat..." : "Export Excel"}</button><button onClick={() => download("csv")} disabled={busy}><Download />{busy === "csv" ? "Membuat..." : "Export CSV"}</button></div></section><section className="report-preview"><div className="paper"><div className="paper-head"><BrandMark /><div><b>PLN INDONESIA POWER</b><span>REOC OPERATIONAL REPORT</span></div></div><hr /><h3>DEBRIS FILTER DAILY CONDITION</h3><p>{new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</p><div className="preview-stats"><span>Units<b>{units.length}</b></span><span>Safe<b>{units.filter((u) => u.status === "NORMAL").length}</b></span><span>Attention<b>{units.filter((u) => u.status !== "NORMAL").length}</b></span></div>{units.slice(0, 5).map((u) => <div className="preview-row" key={u.id}><span>{u.code}</span><i /><b style={{ color: statusColors[u.status] }}>{u.status}</b><small>{u.risk_score}</small></div>)}<div className="paper-footer">Generated by DF-EWDSS &bull; Internal use only</div></div></section></div>;
}

function SettingsPage({ user, token, thresholds, setThresholds, notify }) {
  const [form, setForm] = useState(thresholds);
  useEffect(() => setForm(thresholds), [thresholds]);
  if (!form) return <Loading />;
  async function save(event) {
    event.preventDefault();
    try { const result = await api("/settings/thresholds", token, { method: "PUT", body: JSON.stringify(form) }); setThresholds(result); notify("Threshold berhasil diperbarui."); }
    catch (err) { notify(err.message); }
  }
  const fields = [["dp_normal", "DP normal max", "bar"], ["dp_warning", "DP warning max", "bar"], ["dp_critical", "DP critical", "bar"], ["design_flow", "Design flow rate", "m3/h"], ["rate_warning", "DP rate warning", "bar/interval"]];
  return <div className="settings-layout"><Panel title="Early Warning Threshold" subtitle="Batas parameter untuk klasifikasi risiko" icon={SlidersHorizontal}><form className="settings-form" onSubmit={save}>{fields.map(([key, label, unit]) => <label key={key}><span>{label}<small>{unit}</small></span><input type="number" step="0.01" value={form[key]} disabled={user.role !== "admin"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}{user.role === "admin" ? <button className="primary-button"><Settings size={18} />Simpan konfigurasi</button> : <div className="permission-note"><ShieldCheck size={18} />Mode lihat saja. Perubahan hanya dapat dilakukan oleh administrator.</div>}</form></Panel><Panel title="Risk Formula" subtitle="Pembobotan combined risk score" icon={CircleGauge}><div className="formula-list">{[["Differential pressure", 35, "#06b6d4"], ["Flow degradation", 25, "#3b82f6"], ["Rate of change", 20, "#8b5cf6"], ["Alarm frequency", 10, "#f59e0b"], ["Sensor health", 10, "#ef4444"]].map(([name, value, color]) => <div key={name}><span>{name}<b>{value}%</b></span><i><i style={{ width: `${value * 2.3}%`, background: color }} /></i></div>)}</div><div className="config-meta"><span>Current role</span><b><UserRound size={16} />{user.role}</b></div></Panel></div>;
}

function Toolbar({ units, selected, setSelected, hours, setHours }) {
  return <div className="toolbar"><label><span>Unit pembangkit</span><select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.code} - {unit.plant}</option>)}</select></label><label><span>Rentang data</span><select value={hours} onChange={(e) => setHours(Number(e.target.value))}><option value="1">1 jam</option><option value="6">6 jam</option><option value="24">24 jam</option><option value="168">7 hari</option><option value="720">30 hari</option></select></label><div className="toolbar-live"><i /> Streaming data aktif</div></div>;
}

function TrendChart({ data = [], metrics, height }) {
  const config = {
    differential_pressure: ["Differential pressure", "#06b6d4"], flow_rate: ["Flow rate", "#3b82f6"], risk_score: ["Risk score", "#f59e0b"], pressure_inlet: ["Pressure inlet", "#8b5cf6"], pressure_outlet: ["Pressure outlet", "#22c55e"]
  };
  const option = {
    animationDuration: 500, grid: { left: 48, right: 24, top: 42, bottom: 38 },
    tooltip: { trigger: "axis", backgroundColor: "#0f172a", borderColor: "#334155", textStyle: { color: "#f8fafc", fontSize: 11 } },
    legend: { top: 2, right: 8, textStyle: { color: "#64748b", fontSize: 11 } },
    xAxis: { type: "category", data: data.map((d) => new Date(d.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })), boundaryGap: false, axisLine: { lineStyle: { color: "#dbe3ee" } }, axisLabel: { color: "#94a3b8", fontSize: 10 } },
    yAxis: metrics.map((metric, index) => ({ type: "value", show: index < 2, position: index === 1 ? "right" : "left", scale: true, splitLine: { lineStyle: { color: "#edf2f7", type: "dashed" } }, axisLabel: { color: "#94a3b8", fontSize: 10 } })),
    series: metrics.map((metric, index) => ({ name: config[metric][0], type: "line", yAxisIndex: Math.min(index, 1), data: data.map((d) => d[metric]), smooth: true, showSymbol: false, lineStyle: { width: 2.5, color: config[metric][1] }, itemStyle: { color: config[metric][1] }, areaStyle: metrics.length === 1 ? { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${config[metric][1]}38` }, { offset: 1, color: `${config[metric][1]}02` }] } } : undefined }))
  };
  return <ReactECharts option={option} style={{ height }} notMerge />;
}

function gaugeOption(value, status) { return { series: [{ type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 100, pointer: { show: false }, progress: { show: true, roundCap: true, width: 13, itemStyle: { color: statusColors[status] } }, axisLine: { lineStyle: { width: 13, color: [[1, "#e7edf4"]] } }, splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, anchor: { show: false }, detail: { valueAnimation: true, fontSize: 36, fontWeight: 700, color: "#0f172a", offsetCenter: [0, "0%"], formatter: "{value}" }, title: { show: true, offsetCenter: [0, "34%"], color: "#64748b", fontSize: 11 }, data: [{ value, name: "RISK / 100" }] }] }; }
function Metric({ label, value, unit }) { return <div><span>{label}</span><b>{value} <small>{unit}</small></b></div>; }
function SensorCard({ icon: Icon, label, value, unit, note, status = "NORMAL" }) { return <div className="sensor-card"><div className="sensor-icon"><Icon size={21} /></div><span>{label}</span><strong>{value}<small>{unit}</small></strong><p><i className={status.toLowerCase()} />{note}</p></div>; }
function StatusBadge({ value }) { return <span className={`status-badge ${String(value).toLowerCase()}`}><i />{statusLabels[value] || value}</span>; }
function Panel({ title, subtitle, icon: Icon, className = "", children }) { return <section className={`panel ${className}`}><header><div className="panel-title">{Icon && <Icon size={19} />}<div><h3>{title}</h3><span>{subtitle}</span></div></div><button><MoreDots /></button></header><div className="panel-body">{children}</div></section>; }
function MoreDots() { return <span className="more-dots">&bull;&bull;&bull;</span>; }
function Loading() { return <div className="loading"><RefreshCw className="spin" /><span>Memuat data operasional...</span></div>; }
function BrandMark() { return <div className="brand-mark"><Waves size={25} /><Zap size={13} /></div>; }
function timeAgo(date) { const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000); return minutes < 1 ? "baru saja" : `${minutes} menit lalu`; }
