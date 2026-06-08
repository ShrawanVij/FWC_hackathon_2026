import BulkScreening from "./BulkScreening";
import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { jobsAPI, interviewAPI, aiAPI, hrAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./HRDashboard.module.css";
import * as XLSX from "xlsx";
import {
  Briefcase, Users, Sparkles, Calendar, Search, Rocket,
  Trophy, TrendingUp, Activity, Zap, Target, FileText,
  ArrowRight, ExternalLink, Trash, Plus, AlertTriangle, Eye,
} from "./Icons";

function StatCard({ iconEl, label, value, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIconBox} style={{ background: `${color}14`, color }}>
        {iconEl}
      </div>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ jobs, interviews, onTabChange }) {
  const totalApplicants = jobs.reduce((s, j) => s + j.applicants.length, 0);
  const shortlisted = jobs.reduce((s, j) => s + j.applicants.filter((a) => a.status === "shortlisted").length, 0);

  return (
    <div className={styles.section}>
      <div className={styles.statsRow}>
        <StatCard iconEl={<Briefcase size={18} />} label="Jobs Posted"      value={jobs.length}       color="var(--hr-accent)" />
        <StatCard iconEl={<Users size={18} />}     label="Total Applicants" value={totalApplicants}   color="#0891b2" />
        <StatCard iconEl={<Trophy size={18} />}    label="Shortlisted"      value={shortlisted}       color="#059669" />
        <StatCard iconEl={<Calendar size={18} />}  label="Interviews"       value={interviews.length} color="#7c3aed" />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recent Job Posts</h3>
          {jobs.slice(0, 4).length === 0
            ? <p className={styles.empty}>No jobs posted yet. <button className={styles.inlineBtn} onClick={() => onTabChange("post-job")}>Post one <ArrowRight size={12}/></button></p>
            : jobs.slice(0, 4).map((j) => (
              <div key={j._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{j.title}</div>
                  <div className={styles.itemSub}>{j.applicants.length} applicants · {j.company}</div>
                </div>
                <span className={`${styles.badge} ${j.isActive ? styles.active : styles.inactive}`}>{j.isActive ? "Active" : "Closed"}</span>
              </div>
            ))
          }
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Upcoming Interviews</h3>
          {interviews.slice(0, 4).length === 0
            ? <p className={styles.empty}>No interviews scheduled.</p>
            : interviews.slice(0, 4).map((iv) => (
              <div key={iv._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{iv.candidate?.fullName || iv.candidate?.email}</div>
                  <div className={styles.itemSub}>{iv.job?.title} · {new Date(iv.scheduledAt).toLocaleDateString()}</div>
                </div>
                <span className={`${styles.badge} ${styles[iv.status]}`}>{iv.status}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Post Job ──────────────────────────────────────────────────────────────────
function PostJob({ onPosted }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", company: user?.companyId || "", description: "", skills: "", requirements: "", location: "Remote", salaryRange: "", type: "full-time" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.description) { showErr("Title and description are required"); return; }
    setLoading(true);
    try {
      await jobsAPI.create({
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess(true);
      onPosted?.();
    } catch (e) { showErr(e.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className={styles.section}>
      <div className={styles.card} style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ color: "var(--color-success)", marginBottom: 12, display: "flex", justifyContent: "center" }}><Trophy size={40} /></div>
        <h3 className={styles.sectionTitle}>Job posted successfully</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>Your listing is now live for candidates to discover.</p>
        <button className={styles.primaryBtn} style={{ marginTop: 20 }} onClick={() => setSuccess(false)}>Post Another Job</button>
      </div>
    </div>
  );

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 680 }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 20 }}>Post a New Job</h2>
        <div className={styles.formGroup}><label className={styles.label}>Job Title *</label><input className={styles.input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Frontend Developer" /></div>
        <div className={styles.formGroup}><label className={styles.label}>Company *</label><input className={styles.input} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" /></div>
        <div className={styles.formGroup}><label className={styles.label}>Description *</label><textarea className={styles.textarea} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the role and responsibilities..." /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className={styles.formGroup}><label className={styles.label}>Skills (comma separated)</label><input className={styles.input} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, Node.js, MongoDB" /></div>
          <div className={styles.formGroup}><label className={styles.label}>Requirements (comma separated)</label><input className={styles.input} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="3+ years, Bachelor's degree" /></div>
          <div className={styles.formGroup}><label className={styles.label}>Location</label><input className={styles.input} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Remote, Mumbai, etc." /></div>
          <div className={styles.formGroup}><label className={styles.label}>Salary Range</label><input className={styles.input} value={form.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} placeholder="₹10–15 LPA" /></div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Employment Type</label>
            <select className={styles.input} value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
        </div>
        {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginTop: 10 }}>{err}</div>}
        <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Posting…" : "Post Job"}</button>
      </div>
    </div>
  );
}

// ── My Jobs ───────────────────────────────────────────────────────────────────
function MyJobs({ jobs, loading, onDelete }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>My Jobs</h2>
      {loading ? <div className={styles.loading}>Loading jobs…</div> : jobs.length === 0
        ? <div className={styles.empty}>No jobs posted yet.</div>
        : jobs.map((j) => (
          <div key={j._id} className={styles.jobRow}>
            <div className={styles.jobRowLeft}>
              <div className={styles.jobTitle}>{j.title}</div>
              <div className={styles.jobMeta}>{j.company} · {j.location} · {j.type}</div>
              <div className={styles.skillTags}>{j.skills?.slice(0, 5).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}</div>
            </div>
            <div className={styles.jobRowRight}>
              <span className={`${styles.badge} ${j.isActive ? styles.active : styles.inactive}`}>{j.isActive ? "Active" : "Closed"}</span>
              <span className={styles.itemSub}>{j.applicants.length} applicant{j.applicants.length !== 1 ? "s" : ""}</span>
              <button className={styles.dangerBtn} onClick={() => onDelete(j._id)} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Trash size={12} /> Remove
              </button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Pentagon Radar Chart ──────────────────────────────────────────────────────
function PentagonChart({ values, labels, color = "var(--hr-accent)", size = 220 }) {
  const N = values.length;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.38;
  const angleOffset = -Math.PI / 2;
  const point = (i, r) => {
    const a = angleOffset + (2 * Math.PI * i) / N;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = values.map((v, i) => point(i, R * Math.min(v / 100, 1)));
  const polyPts = dataPoints.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {rings.map((r) => (
        <polygon key={r}
          points={Array.from({ length: N }, (_, i) => point(i, R * r).join(",")).join(" ")}
          fill="none" stroke="var(--border)" strokeWidth="1" />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />;
      })}
      <polygon points={polyPts} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={color} stroke="white" strokeWidth="1.5" />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, R + 22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="var(--text-muted)" fontFamily="inherit">
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

// ── Candidate Detail Modal ────────────────────────────────────────────────────
function CandidateModal({ applicant, onClose }) {
  const c = applicant.candidate;
  const scoreColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const aiScore   = applicant.aiScore        ?? 0;
  const readiness = c?.roleReadinessScore    ?? 0;
  const skills    = Math.min((c?.skills?.length || 0) * 10, 100);
  const resume    = c?.resumeUrl || c?.resumeText ? 80 : 20;
  const appScore  = applicant.status === "hired" ? 100 : applicant.status === "shortlisted" ? 90 : applicant.status === "reviewed" ? 60 : 40;
  const radarValues = [aiScore, readiness, skills, resume, appScore];
  const radarLabels = ["AI Score", "Readiness", "Skills", "Resume", "Status"];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.candidateModal} onClick={(e) => e.stopPropagation()}>

        {/* Fixed header — never scrolls */}
        <div className={styles.candidateModalHeader}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={styles.candidateModalName}>{c?.fullName || c?.email}</div>
            <div className={styles.analysisSub}>{c?.email} · {applicant.jobTitle}</div>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose}>Close</button>
        </div>

        {/* Scrollable body */}
        <div className={styles.candidateModalBody}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, paddingTop: 8 }}>
            <PentagonChart values={radarValues} labels={radarLabels} color="var(--hr-accent)" size={220} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
            {[{ label: "AI Score", val: applicant.aiScore }, { label: "Readiness", val: c?.roleReadinessScore }].map(({ label, val }) =>
              val != null && (
                <div key={label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(val) }}>{val}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                </div>
              )
            )}
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--hr-accent)" }}>{c?.skills?.length || 0}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Skills</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
            <span className={`${styles.badge} ${styles[applicant.status]}`}>{applicant.status}</span>
            {applicant.aiSummary && <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, flex: 1 }}>{applicant.aiSummary}</p>}
          </div>

          {c?.skills?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className={styles.analysisSectionLabel}>Skills</div>
              <div className={styles.skillTags}>{c.skills.map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}</div>
            </div>
          )}

          {c?.resumeUrl && (
            <a href={c.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <FileText size={12} /> View Resume <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Candidates ────────────────────────────────────────────────────────────────
function Candidates({ jobs }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };

  const all = jobs.flatMap((j) =>
    j.applicants.map((a) => ({ ...a, jobTitle: j.title, jobId: j._id }))
  );
  const filtered = all.filter((a) =>
    (a.candidate?.fullName || a.candidate?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (a) => statusOverrides[`${a.jobId}-${a.candidate?._id}`] ?? a.status;

  const updateStatus = async (e, a, newStatus) => {
    e.stopPropagation();
    const key = `${a.jobId}-${a.candidate?._id}`;
    setStatusUpdating(key);
    try {
      await jobsAPI.updateApplicantStatus(a.jobId, a.candidate._id, newStatus);
      setStatusOverrides((prev) => ({ ...prev, [key]: newStatus }));
    } catch (err) { showErr(err.message); }
    finally { setStatusUpdating(null); }
  };

  return (
    <div className={styles.section}>
      {selected && <CandidateModal applicant={selected} onClose={() => setSelected(null)} />}
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div className={styles.searchBar}>
        <Search size={15} />
        <input className={styles.searchInput} placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Applied For</th>
              <th>Skills</th>
              <th>Status</th>
              <th>AI Score</th>
              <th>Resume</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const key = `${a.jobId}-${a.candidate?._id}`;
              const status = getStatus(a);
              return (
                <tr key={i} className={styles.clickableRow} onClick={() => setSelected(a)}>
                  <td className={styles.bold}>{a.candidate?.fullName || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.candidate?.email}</td>
                  <td>{a.jobTitle}</td>
                  <td>
                    <div className={styles.skillTags}>
                      {a.candidate?.skills?.slice(0, 3).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={status}
                      disabled={statusUpdating === key}
                      onChange={(e) => updateStatus(e, a, e.target.value)}
                      style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer" }}
                    >
                      {["applied","reviewed","shortlisted","rejected","hired"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{a.aiScore != null ? <span className={styles.aiScore}>{a.aiScore}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>{a.candidate?.resumeUrl ? <a href={a.candidate.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn} onClick={(e) => e.stopPropagation()}>View <ExternalLink size={10}/></a> : "—"}</td>
                  <td>
                    <button className={styles.viewAnalysisBtn} style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={(e) => { e.stopPropagation(); setSelected(a); }}>
                      <Eye size={12} /> Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No candidates found.</p>}
      </div>
    </div>
  );
}

// ── Schedule Interview ────────────────────────────────────────────────────────
function ScheduleInterview({ jobs, onScheduled }) {
  const [form, setForm] = useState({ candidateId: "", jobId: "", scheduledAt: "", mode: "online", meetLink: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const candidatesForJob = (jobId) => {
    const job = jobs.find((j) => j._id === jobId);
    return job?.applicants?.filter((a) => a.candidate) || [];
  };

  const submit = async () => {
    if (!form.candidateId || !form.jobId || !form.scheduledAt) { showErr("Candidate, job, and date are required"); return; }
    setLoading(true);
    try {
      await interviewAPI.schedule({ candidateId: form.candidateId, jobId: form.jobId, scheduledAt: form.scheduledAt, mode: form.mode, meetLink: form.meetLink, notes: form.notes });
      setSuccess(true);
      onScheduled?.();
    } catch (e) { showErr(e.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className={styles.section}>
      <div className={styles.card} style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ color: "var(--color-success)", marginBottom: 12, display: "flex", justifyContent: "center" }}><Calendar size={40} /></div>
        <h3 className={styles.sectionTitle}>Interview scheduled</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>The candidate will be notified about their upcoming interview.</p>
        <button className={styles.primaryBtn} style={{ marginTop: 20 }} onClick={() => { setSuccess(false); setForm({ candidateId: "", jobId: "", scheduledAt: "", mode: "online", meetLink: "", notes: "" }); }}>Schedule Another</button>
      </div>
    </div>
  );

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 580 }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 20 }}>Schedule an Interview</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>Select Job *</label>
          <select className={styles.input} value={form.jobId} onChange={(e) => { set("jobId", e.target.value); set("candidateId", ""); }}>
            <option value="">— Select a job —</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
        </div>
        {form.jobId && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Candidate *</label>
            <select className={styles.input} value={form.candidateId} onChange={(e) => set("candidateId", e.target.value)}>
              <option value="">— Select a candidate —</option>
              {candidatesForJob(form.jobId).map((a) => <option key={a.candidate._id} value={a.candidate._id}>{a.candidate.fullName || a.candidate.email}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className={styles.formGroup}><label className={styles.label}>Date & Time *</label><input className={styles.input} type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} /></div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <select className={styles.input} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              <option value="online">Online</option>
              <option value="in-person">In-Person</option>
              <option value="phone">Phone</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}><label className={styles.label}>Meet Link (optional)</label><input className={styles.input} value={form.meetLink} onChange={(e) => set("meetLink", e.target.value)} placeholder="https://meet.google.com/..." /></div>
        <div className={styles.formGroup}><label className={styles.label}>Notes (optional)</label><textarea className={styles.textarea} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Interview agenda or instructions..." /></div>
        {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Scheduling…" : "Schedule Interview"}</button>
      </div>
    </div>
  );
}

// ── HR Interviews List ────────────────────────────────────────────────────────
function HRInterviews({ interviews, onRefresh }) {
  const [evaluating, setEvaluating] = useState(null);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };
  const recColor = { hire: "var(--color-success)", consider: "var(--color-warning)", pass: "var(--color-error)" };

  const updateStatus = async (id, status) => {
    try { await interviewAPI.updateStatus(id, status); onRefresh(); }
    catch (e) { showErr(e.message); }
  };

  const evaluate = async (id) => {
    setEvaluating(id);
    try { await aiAPI.evaluateInterview(id); onRefresh(); }
    catch (e) { showErr(e.message); }
    finally { setEvaluating(null); }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Scheduled Interviews</h2>
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {interviews.length === 0
        ? <p className={styles.empty}>No interviews scheduled yet.</p>
        : interviews.map((iv) => (
          <div key={iv._id} className={styles.card} style={{ marginBottom: 12 }}>
            <div className={styles.listItem} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <div className={styles.itemTitle}>{iv.candidate?.fullName || iv.candidate?.email}</div>
                <div className={styles.itemSub}>{iv.job?.title} · {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode}</div>
                {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" className={styles.inlineBtn} style={{ marginTop: 4 }}>Join Call <ExternalLink size={11}/></a>}
              </div>
              <span className={`${styles.badge} ${styles[iv.status]}`}>{iv.status}</span>
            </div>

            {iv.mockScore != null && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span className={styles.itemSub}>Overall <strong style={{ color: "var(--text-primary)" }}>{iv.mockScore}/100</strong></span>
                {iv.technicalScore     != null && <span className={styles.itemSub}>Technical <strong style={{ color: "var(--text-primary)" }}>{iv.technicalScore}/100</strong></span>}
                {iv.communicationScore != null && <span className={styles.itemSub}>Communication <strong style={{ color: "var(--text-primary)" }}>{iv.communicationScore}/100</strong></span>}
                {iv.recommendation && (
                  <span className={`${styles.badge} ${iv.recommendation === "hire" ? styles.shortlisted : iv.recommendation === "consider" ? styles.reviewed : styles.rejected}`}>
                    {iv.recommendation}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {iv.status === "scheduled" && (
                <>
                  <button className={styles.secBtn} style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => updateStatus(iv._id, "completed")}>Mark Completed</button>
                  <button className={styles.dangerBtn} onClick={() => updateStatus(iv._id, "cancelled")}>Cancel</button>
                </>
              )}
              {iv.status === "completed" && iv.mockScore == null && (
                <button className={styles.aiBtn} onClick={() => evaluate(iv._id)} disabled={evaluating === iv._id}>
                  <Sparkles size={14} /> {evaluating === iv._id ? "Evaluating…" : "AI Evaluate"}
                </button>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── AI Ranking ────────────────────────────────────────────────────────────────
function AIRanking({ jobs }) {
  const [selectedJob, setSelectedJob] = useState("");
  const [topN, setTopN] = useState("");
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState(null);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };

  const scoreColor = (s) => (s ?? 0) >= 80 ? "#22c55e" : (s ?? 0) >= 60 ? "#f59e0b" : "#ef4444";

  const run = async () => {
    if (!selectedJob) { showErr("Select a job first"); return; }
    setLoading(true);
    try {
      const d = await aiAPI.rankCandidates(selectedJob, topN ? parseInt(topN) : undefined);
      setRankings(d.rankings);
    } catch (e) { showErr(e.message); }
    finally { setLoading(false); }
  };

  const exportXLSX = () => {
    if (!rankings) return;
    const job = jobs.find((j) => j._id === selectedJob);
    const jobLabel = job?.title || "Candidates";
    const rows = rankings.map((r, i) => ({
      "Rank":                       i + 1,
      "Full Name":                  r.name,
      "Email":                      r.email || "",
      "Phone":                      r.phone || "",
      "Skills":                     r.skills || "",
      "Resume URL":                 r.resumeUrl || "",
      "Overall Score":              r.score,
      "Skill Match":                r.factors?.skillMatch ?? "",
      "Relevant Experience":        r.factors?.relevantExperience ?? "",
      "Education Qualification":    r.factors?.educationQualification ?? "",
      "Certifications":             r.factors?.certifications ?? "",
      "Industry Experience":        r.factors?.industryExperience ?? "",
      "Project Experience":         r.factors?.projectExperience ?? "",
      "Technical Competency":       r.factors?.technicalCompetency ?? "",
      "Domain Knowledge":           r.factors?.domainKnowledge ?? "",
      "Role Relevance":             r.factors?.roleRelevance ?? "",
      "Achievements & Impact":      r.factors?.achievementsImpact ?? "",
      "Career Stability":           r.factors?.careerStability ?? "",
      "Communication & Resume":     r.factors?.communicationResumeQuality ?? "",
      "Leadership Experience":      r.factors?.leadershipExperience ?? "",
      "Learning Agility":           r.factors?.learningAgility ?? "",
      "Strengths":                  r.strengths?.join("; ") ?? "",
      "Gaps":                       r.gaps?.join("; ") ?? "",
      "AI Summary":                 r.summary ?? "",
      "Applied For":                jobLabel,
      "Company":                    job?.company || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 35 }, { wch: 14 },
      ...Array(14).fill({ wch: 16 }),
      { wch: 40 }, { wch: 40 }, { wch: 60 }, { wch: 22 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Screening");
    XLSX.writeFile(wb, `AI_Screening_${jobLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className={styles.section}>
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>AI Resume Screening</h2>
        <p className={styles.cardSub}>Select a job and run AI analysis to rank all applicants across 14 professional dimensions.</p>
        <div className={styles.rankControls}>
          <select className={styles.input} style={{ maxWidth: 280 }} value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
            <option value="">— Select a job —</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} ({j.applicants.length} applicants)</option>)}
          </select>
          <input className={styles.input} style={{ maxWidth: 100 }} type="number" placeholder="Top N" min={1} value={topN} onChange={(e) => setTopN(e.target.value)} />
          <button className={styles.aiBtn} onClick={run} disabled={loading}>
            <Sparkles size={14} /> {loading ? "Analyzing…" : "Run AI Ranking"}
          </button>
          {rankings && <button className={styles.secBtn} onClick={exportXLSX}>Export XLSX</button>}
        </div>
      </div>

      {rankings && (
        <div className={styles.rankList}>
          {rankings.map((r, i) => (
            <div key={r.id} className={styles.rankCard}>
              <div className={styles.rankPosition}>#{i + 1}</div>
              <div className={styles.rankInfo}>
                <div className={styles.rankName}>{r.name}</div>
                <div className={styles.rankSummary}>{r.summary}</div>

                {r.factors && (
                  <div style={{ margin: "12px 0" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 8 }}>
                      14-Factor Analysis
                    </div>
                    <div className={styles.rankDetails}>
                      {[
                        ["Skill Match",            r.factors.skillMatch],
                        ["Relevant Experience",    r.factors.relevantExperience],
                        ["Education",              r.factors.educationQualification],
                        ["Certifications",         r.factors.certifications],
                        ["Industry Experience",    r.factors.industryExperience],
                        ["Project Experience",     r.factors.projectExperience],
                        ["Technical Competency",   r.factors.technicalCompetency],
                        ["Domain Knowledge",       r.factors.domainKnowledge],
                        ["Role Relevance",         r.factors.roleRelevance],
                        ["Achievements & Impact",  r.factors.achievementsImpact],
                        ["Career Stability",       r.factors.careerStability],
                        ["Communication & Resume", r.factors.communicationResumeQuality],
                        ["Leadership Experience",  r.factors.leadershipExperience],
                        ["Learning Agility",       r.factors.learningAgility],
                      ].map(([label, val]) => (
                        <div key={label} className={styles.factorRow}>
                          <div className={styles.factorLabel}>
                            <span>{label}</span>
                            <span style={{ color: scoreColor(val), fontWeight: 600 }}>{val ?? "—"}</span>
                          </div>
                          <div className={styles.factorBar}>
                            <div className={styles.factorFill} style={{ width: `${val ?? 0}%`, background: scoreColor(val) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(r.strengths?.length > 0 || r.gaps?.length > 0) && (
                  <div className={styles.rankDetails} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    {r.strengths?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-success)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Strengths</div>
                        {r.strengths.map((s, j) => <div key={j} className={styles.strengthItem}>• {s}</div>)}
                      </div>
                    )}
                    {r.gaps?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-error)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Gaps</div>
                        {r.gaps.map((g, j) => <div key={j} className={styles.gapItem}>• {g}</div>)}
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.rankMeta}>
                  {r.email    && <span className={styles.rankMetaItem}>{r.email}</span>}
                  {r.phone    && <span className={styles.rankMetaItem}>{r.phone}</span>}
                  {r.resumeUrl && <a href={r.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn}>Resume <ExternalLink size={11}/></a>}
                </div>
              </div>
              <div className={styles.rankScore} style={{ color: scoreColor(r.score) }}>
                {r.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Onboarding Detail Modal ───────────────────────────────────────────────────
function OnboardingDetailModal({ candidate, onClose }) {
  const plan = candidate.onboardingPlan || {};
  const readinessColor = (candidate.roleReadinessScore ?? 0) >= 80 ? "var(--color-success)" : (candidate.roleReadinessScore ?? 0) >= 60 ? "var(--color-warning)" : "var(--color-error)";
  const docs = candidate.onboardingDocs || [];

  const Section = ({ title, items }) =>
    items?.length > 0 ? (
      <div className={styles.obSection}>
        <div className={styles.obSectionLabel}>{title}</div>
        <ul className={styles.obList}>
          {items.map((item, i) => <li key={i} className={styles.obListItem}>{item}</li>)}
        </ul>
      </div>
    ) : null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.onboardingModal} onClick={(e) => e.stopPropagation()}>

        {/* Fixed header */}
        <div className={styles.obHeader}>
          <div className={styles.obHeaderLeft}>
            <div className={styles.obName}>{candidate.fullName || candidate.email}</div>
            <div className={styles.obEmail}>{candidate.email}</div>
          </div>
          <div className={styles.obHeaderRight}>
            {candidate.roleReadinessScore != null && (
              <div className={styles.obReadinessBadge} style={{ color: readinessColor }}>
                <span className={styles.obReadinessScore}>{candidate.roleReadinessScore}</span>
                <span className={styles.obReadinessLabel}>Readiness</span>
              </div>
            )}
            <button className={styles.modalCloseBtn} onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={styles.obBody}>
          {plan.welcomeMessage && (
            <div className={styles.obWelcome}>{plan.welcomeMessage}</div>
          )}

          <div className={styles.obGrid2}>
            <Section title="Day 1 Checklist" items={plan.day1Checklist} />
            <Section title="Week 1 Goals" items={plan.week1Goals} />
          </div>

          <div className={styles.obGrid3}>
            <Section title="30-Day Goals" items={plan.day30Goals} />
            <Section title="60-Day Goals" items={plan.day60Goals} />
            <Section title="90-Day Goals" items={plan.day90Goals} />
          </div>

          {plan.skillsToLearn?.length > 0 && (
            <div className={styles.obSection}>
              <div className={styles.obSectionLabel}>Skills to Learn</div>
              <div className={styles.obSkillRows}>
                {plan.skillsToLearn.map((s, i) => (
                  <div key={i} className={styles.obSkillRow}>
                    <span className={styles.obSkillName}>{s.skill}</span>
                    <span className={`${styles.badge} ${s.priority === "high" ? styles.shortlisted : s.priority === "medium" ? styles.reviewed : styles.applied}`}>{s.priority}</span>
                    {s.resource && <span className={styles.obSkillResource}>{s.resource}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.obGrid2}>
            <Section title="Strengths" items={plan.strengths} />
            <Section title="Areas to Grow" items={plan.areasToGrow} />
          </div>

          <Section title="Team Integration Tips" items={plan.teamIntegrationTips} />

          {candidate.skills?.length > 0 && (
            <div className={styles.obSection}>
              <div className={styles.obSectionLabel}>Skills</div>
              <div className={styles.skillTags}>
                {candidate.skills.map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
              </div>
            </div>
          )}

          {/* Documents section */}
          <div className={styles.obSection}>
            <div className={styles.obSectionLabel}>Submitted Documents</div>
            {docs.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>No documents submitted yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {docs.map((doc) => (
                  <div key={doc._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Submitted {new Date(doc.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--hr-accent)", whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 }}
                    >
                      <ExternalLink size={12} /> View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HR Onboarding ─────────────────────────────────────────────────────────────
function HROnboarding() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [err, setErr] = useState("");

  const fetchData = () => {
    setLoading(true);
    hrAPI.getOnboarding()
      .then((d) => setData(d))
      .catch(() => setData({ candidates: [], eligible: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (e, candidateId) => {
    e.stopPropagation();
    setGenerating(candidateId);
    try {
      await hrAPI.generateOnboarding(candidateId);
      fetchData();
    } catch (err) {
      setErr(err.message || "Failed to generate plan");
      setTimeout(() => setErr(""), 4000);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className={styles.section}><div className={styles.loading}>Loading onboarding data…</div></div>;

  const candidates = data?.candidates || [];
  const eligible   = data?.eligible   || [];

  return (
    <div className={styles.section}>
      {selected && <OnboardingDetailModal candidate={selected} onClose={() => setSelected(null)} />}
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <h2 className={styles.sectionTitle}>Onboarding Pipeline</h2>

      {/* Ready to Onboard — shortlisted/hired, no plan yet */}
      {eligible.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
            Ready to Onboard ({eligible.length})
          </div>
          {eligible.map((c) => (
            <div key={c._id} className={styles.card} style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.itemTitle}>{c.fullName || c.email}</div>
                <div className={styles.itemSub}>{c.email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                  {c.jobTitle && (
                    <span className={styles.badge} style={{ background: "var(--hr-accent)14", color: "var(--hr-accent)", border: "1px solid var(--hr-accent)30" }}>
                      {c.jobTitle}{c.jobCompany ? ` · ${c.jobCompany}` : ""}
                    </span>
                  )}
                  <span className={`${styles.badge} ${styles.shortlisted}`}>{c.applicantStatus || "shortlisted"}</span>
                  {c.onboardingDocs?.length > 0 && (
                    <span className={styles.badge} style={{ background: "var(--color-info)14", color: "var(--color-info)", border: "1px solid var(--color-info)30" }}>
                      {c.onboardingDocs.length} doc{c.onboardingDocs.length > 1 ? "s" : ""} uploaded
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {c.skills?.slice(0, 4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                </div>
              </div>
              <button
                onClick={(e) => handleGenerate(e, c._id)}
                disabled={generating === c._id}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--hr-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: generating === c._id ? "not-allowed" : "pointer", opacity: generating === c._id ? 0.7 : 1, flexShrink: 0 }}
              >
                <Sparkles size={14} />
                {generating === c._id ? "Generating…" : "Generate Plan"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Onboarding Plans — candidates with existing plans */}
      {candidates.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>
            Onboarding Plans ({candidates.length})
          </div>
          {candidates.map((c) => {
            const readinessColor = (c.roleReadinessScore ?? 0) >= 80 ? "var(--color-success)" : (c.roleReadinessScore ?? 0) >= 60 ? "var(--color-warning)" : "var(--color-error)";
            return (
              <div key={c._id} className={`${styles.card} ${styles.clickableRow}`} style={{ marginBottom: 12 }} onClick={() => setSelected(c)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.itemTitle}>{c.fullName || c.email}</div>
                    <div className={styles.itemSub}>{c.email}</div>
                    {c.onboardingJobId && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        {c.onboardingJobId.title}{c.onboardingJobId.company ? ` · ${c.onboardingJobId.company}` : ""}
                      </div>
                    )}
                    {c.onboardingPlan?.welcomeMessage && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6, marginBottom: 0 }}>{c.onboardingPlan.welcomeMessage}</p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                      {c.skills?.slice(0, 4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                      {c.onboardingDocs?.length > 0 && (
                        <span className={styles.badge} style={{ background: "var(--color-info)14", color: "var(--color-info)", border: "1px solid var(--color-info)30" }}>
                          {c.onboardingDocs.length} doc{c.onboardingDocs.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {c.roleReadinessScore != null && (
                      <div style={{ textAlign: "center", minWidth: 72 }}>
                        <div className={styles.scoreTag} style={{ color: readinessColor }}>{c.roleReadinessScore}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>Readiness</div>
                      </div>
                    )}
                    <div className={styles.viewAnalysisBtn} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <Eye size={12} /> View Plan
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {candidates.length === 0 && eligible.length === 0 && (
        <div className={styles.card} style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ color: "var(--text-muted)", display: "flex", justifyContent: "center", marginBottom: 12 }}><Rocket size={40} /></div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No candidates ready for onboarding yet. Shortlist or hire candidates from your job listings to get started.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [jobs, setJobs]           = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const fetchJobs       = () => jobsAPI.getMy().then((d) => setJobs(d.jobs)).finally(() => setLoadingJobs(false));
  const fetchInterviews = () => interviewAPI.getHR().then((d) => setInterviews(d.interviews)).catch(console.error);

  useEffect(() => { fetchJobs(); fetchInterviews(); }, []);

  const deleteJob = async (id) => {
    if (!window.confirm("Remove this job listing?")) return;
    try { await jobsAPI.delete(id); setJobs((j) => j.filter((x) => x._id !== id)); }
    catch (e) { console.error("Delete job failed:", e.message); }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"    && <Overview jobs={jobs} interviews={interviews} onTabChange={setActiveTab} />}
      {activeTab === "post-job"    && <PostJob onPosted={fetchJobs} />}
      {activeTab === "my-jobs"     && <MyJobs jobs={jobs} loading={loadingJobs} onDelete={deleteJob} />}
      {activeTab === "candidates"  && <Candidates jobs={jobs} />}
      {activeTab === "interviews"  && (
        <div>
          <HRInterviews interviews={interviews} onRefresh={fetchInterviews} />
          <div style={{ marginTop: 28 }}>
            <ScheduleInterview jobs={jobs} onScheduled={fetchInterviews} />
          </div>
        </div>
      )}
      {activeTab === "ai-ranking"  && <AIRanking jobs={jobs} />}
      {activeTab === "bulk-screen" && <BulkScreening />}
      {activeTab === "onboarding"  && <HROnboarding />}
    </DashboardLayout>
  );
}
