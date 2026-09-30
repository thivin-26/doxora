import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Users, Globe, Clock, Download, RefreshCw, ArrowLeft, Monitor, 
  Smartphone, Tablet, Shield, Search, ExternalLink, Activity, Crown,
  CheckCircle2, Copy, Trash2, Mail, UserCheck, Lock, ArrowRight
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function VisitorAnalytics() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [actionNotice, setActionNotice] = useState("");

  const fetchStats = async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getVisitorStats(200);
      const s = data.stats || data;
      setStats(s);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load visitor statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL visitor tracking records from the database?")) return;
    try {
      await api.clearAllVisitors();
      setActionNotice("All visitor records deleted successfully.");
      setTimeout(() => setActionNotice(""), 3000);
      fetchStats();
    } catch (err) {
      alert("Failed to delete visitors: " + err.message);
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await api.deleteVisitorRecord(id);
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_visits: Math.max(0, prev.total_visits - 1),
          recent_visits: prev.recent_visits.filter((v) => v.id !== id),
        };
      });
    } catch (err) {
      alert("Failed to delete record: " + err.message);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!autoRefresh || !isOwner) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 12000); // refresh every 12 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, isOwner]);

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredVisits = (stats?.recent_visits || []).filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (v.user_email && v.user_email.toLowerCase().includes(q)) ||
      (v.user_name && v.user_name.toLowerCase().includes(q)) ||
      (v.auth_provider && v.auth_provider.toLowerCase().includes(q)) ||
      (v.ip_address && v.ip_address.toLowerCase().includes(q)) ||
      (v.visitor_id && v.visitor_id.toLowerCase().includes(q)) ||
      (v.browser && v.browser.toLowerCase().includes(q)) ||
      (v.os && v.os.toLowerCase().includes(q)) ||
      (v.path && v.path.toLowerCase().includes(q))
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink-950 text-white flex items-center justify-center">
        <div className="animate-spin text-amber-400">
          <Crown size={32} />
        </div>
      </div>
    );
  }

  // Access Restriction for non-owners
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-ink-950 text-white flex flex-col font-sans relative overflow-hidden">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto w-full px-5 flex flex-col items-center justify-center text-center pt-28 pb-20 z-10">
          <div className="relative group mb-6">
            <div className="absolute -inset-3 rounded-full bg-radial-gradient from-amber-400/30 to-transparent blur-2xl" />
            <div className="relative h-18 w-18 rounded-2xl bg-ink-900/90 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(247,210,104,0.25)]">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2 tracking-wide">
            Owner Database Only
          </h1>
          <p className="text-xs text-ink-300 mb-8 leading-relaxed max-w-sm">
            This visitor intelligence telemetry is private and accessible exclusively to the verified website owner.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Link
              to="/login"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-ink-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition shadow-[0_0_20px_rgba(247,210,104,0.3)] text-center flex items-center justify-center gap-2"
            >
              Sign In as Website Owner <ArrowRight size={14} />
            </Link>
            <Link
              to="/"
              className="text-xs text-ink-400 hover:text-amber-300 transition-colors py-2 text-center"
            >
              ← Return to Doxora Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-8 pt-28 pb-20">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-amber-300 transition-colors bg-ink-900/60 border border-amber-400/20 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
            <span className="text-ink-600">/</span>
            <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
              Visitor Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                  : "bg-ink-900 border-white/10 text-ink-400 hover:text-white"
              }`}
            >
              <Activity size={13} className={autoRefresh ? "animate-pulse" : ""} />
              {autoRefresh ? "Live Sync (12s)" : "Paused"}
            </button>

            <button
              onClick={fetchStats}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-ink-900/80 border border-amber-400/20 text-ink-300 hover:text-amber-300 hover:border-amber-400/40 transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-400/30 text-red-300 hover:bg-red-500/25 hover:border-red-400/60 transition-all cursor-pointer"
              title="Delete all visitor tracking records"
            >
              <Trash2 size={13} />
              Purge Database
            </button>

            <a
              href={api.exportVisitorsUrl}
              download="doxora_visitors_database.csv"
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 text-ink-950 font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(247,210,104,0.3)] hover:brightness-110 transition cursor-pointer"
            >
              <Download size={14} />
              Export CSV
            </a>
          </div>
        </div>

        {actionNotice && (
          <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between animate-fade-in">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice("")} className="text-emerald-300 hover:text-white">✕</button>
          </div>
        )}

        {/* Page Title & Royal Badge */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-3.5 py-1 text-xs text-amber-200 mb-3 shadow-[0_0_20px_rgba(247,210,104,0.2)]">
            <Crown size={14} className="text-amber-400" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Doxora Persistent Visitor Database
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-gold-royal tracking-wide">
            Visitor Intelligence
          </h1>
          <p className="mt-2 text-ink-400 text-sm max-w-2xl">
            Real-time telemetry and identity database of everyone visiting Doxora.
            Tracks verified Google accounts, registered emails, IP addresses, devices, and paths visited.
          </p>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Total Visits */}
          <div className="rounded-2xl border border-amber-400/25 bg-ink-900/80 backdrop-blur-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="absolute top-0 right-0 h-20 w-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-ink-400 font-medium">Total Visits</span>
              <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400">
                <Globe size={16} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-white tracking-tight">
              {loading ? "..." : (stats?.total_visits ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-amber-400/80 mt-1 inline-block">All-time page views</span>
          </div>

          {/* Unique Visitors */}
          <div className="rounded-2xl border border-amber-400/25 bg-ink-900/80 backdrop-blur-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="absolute top-0 right-0 h-20 w-20 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-ink-400 font-medium">Unique Devices</span>
              <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-300">
                <Users size={16} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-gold-royal tracking-tight">
              {loading ? "..." : (stats?.unique_visitors ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-yellow-300/80 mt-1 inline-block">Unique client devices</span>
          </div>

          {/* Logged-in Accounts */}
          <div className="rounded-2xl border border-amber-400/25 bg-ink-900/80 backdrop-blur-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-ink-400 font-medium">Identified Users</span>
              <div className="p-2 rounded-lg bg-emerald-400/10 text-emerald-300">
                <UserCheck size={16} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-emerald-300 tracking-tight">
              {loading ? "..." : (stats?.unique_accounts ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-emerald-400/80 mt-1 inline-block">Google & Email Accounts</span>
          </div>

          {/* Last 24 Hours */}
          <div className="rounded-2xl border border-amber-400/25 bg-ink-900/80 backdrop-blur-xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.6)] relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="absolute top-0 right-0 h-20 w-20 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-ink-400 font-medium">Today's Visits</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-white tracking-tight">
              {loading ? "..." : (stats?.today_visits ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-amber-400/80 mt-1 inline-block">Past 24 hours</span>
          </div>
        </div>

        {/* Real-Time Visitor Stream Table */}
        <div className="rounded-3xl border border-amber-400/30 bg-ink-900/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-amber-400" />
                Live Visitor Log Database
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Showing the most recent {filteredVisits.length} visits recorded in the database
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search Account, IP, browser, or path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-ink-950/80 border border-white/10 text-xs text-white placeholder-ink-400 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {/* Table Viewport */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-ink-950/50 text-ink-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Account / User</th>
                  <th className="py-3 px-4">Visitor UUID</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Device / OS</th>
                  <th className="py-3 px-4">Browser</th>
                  <th className="py-3 px-4">Path Visited</th>
                  <th className="py-3 px-4">Referrer</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-ink-400">
                      {loading ? "Fetching visitor records..." : "No visitor records in the database."}
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-400/5 transition-colors group">
                      {/* Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-amber-300 font-medium">{formatTimeAgo(v.visited_at)}</span>
                        <p className="text-[10px] text-ink-400">
                          {new Date(v.visited_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </td>

                      {/* Account / User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {v.user_email ? (
                          <div className="flex items-center gap-2">
                            {v.auth_provider === "Google Account" ? (
                              <div className="p-1 rounded-md bg-white/10 shrink-0" title="Google Account">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="p-1 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0" title="Email Account">
                                <Mail size={13} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-xs leading-tight truncate max-w-[140px]">
                                {v.user_name || v.user_email.split("@")[0]}
                              </p>
                              <p className="text-[10px] text-amber-300/90 font-mono truncate max-w-[140px]">
                                {v.user_email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-950/80 border border-white/10 text-ink-400 text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
                            Guest / Anonymous
                          </span>
                        )}
                      </td>

                      {/* Visitor UUID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <button
                          onClick={() => copyToClipboard(v.visitor_id, v.id)}
                          className="flex items-center gap-1.5 text-ink-300 hover:text-amber-300 transition-colors cursor-pointer"
                          title="Click to copy UUID"
                        >
                          <span className="max-w-[90px] truncate">{v.visitor_id}</span>
                          {copiedId === v.id ? (
                            <CheckCircle2 size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-ink-950 border border-white/10 font-mono text-[11px] text-ink-200">
                          {v.ip_address}
                        </span>
                      </td>

                      {/* Device & OS */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {v.device === "Mobile" ? (
                            <Smartphone size={13} className="text-amber-400" />
                          ) : v.device === "Tablet" ? (
                            <Tablet size={13} className="text-amber-400" />
                          ) : (
                            <Monitor size={13} className="text-amber-400" />
                          )}
                          <span className="text-white font-medium">{v.os}</span>
                          <span className="text-[10px] text-ink-400">({v.device})</span>
                        </div>
                      </td>

                      {/* Browser */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px]">
                          {v.browser}
                        </span>
                      </td>

                      {/* Path Visited */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-ink-200">
                        <span className="text-amber-200 font-semibold">{v.path}</span>
                      </td>

                      {/* Referrer */}
                      <td className="py-3 px-4 whitespace-nowrap text-ink-400 text-[11px] max-w-[120px] truncate" title={v.referrer}>
                        {v.referrer || "Direct"}
                      </td>

                      {/* Language */}
                      <td className="py-3 px-4 whitespace-nowrap text-ink-400 text-[11px]">
                        {v.language || "en"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteRecord(v.id)}
                          className="p-1 rounded-md text-ink-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete this visit record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer of Table */}
          <div className="p-4 border-t border-white/5 bg-ink-950/60 flex items-center justify-between text-xs text-ink-400">
            <span>Last synced at {lastUpdated.toLocaleTimeString()}</span>
            <span>Total records in database: {stats?.total_visits || 0}</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
