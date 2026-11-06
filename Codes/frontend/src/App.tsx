import { ChangeEvent, useEffect, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowDownToLine, ArrowRight, BookOpen, Braces, ChevronDown, CircleHelp,
  FileCode2, FileText, Gauge, GitBranch, History, LayoutDashboard, ListChecks,
  Menu, Play, RefreshCw, ScanSearch, Settings2, ShieldCheck, Sparkles, Terminal,
  Upload, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import AutomataPanel from "./components/AutomataPanel";
import ErrorList from "./components/ErrorList";
import TokenTable from "./components/TokenTable";
import AutomataWorkbench from "./pages/AutomataWorkbench";
import LexemeSimulator from "./pages/LexemeSimulator";
import TokenRules from "./pages/TokenRules";
import { api, Analysis, TokenRule } from "./types";
import { ReportFormat, reportMimeType, serializeAnalysis } from "./reportExport";

type Page = "dashboard" | "workbench" | "rules" | "automata" | "simulator" | "reports" | "docs";
const navigation: { id: Page; label: string; icon: typeof LayoutDashboard; section: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "OVERVIEW" },
  { id: "workbench", label: "Lexer workbench", icon: ScanSearch, section: "WORKSPACE" },
  { id: "rules", label: "Token rules", icon: ListChecks, section: "WORKSPACE" },
  { id: "automata", label: "Automata lab", icon: GitBranch, section: "WORKSPACE" },
  { id: "simulator", label: "Lexeme simulator", icon: Play, section: "WORKSPACE" },
  { id: "reports", label: "Reports", icon: FileText, section: "INSIGHTS" },
  { id: "docs", label: "Documentation", icon: BookOpen, section: "INSIGHTS" },
];
const starterCode = `int main() {
  int a = 10;
  float b = 20.5;
  if (a < b) {
    a = a + 5;
  }
  return 0;
}`;
const SAMPLE = `// MiniLex sample
int main() {
  int count = 42;
  float ratio = 3.14;
  if (count >= 10 && ratio != 0.0) {
    count = count + 1;
  }
  return count;
}`;

function setEditorMarkers(instance: editor.IStandaloneCodeEditor | null, monaco: Monaco | null, analysis?: Analysis) {
  const model = instance?.getModel();
  if (!model || !monaco) return;
  monaco.editor.setModelMarkers(model, "minilex", (analysis?.errors ?? []).map((item) => ({
    severity: monaco.MarkerSeverity.Error,
    message: `${item.type.replaceAll("_", " ")}: ${item.message} ${item.suggestion}`,
    startLineNumber: item.line,
    endLineNumber: item.line,
    startColumn: item.column,
    endColumn: item.column + Math.max(1, item.lexeme.split(/\r?\n/, 1)[0].length),
  })));
}

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [source, setSource] = useState(starterCode);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [history, setHistory] = useState<Analysis[]>(() => {
    try { return JSON.parse(localStorage.getItem("minilex-history") ?? "[]") as Analysis[]; }
    catch { return []; }
  });
  const [rules, setRules] = useState<TokenRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportMenu, setReportMenu] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    api.rules().then(setRules).catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not connect to MiniLex API."))
      .finally(() => setLoadingRules(false));
  }, []);
  useEffect(() => { localStorage.setItem("minilex-history", JSON.stringify(history.slice(0, 20))); }, [history]);
  useEffect(() => {
    setEditorMarkers(editorRef.current, monacoRef.current, analysis);
  }, [analysis]);

  async function runAnalysis() {
    setRunning(true);
    setError("");
    try {
      const result = await api.analyze(source);
      setAnalysis(result);
      setHistory((previous) => [result, ...previous.filter((item) => item.id !== result.id)].slice(0, 20));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Analysis could not be completed.");
    } finally { setRunning(false); }
  }
  function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSource(String(reader.result ?? "")); setAnalysis(undefined); };
    reader.onerror = () => setError("Could not read the selected source file.");
    reader.readAsText(file);
    event.target.value = "";
  }
  function exportReport(format: ReportFormat, report = analysis) {
    if (!report) return;
    download(serializeAnalysis(report, format), `minilex-${report.id.slice(0, 8)}.${format}`, reportMimeType(format));
    setReportMenu(false);
  }
  const activeNav = navigation.find((item) => item.id === page)!;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Braces size={21} /></div><div><strong>MiniLex</strong><span>COMPILER LAB</span></div><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-picker"><div className="workspace-icon">M</div><div><strong>MiniLex project</strong><span>Local workspace</span></div><ChevronDown size={14} /></div>
        {["OVERVIEW", "WORKSPACE", "INSIGHTS"].map((section) => <nav className="nav-section" key={section}><p className="nav-label">{section}</p>
          {navigation.filter((item) => item.section === section).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${page === item.id ? "nav-active" : ""}`} onClick={() => { setPage(item.id); setMenuOpen(false); }}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "rules" && rules.length > 0 && <small>{rules.length}</small>}
            </button>;
          })}</nav>)}
        <div className="sidebar-bottom"><div className="engine-status"><span className="status-dot" /><span>Lexer engine ready</span><span className="status-version">v1.0</span></div><div className="profile"><div className="avatar">ML</div><div><strong>Developer</strong><span>Compiler Design Lab</span></div><Settings2 size={16} /></div></div>
      </aside>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation overlay" />}
      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><span>MiniLex</span><span className="crumb-slash">/</span><strong>{activeNav.label}</strong></div>
          <div className="topbar-actions"><span className="connection-indicator"><i /> API connected</span><button className="icon-button" title="Refresh rules" onClick={() => api.rules().then(setRules).catch((issue: unknown) => setError(issue instanceof Error ? issue.message : "Could not refresh token rules."))}><RefreshCw size={16} /></button><button className="help-button" onClick={() => setPage("docs")}><CircleHelp size={17} /><span>Help</span></button></div>
        </header>
        <div className="content-area">
          <AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            {page === "dashboard" && <Dashboard analysis={analysis ?? history[0]} history={history} onNavigate={setPage} onSelect={(item) => { setAnalysis(item); setSource(item.source); setPage("workbench"); }} />}
            {page === "workbench" && <div className="page-stack">
              <div className="page-title title-with-actions"><div><p className="eyebrow">SOURCE → TOKEN STREAM</p><h1>Lexer workbench</h1><p>Scan source code, inspect lexical diagnostics, and explore the rule automata.</p></div><div className="button-row"><button className="secondary-button" onClick={() => { setSource(SAMPLE); setAnalysis(undefined); }}><Sparkles size={15} />Sample</button>
                <input ref={fileInput} type="file" accept=".c,.h,.txt,.cpp,.java" hidden onChange={loadFile} /><button className="secondary-button" onClick={() => fileInput.current?.click()}><Upload size={15} />Upload</button>
                <div className="export-wrap"><button className="secondary-button" disabled={!analysis} onClick={() => setReportMenu(!reportMenu)}><ArrowDownToLine size={15} />Export <ChevronDown size={14} /></button>{reportMenu && <div className="export-menu">{(["json", "csv", "txt"] as const).map((format) => <button key={format} onClick={() => exportReport(format)}>{format.toUpperCase()}</button>)}</div>}</div>
                <button className="primary-button" disabled={running || loadingRules} onClick={runAnalysis}><Play size={15} fill="currentColor" />{running ? "Analyzing…" : "Analyze source"}</button></div></div>
              {error && <div className="notice-error"><AlertCircle size={16} />{error}</div>}
              <section className="panel editor-panel"><div className="editor-heading"><div className="file-tab"><FileCode2 size={15} /><span>main.c</span><span className="dirty-dot" /></div><div className="editor-meta"><span>C-like</span><span>UTF-8</span><button onClick={() => { setSource(""); setAnalysis(undefined); }}>Clear</button></div></div>
                <div className="editor-box"><Editor height="340px" language="c" theme="vs-dark" value={source} onChange={(value) => { setSource(value ?? ""); setAnalysis(undefined); }} onMount={(instance, monaco) => { editorRef.current = instance; monacoRef.current = monaco; setEditorMarkers(instance, monaco, analysis); }} options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 22, fontFamily: "'JetBrains Mono', Consolas, monospace", padding: { top: 14 }, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, renderLineHighlight: "gutter", lineNumbersMinChars: 3 }} /></div>
              </section>
              <div className="metric-grid compact-metrics">{[
                { label: "TOKENS FOUND", value: analysis?.statistics.total_tokens ?? "—", icon: ScanSearch, color: "mint" },
                { label: "VALID TOKENS", value: analysis?.statistics.valid_tokens ?? "—", icon: ShieldCheck, color: "blue" },
                { label: "LEXICAL ERRORS", value: analysis?.statistics.lexical_errors ?? "—", icon: AlertCircle, color: "rose" },
                { label: "LINES ANALYZED", value: analysis?.statistics.lines_analyzed ?? "—", icon: Terminal, color: "violet" },
              ].map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
              <section className="panel"><div className="panel-heading"><div><p className="eyebrow">LEXICAL OUTPUT</p><h2>Token stream</h2></div><span className="count-pill">{analysis?.tokens.length ?? 0} tokens</span></div><TokenTable tokens={analysis?.tokens ?? []} /></section>
              <section className="panel"><div className="panel-heading"><div><p className="eyebrow">DIAGNOSTICS</p><h2>Lexical errors</h2></div><span className={`count-pill ${analysis?.errors.length ? "error-pill" : ""}`}>{analysis?.errors.length ?? 0} errors</span></div><ErrorList errors={analysis?.errors ?? []} /></section>
              <AutomataForRules rules={rules} />
            </div>}
            {page === "rules" && <TokenRules rules={rules} onRulesChange={setRules} />}
            {page === "automata" && <AutomataWorkbench />}
            {page === "simulator" && <LexemeSimulator />}
            {page === "reports" && <Reports history={history} onExport={exportReport} onSelect={(item) => { setAnalysis(item); setSource(item.source); setPage("workbench"); }} />}
            {page === "docs" && <Documentation />}
          </motion.div></AnimatePresence>
          <footer className="app-footer"><span>MiniLex <b>·</b> Visual Lexical Analyzer</span><span>Built for Compiler Design Hackathon 2026 <i /> Engine operational</span></footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof ScanSearch; color: string }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Dashboard({ analysis, history, onNavigate, onSelect }: { analysis?: Analysis; history: Analysis[]; onNavigate: (page: Page) => void; onSelect: (item: Analysis) => void }) {
  const data = analysis ? Object.entries(analysis.statistics.distribution).map(([name, count]) => ({ name, count })) : [];
  return <div className="page-stack dashboard-page">
    <div className="welcome-row"><div><p className="eyebrow">FRIDAY, OCTOBER 30, 2026 <span className="eyebrow-dot" /> COMPILER DESIGN LAB</p><h1>Good morning, Developer <span className="wave">✦</span></h1><p>Your lexical analysis workspace is ready. Start by scanning a source file or inspect the token rules.</p></div><button className="primary-button" onClick={() => onNavigate("workbench")}><ScanSearch size={16} />Open workbench <ArrowRight size={15} /></button></div>
    <section className="hero-card"><div className="hero-grid-pattern" /><div className="hero-copy"><span className="hero-chip"><span className="status-dot" /> ENGINE ONLINE</span><h2>See your source<br />through a <em>lexical lens.</em></h2><p>Turn raw code into a structured token stream. Explore how patterns become states, and states become a working scanner.</p><button className="hero-button" onClick={() => onNavigate("workbench")}>Start a new analysis <ArrowRight size={15} /></button></div>
      <div className="hero-code"><div className="code-window-top"><span><i /><i /><i /></span><small>main.c · preview</small></div><pre><code><span className="code-purple">int</span> <span className="code-cyan">main</span>() {'{'}{"\n"}  <span className="code-purple">float</span> ratio = <span className="code-orange">3.14</span>;{"\n"}  <span className="code-purple">if</span> (ratio &gt; <span className="code-orange">0.0</span>) {'{'}{"\n"}    <span className="code-comment">// scan &amp; analyze</span>{"\n"}    <span className="code-cyan">return</span> <span className="code-orange">1</span>;{"\n"}  {'}'}{"\n"}{'}'}</code></pre><div className="hero-token-preview"><span>KEYWORD</span><code>float</code><span className="token-line">L2 : C3</span></div></div>
    </section>
    <div className="metric-grid">
      <MetricCard label="TOKENS IDENTIFIED" value={analysis?.statistics.total_tokens ?? "—"} icon={ScanSearch} color="mint" />
      <MetricCard label="VALID TOKENS" value={analysis?.statistics.valid_tokens ?? "—"} icon={ShieldCheck} color="blue" />
      <MetricCard label="LEXICAL ERRORS" value={analysis?.statistics.lexical_errors ?? "—"} icon={AlertCircle} color="rose" />
      <MetricCard label="LINES ANALYZED" value={analysis?.statistics.lines_analyzed ?? "—"} icon={FileCode2} color="violet" />
    </div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">LATEST ANALYSIS</p><h2>Token distribution</h2></div>{analysis && <span className="subtle-copy">{analysis.statistics.total_tokens} tokens</span>}</div>
        {data.length ? <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="#202a3a" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8290a8", fontSize: 11 }} interval={0} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64728a", fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={{ background: "#111a29", border: "1px solid #29364a", borderRadius: 8, color: "#eaf0fb" }} cursor={{ fill: "#1d293a" }} /><Bar dataKey="count" fill="#6fe0bd" radius={[4, 4, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div> : <div className="chart-empty"><div className="empty-chart-icon"><Gauge size={23} /></div><strong>Token statistics will appear here</strong><span>Run an analysis to visualize your token mix.</span><button className="text-button" onClick={() => onNavigate("workbench")}>Analyze source <ArrowRight size={14} /></button></div>}
      </section>
      <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Analysis history</h2></div><button className="text-button" onClick={() => onNavigate("reports")}>View all <ArrowRight size={14} /></button></div>
        {history.length ? <div className="history-list">{history.slice(0, 4).map((item) => <button className="history-item" key={item.id} onClick={() => onSelect(item)}><div className="history-file"><FileCode2 size={16} /></div><div className="history-info"><strong>Source analysis</strong><span>{new Date(item.timestamp).toLocaleString()}</span></div><div className="history-counts"><b>{item.statistics.total_tokens}</b><span>tokens</span></div><span className={`history-status ${item.errors.length ? "has-errors" : ""}`} /> </button>)}</div> : <div className="history-empty"><History size={22} /><span>No analyses yet</span></div>}
      </section>
    </div>
    <div className="quick-links"><button className="quick-card" onClick={() => onNavigate("rules")}><div className="quick-icon purple"><ListChecks size={18} /></div><div><strong>Configure token rules</strong><span>Customize the language's lexical patterns</span></div><ArrowRight size={16} /></button><button className="quick-card" onClick={() => onNavigate("automata")}><div className="quick-icon teal"><GitBranch size={18} /></div><div><strong>Explore automata</strong><span>Visualize NFA and DFA construction</span></div><ArrowRight size={16} /></button></div>
  </div>;
}

function AutomataForRules({ rules }: { rules: TokenRule[] }) {
  const [ruleId, setRuleId] = useState("");
  const [nfa, setNfa] = useState<Awaited<ReturnType<typeof api.nfa>>["nfa"]>();
  const [dfa, setDfa] = useState<Awaited<ReturnType<typeof api.dfa>>["dfa"]>();
  const [error, setError] = useState("");
  async function generate() {
    const selected = rules.find((rule) => rule.id === ruleId);
    if (!selected) return;
    try {
      const result = await api.dfa(selected.pattern);
      setNfa(result.nfa); setDfa(result.dfa); setError("");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Automata generation failed."); }
  }
  return <div className="page-stack"><section className="panel inline-automata"><div className="panel-heading"><div><p className="eyebrow">RULE INSPECTOR</p><h2>Explore a token rule</h2></div>
      <div className="inline-select"><select value={ruleId} onChange={(event) => setRuleId(event.target.value)}><option value="">Select a rule…</option>{rules.map((rule) => <option value={rule.id} key={rule.id}>{rule.name} · {rule.pattern}</option>)}</select><button className="secondary-button" disabled={!ruleId} onClick={generate}>Generate <ArrowRight size={14} /></button></div></div>
      {error && <div className="notice-error">{error}</div>}<AutomataPanel nfa={nfa} dfa={dfa} />
    </section></div>;
}

function Reports({ history, onExport, onSelect }: { history: Analysis[]; onExport: (format: "json" | "csv" | "txt", report?: Analysis) => void; onSelect: (analysis: Analysis) => void }) {
  return <div className="page-stack"><header className="page-title"><div><p className="eyebrow">SAVED ANALYSES</p><h1>Reports</h1><p>Review analysis summaries and export token reports as CSV, JSON, or plain text.</p></div></header>
    <section className="panel"><div className="panel-heading"><div><h2>Analysis history</h2><p className="subtle-copy">Recent analyses are stored in this browser.</p></div><span className="count-pill">{history.length} reports</span></div>
      {history.length ? <div className="table-wrap"><table><thead><tr><th>Report</th><th>Created</th><th>Tokens</th><th>Errors</th><th>Lines</th><th>Actions</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td><button className="report-link" onClick={() => onSelect(item)}><FileText size={15} />{item.id.slice(0, 8)}</button></td><td>{new Date(item.timestamp).toLocaleString()}</td><td>{item.statistics.total_tokens}</td><td><span className={item.errors.length ? "text-danger" : "text-success"}>{item.errors.length}</span></td><td>{item.statistics.lines_analyzed}</td><td><div className="row-actions">{(["json", "csv", "txt"] as const).map((format) => <button className="format-button" key={format} onClick={() => onExport(format, item)}>{format.toUpperCase()}</button>)}</div></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-chart-icon"><FileText size={22} /></div><strong>No reports yet</strong><span>Analyze source code in the workbench to create your first report.</span></div>}
    </section></div>;
}

function Documentation() {
  return <div className="page-stack"><header className="page-title"><div><p className="eyebrow">MINILEX REFERENCE</p><h1>Documentation</h1><p>A practical guide to the lexer engine and the automata behind it.</p></div></header>
    <div className="docs-grid"><section className="panel docs-nav"><p className="eyebrow">CONTENTS</p><a href="#lexer">Lexical analysis</a><a href="#matching">Longest match</a><a href="#regex">Regex syntax</a><a href="#nfa">Thompson construction</a><a href="#dfa">Subset construction</a><a href="#api">API reference</a><a href="#limits">Known limits</a></section>
      <article className="panel docs-content">
        <section id="lexer"><span className="docs-number">01</span><h2>Lexical analysis</h2><p>The scanner advances through source text from left to right. At each position it tests all configured token patterns, selects the longest match, and emits a token with its type, source line, column, and character offsets. Whitespace and rules marked as skipped are consumed without creating tokens.</p></section>
        <section id="matching"><span className="docs-number">02</span><h2>Maximal munch and priority</h2><p>When multiple rules match at the same position, MiniLex first chooses the match that consumes the most characters. If matches have equal length, the rule with the lower numeric priority wins. This makes multi-character operators such as <code>&gt;=</code> take precedence over <code>&gt;</code>.</p></section>
        <section id="regex"><span className="docs-number">03</span><h2>Regular expressions</h2><p>Automata generation supports literal characters, grouping <code>()</code>, alternation <code>|</code>, implicit concatenation, Kleene star <code>*</code>, plus <code>+</code>, optional <code>?</code>, character classes and ranges (such as <code>[a-z]</code>), common escapes (<code>\d</code>, <code>\w</code>, <code>\s</code>), and wildcard dot. Token-rule validation and scanning use Python's regular-expression engine.</p></section>
        <section id="nfa"><span className="docs-number">04</span><h2>Thompson's construction</h2><p>Each regex atom becomes a two-state NFA fragment. Concatenation links fragments with epsilon transitions; alternation adds a split and merge; star adds bypass and loop epsilon edges. Plus and optional are composed with the corresponding fragment connections. The result is a single-start, single-accept NFA.</p></section>
        <section id="dfa"><span className="docs-number">05</span><h2>Subset construction</h2><p>The DFA start state is the epsilon closure of the NFA start. For every DFA subset and input symbol, MiniLex finds reachable NFA states, computes their epsilon closure, and assigns the resulting subset a DFA state. A DFA state is accepting when its subset contains the NFA accept state.</p></section>
        <section id="api"><span className="docs-number">06</span><h2>API reference</h2><div className="api-list"><code>POST /api/lexer/analyze</code><code>GET, POST /api/token-rules</code><code>PUT, DELETE /api/token-rules/&#123;id&#125;</code><code>POST /api/automata/nfa</code><code>POST /api/automata/dfa</code><code>POST /api/automata/simulate</code><code>GET /api/reports/&#123;id&#125;</code></div></section>
        <section id="limits"><span className="docs-number">07</span><h2>Known limits</h2><p>Custom token rules are held in backend memory and reset when the server restarts. Analysis history is stored in the browser. The DFA alphabet is enumerated over ASCII plus any explicit regex characters; Unicode tokens can still be scanned by the lexer, but non-ASCII automata simulation is outside the current alphabet. Token regular expressions support Python syntax, while automata generation intentionally supports the documented subset.</p></section>
      </article>
    </div>
  </div>;
}
