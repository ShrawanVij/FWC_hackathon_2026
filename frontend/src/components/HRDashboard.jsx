import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { jobsAPI, interviewAPI, aiAPI, hrAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./HRDashboard.module.css";
import * as XLSX from "xlsx";

function StatCard({ icon, label, value, color }) {
  return (
    <div className={styles.statCard} style={{ "--c": color }}>
      <span className={styles.statIcon}>{icon}</span>
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
      <h2 className={styles.sectionTitle}>HR Overview</h2>
      <div className={styles.statsRow}>
        <StatCard icon="💼" label="Jobs Posted"       value={jobs.length}         color="var(--hr-accent)" />
        <StatCard icon="👥" label="Total Applicants"  value={totalApplicants}     color="#2ec4b6" />
        <StatCard icon="⭐" label="Shortlisted"       value={shortlisted}         color="#22c55e" />
        <StatCard icon="📅" label="Interviews"        value={interviews.length}   color="#a78bfa" />
      </div>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recent Job Posts</h3>
          {jobs.slice(0, 4).length === 0
            ? <p className={styles.empty}>No jobs posted yet. <button className={styles.inlineBtn} onClick={() => onTabChange("post-job")}>Post one →</button></p>
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.description || !form.company) { alert("Title, company and description required"); return; }
    setLoading(true);
    try {
      await jobsAPI.create({
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setSuccess(true);
      onPosted();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 640 }}>
        <h2 className={styles.cardTitle}>➕ Post a New Job</h2>
        {[
          { k: "title",       label: "Job Title *",              placeholder: "e.g. Senior React Developer" },
          { k: "company",     label: "Company Name *",           placeholder: "Your company" },
          { k: "location",    label: "Location",                 placeholder: "Remote / Delhi / Mumbai" },
          { k: "salaryRange", label: "Salary Range",             placeholder: "e.g. ₹8L - ₹14L" },
          { k: "skills",      label: "Required Skills (CSV)",    placeholder: "React, Node.js, MongoDB" },
          { k: "requirements",label: "Requirements (CSV)",       placeholder: "3+ years exp, B.Tech" },
        ].map(({ k, label, placeholder }) => (
          <div key={k} className={styles.formGroup}>
            <label className={styles.label}>{label}</label>
            <input className={styles.input} placeholder={placeholder} value={form[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div className={styles.formGroup}>
          <label className={styles.label}>Job Type</label>
          <select className={styles.input} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {["full-time","part-time","contract","internship"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Description *</label>
          <textarea className={styles.textarea} rows={5} placeholder="Describe the role, responsibilities..." value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <button className={styles.primaryBtn} onClick={submit} disabled={loading || success}>
          {success ? "✓ Job Posted!" : loading ? "Posting..." : "Post Job"}
        </button>
      </div>
    </div>
  );
}

// ── My Jobs ───────────────────────────────────────────────────────────────────
function MyJobs({ jobs, loading, onDelete, onTabChange }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>My Job Posts</h2>
        <button className={styles.primaryBtn} onClick={() => onTabChange("post-job")}>+ Post New</button>
      </div>
      {loading ? <div className={styles.loading}>Loading...</div> : jobs.length === 0
        ? <div className={styles.empty}>No jobs posted yet.</div>
        : jobs.map((job) => (
          <div key={job._id} className={styles.jobRow}>
            <div className={styles.jobRowLeft}>
              <div className={styles.jobTitle}>{job.title}</div>
              <div className={styles.jobMeta}>{job.company} · {job.location} · {job.type} · {job.applicants.length} applicants</div>
              <div className={styles.skillTags}>
                {job.skills?.slice(0,4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
              </div>
            </div>
            <div className={styles.jobRowRight}>
              <span className={`${styles.badge} ${job.isActive ? styles.active : styles.inactive}`}>{job.isActive ? "Active" : "Closed"}</span>
              <button className={styles.dangerBtn} onClick={() => onDelete(job._id)}>Delete</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Pentagon Radar Chart ──────────────────────────────────────────────────────
function PentagonChart({ values, labels, color = "#2ec4b6", size = 220 }) {
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
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: N }, (_, i) => point(i, R * r).join(",")).join(" ")}
          fill="none" stroke="#2d3748" strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2d3748" strokeWidth="1" />;
      })}
      {/* Data polygon */}
      <polygon points={polyPts} fill={`${color}33`} stroke={color} strokeWidth="2" />
      {/* Data dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={color} stroke="#0f172a" strokeWidth="1.5" />
      ))}
      {/* Labels */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, R + 22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="#94a3b8" fontFamily="inherit">
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

  const aiScore       = applicant.aiScore       ?? 0;
  const readiness     = c?.roleReadinessScore   ?? 0;
  const skills        = Math.min((c?.skills?.length || 0) * 10, 100);
  const resume        = c?.resumeUrl || c?.resumeText ? 80 : 20;
  const appScore      = applicant.status === "shortlisted" ? 90
                      : applicant.status === "reviewed"    ? 60
                      : applicant.status === "hired"       ? 100 : 40;

  const radarValues = [aiScore, readiness, skills, resume, appScore];
  const radarLabels = ["AI Score", "Readiness", "Skills", "Resume", "Status"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2d3748", borderRadius: 16, padding: 32, maxWidth: 560, width: "90%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>{c?.fullName || c?.email}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{c?.email} · {applicant.jobTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {/* Pentagon chart */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <PentagonChart values={radarValues} labels={radarLabels} color="var(--hr-accent)" size={240} />
        </div>

        {/* Score pills */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
          {[
            { label: "AI Score",    val: applicant.aiScore },
            { label: "Readiness",   val: c?.roleReadinessScore },
          ].map(({ label, val }) => val != null && (
            <div key={label} style={{ background: "#0f172a", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(val) }}>{val}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
            </div>
          ))}
          <div style={{ background: "#0f172a", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--hr-accent)" }}>{c?.skills?.length || 0}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Skills</div>
          </div>
        </div>

        {/* Status & summary */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <span className={styles.badge} style={{ fontSize: 12 }}>{applicant.status}</span>
          {applicant.aiSummary && <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{applicant.aiSummary}</p>}
        </div>

        {/* Skills */}
        {c?.skills?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>SKILLS</div>
            <div className={styles.skillTags}>
              {c.skills.map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
            </div>
          </div>
        )}

        {/* Resume link */}
        {c?.resumeUrl && (
          <a href={c.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn} style={{ display: "inline-block" }}>
            📄 View Resume ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ── All Candidates ────────────────────────────────────────────────────────────
function Candidates({ jobs }) {
  const allApplicants = jobs.flatMap((j) =>
    j.applicants.map((a) => ({ ...a, jobTitle: j.title, jobId: j._id }))
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = allApplicants.filter((a) =>
    (a.candidate?.fullName || a.candidate?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.section}>
      {selected && <CandidateModal applicant={selected} onClose={() => setSelected(null)} />}
      <div className={styles.searchBar}>
        <span>🔍</span>
        <input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Name</th><th>Email</th><th>Applied For</th><th>Skills</th><th>Status</th><th>AI Score</th><th>Resume</th><th></th></tr></thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(a)}>
                <td className={styles.bold}>{a.candidate?.fullName || "—"}</td>
                <td>{a.candidate?.email}</td>
                <td>{a.jobTitle}</td>
                <td>
                  <div className={styles.skillTags}>
                    {a.candidate?.skills?.slice(0,3).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                  </div>
                </td>
                <td><span className={`${styles.badge} ${styles[a.status]}`}>{a.status}</span></td>
                <td>{a.aiScore != null ? <span className={styles.aiScore}>{a.aiScore}</span> : "—"}</td>
                <td>{a.candidate?.resumeUrl ? <a href={a.candidate.resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn} onClick={(e) => e.stopPropagation()}>View ↗</a> : "—"}</td>
                <td><button className={styles.inlineBtn} onClick={(e) => { e.stopPropagation(); setSelected(a); }}>📊 Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className={styles.empty}>No candidates found.</p>}
      </div>
    </div>
  );
}

// ── Schedule Interviews ───────────────────────────────────────────────────────
function Interviews({ interviews, jobs, onScheduled, onRefresh }) {
  const [form, setForm] = useState({ candidateId: "", jobId: "", scheduledAt: "", mode: "online", meetLink: "", notes: "" });
  const [loading, setLoading]     = useState(false);
  const [updating, setUpdating]   = useState(null);
  const [evaluating, setEvaluating] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const allCandidates = jobs.flatMap((j) =>
    j.applicants.map((a) => ({ ...a.candidate, jobId: j._id, jobTitle: j.title }))
  ).filter((c, i, arr) => arr.findIndex((x) => x._id === c._id) === i);

  const submit = async () => {
    if (!form.candidateId || !form.jobId || !form.scheduledAt) { alert("Fill all required fields"); return; }
    setLoading(true);
    try { await interviewAPI.schedule(form); onScheduled(); alert("Interview scheduled!"); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await interviewAPI.updateStatus(id, status); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  };

  const evaluate = async (id) => {
    setEvaluating(id);
    try { await aiAPI.evaluateInterview(id); onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setEvaluating(null); }
  };

  const statusColor = (s) => s === "completed" ? { bg: "#22c55e22", fg: "#22c55e" } : s === "cancelled" ? { bg: "#ef444422", fg: "#ef4444" } : { bg: "#3b82f622", fg: "#3b82f6" };
  const recColor = { hire: "#22c55e", consider: "#f59e0b", pass: "#ef4444" };

  return (
    <div className={styles.section}>
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📅 Schedule Interview</h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>Candidate *</label>
            <select className={styles.input} value={form.candidateId} onChange={(e) => set("candidateId", e.target.value)}>
              <option value="">Select candidate</option>
              {allCandidates.map((c) => <option key={c._id} value={c._id}>{c.fullName || c.email}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Job *</label>
            <select className={styles.input} value={form.jobId} onChange={(e) => set("jobId", e.target.value)}>
              <option value="">Select job</option>
              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Date & Time *</label>
            <input type="datetime-local" className={styles.input} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <select className={styles.input} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              {["online","in-person","phone"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Meet Link <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(auto-generated for online)</span></label>
            <input className={styles.input} placeholder="Leave blank to auto-generate Jitsi link" value={form.meetLink} onChange={(e) => set("meetLink", e.target.value)} />
          </div>
          <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Scheduling..." : "Schedule Interview"}</button>
        </div>

        <div className={styles.card} style={{ overflowY: "auto", maxHeight: 580 }}>
          <h3 className={styles.cardTitle}>Scheduled Interviews</h3>
          {interviews.length === 0 ? <p className={styles.empty}>No interviews yet.</p>
            : interviews.map((iv) => {
              const sc = statusColor(iv.status);
              const isBusy = updating === iv._id || evaluating === iv._id;
              return (
                <div key={iv._id} style={{ borderBottom: "1px solid #2d2d2d", paddingBottom: 14, marginBottom: 14 }}>
                  <div className={styles.listItem} style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.itemTitle}>{iv.candidate?.fullName || iv.candidate?.email}</div>
                      <div className={styles.itemSub}>{iv.job?.title} · {new Date(iv.scheduledAt).toLocaleString()}</div>
                      <div className={styles.itemSub}>
                        {iv.mode}
                        {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" className={styles.inlineBtn} style={{ marginLeft: 8 }}>Join →</a>}
                      </div>
                    </div>
                    <span className={styles.badge} style={{ background: sc.bg, color: sc.fg }}>{iv.status}</span>
                  </div>

                  {/* Score display */}
                  {iv.mockScore != null && (
                    <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <span className={styles.itemSub}>Overall <strong style={{ color: "#e2e8f0" }}>{iv.mockScore}/100</strong></span>
                      {iv.technicalScore     != null && <span className={styles.itemSub}>Tech <strong style={{ color: "#e2e8f0" }}>{iv.technicalScore}/100</strong></span>}
                      {iv.communicationScore != null && <span className={styles.itemSub}>Comm <strong style={{ color: "#e2e8f0" }}>{iv.communicationScore}/100</strong></span>}
                      {iv.confidenceScore    != null && <span className={styles.itemSub}>Conf <strong style={{ color: "#e2e8f0" }}>{iv.confidenceScore}/100</strong></span>}
                      {iv.candidate?.roleReadinessScore != null && (
                        <span className={styles.itemSub}>🎯 Readiness <strong style={{ color: "#22c55e" }}>{iv.candidate.roleReadinessScore}/100</strong></span>
                      )}
                      {iv.recommendation && (
                        <span className={styles.badge} style={{ color: recColor[iv.recommendation] || "#e2e8f0" }}>
                          {iv.recommendation.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                  {iv.mockFeedback && <p className={styles.itemSub} style={{ marginTop: 6, fontStyle: "italic" }}>{iv.mockFeedback}</p>}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {iv.status === "scheduled" && (
                      <>
                        <button className={styles.successBtn} onClick={() => updateStatus(iv._id, "completed")} disabled={isBusy}>
                          {updating === iv._id ? "..." : "Complete"}
                        </button>
                        <button className={styles.dangerBtn} onClick={() => updateStatus(iv._id, "cancelled")} disabled={isBusy}>
                          {updating === iv._id ? "..." : "Cancel"}
                        </button>
                      </>
                    )}
                    {iv.status === "completed" && iv.mockScore == null && (
                      <button className={styles.aiBtn} onClick={() => evaluate(iv._id)} disabled={isBusy}>
                        {evaluating === iv._id ? "Evaluating..." : "✨ AI Evaluate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ── AI Ranking ────────────────────────────────────────────────────────────────
function AIRanking({ jobs }) {
  const [selectedJob, setSelectedJob] = useState("");
  const [topN, setTopN]               = useState("");
  const [rankings, setRankings]       = useState([]);
  const [loading, setLoading]         = useState(false);

  const rank = async () => {
    if (!selectedJob) { alert("Select a job first"); return; }
    setLoading(true);
    try {
      const d = await aiAPI.rankCandidates(selectedJob, topN ? parseInt(topN) : null);
      setRankings(d.rankings);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const scoreColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";

  const exportExcel = () => {
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

    // Style header row bold
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (cell) cell.s = { font: { bold: true } };
    }

    ws["!cols"] = [
      { wch: 6 },  { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 30 }, { wch: 35 },
      { wch: 14 },
      ...Array(14).fill({ wch: 16 }),
      { wch: 40 }, { wch: 40 }, { wch: 60 }, { wch: 22 }, { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AI Screening");
    XLSX.writeFile(wb, `AI_Screening_${jobLabel.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <div className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>🤖 AI Resume Screening</h2>
        <p className={styles.cardSub}>Select a job to let AI analyze and screen all applicants across 14 factors, scoring them 0–100.</p>
        <div className={styles.rankControls}>
          <select className={styles.input} style={{ flex: 2 }} value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
            <option value="">Select a job to screen candidates</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} ({j.applicants.length} applicants)</option>)}
          </select>
          <input
            type="number"
            className={styles.input}
            style={{ width: 100, flexShrink: 0 }}
            placeholder="Top N"
            min={1}
            max={100}
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
            title="Leave blank to screen all candidates"
          />
          <button className={styles.aiBtn} onClick={rank} disabled={loading || !selectedJob}>
            {loading ? "Analyzing..." : "✨ Screen with AI"}
          </button>
        </div>
      </div>

      {rankings.length > 0 && (
        <div className={styles.rankList}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>{rankings.length} candidate{rankings.length !== 1 ? "s" : ""} screened</div>
            <button className={styles.successBtn} onClick={exportExcel}>
              📥 Export to Excel
            </button>
          </div>
          {rankings.map((r, i) => (
            <div key={r.id} className={styles.rankCard}>
              <div className={styles.rankPosition}>#{i + 1}</div>
              <div className={styles.rankInfo}>
                <div className={styles.rankName}>{r.name}</div>
                <p className={styles.rankSummary}>{r.summary}</p>

                {/* 14 Factor bars */}
                {r.factors && (
                  <div style={{ margin: "12px 0" }}>
                    <div className={styles.rankDetailTitle} style={{ marginBottom: 8 }}>📊 14-Factor Analysis</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                      {[
                        ["Skill Match",              r.factors.skillMatch],
                        ["Relevant Experience",      r.factors.relevantExperience],
                        ["Education",                r.factors.educationQualification],
                        ["Certifications",           r.factors.certifications],
                        ["Industry Experience",      r.factors.industryExperience],
                        ["Project Experience",       r.factors.projectExperience],
                        ["Technical Competency",     r.factors.technicalCompetency],
                        ["Domain Knowledge",         r.factors.domainKnowledge],
                        ["Role Relevance",           r.factors.roleRelevance],
                        ["Achievements & Impact",    r.factors.achievementsImpact],
                        ["Career Stability",         r.factors.careerStability],
                        ["Communication & Resume",   r.factors.communicationResumeQuality],
                        ["Leadership Experience",    r.factors.leadershipExperience],
                        ["Learning Agility",         r.factors.learningAgility],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
                            <span>{label}</span>
                            <span style={{ color: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{val ?? "—"}</span>
                          </div>
                          <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${val ?? 0}%`,
                              background: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444",
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.rankDetails}>
                  <div>
                    <div className={styles.rankDetailTitle}>✅ Strengths</div>
                    {r.strengths?.map((s, j) => <div key={j} className={styles.strengthItem}>• {s}</div>)}
                  </div>
                  <div>
                    <div className={styles.rankDetailTitle}>⚠️ Gaps</div>
                    {r.gaps?.map((g, j) => <div key={j} className={styles.gapItem}>• {g}</div>)}
                  </div>
                </div>
              </div>
              <div className={styles.rankScore} style={{ color: scoreColor(r.score) }}>
                <span className={styles.rankScoreNum}>{r.score}</span>
                <span className={styles.rankScoreLabel}>/100</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bulk Resume Screening ─────────────────────────────────────────────────────
function BulkScreening() {
  const [zipFile, setZipFile]       = useState(null);
  const [jd, setJd]                 = useState("");
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState([]);
  const [expanded, setExpanded]     = useState(null);
  const [dragOver, setDragOver]     = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".zip")) { alert("Please upload a .zip file"); return; }
    if (file.size > 100 * 1024 * 1024) { alert("File size exceeds 100MB limit"); return; }
    setZipFile(file);
  };

  const screen = async () => {
    if (!zipFile) { alert("Please upload a ZIP file"); return; }
    if (!jd.trim()) { alert("Please paste a job description"); return; }
    setLoading(true);
    setResults([]);
    try {
      const fd = new FormData();
      fd.append("zipFile", zipFile);
      fd.append("jobDescription", jd);
      const d = await hrAPI.bulkScreen(fd);
      setResults(d.results);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    const rows = results.map((r, i) => ({
      "Rank":        i + 1,
      "Name":        r.name,
      "Score":       r.score,
      "Experience":  r.experience || "",
      "Status":      r.status,
      "AI Summary":  r.summary ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bulk Screening");
    XLSX.writeFile(wb, `Bulk_Screening_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const statusColor = { Shortlist: "#22c55e", Review: "#f59e0b", Reject: "#ef4444" };
  const scoreColor  = (s) => s >= 75 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className={styles.section}>
      {/* Upload + JD */}
      <div className={styles.twoCol}>
        {/* ZIP Upload */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📦 Upload Resume ZIP</h3>
          <p className={styles.cardSub}>Upload a ZIP file containing PDF, DOCX, or TXT resumes. Max 100MB.</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("zipInput").click()}
            style={{
              border: `2px dashed ${dragOver ? "var(--hr-accent)" : "var(--border)"}`,
              borderRadius: 10, padding: "32px 16px", textAlign: "center",
              cursor: "pointer", transition: "border-color 0.2s",
              background: dragOver ? "rgba(var(--hr-accent-rgb),0.05)" : "transparent",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
            {zipFile ? (
              <>
                <div style={{ color: "#22c55e", fontWeight: 600, fontSize: 14 }}>✓ {zipFile.name}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  {(zipFile.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>
                  Drag & drop ZIP here
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>or click to browse</div>
              </>
            )}
          </div>
          <input id="zipInput" type="file" accept=".zip" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
          {zipFile && (
            <button className={styles.dangerBtn} style={{ marginTop: 10 }}
              onClick={() => setZipFile(null)}>Remove</button>
          )}
        </div>

        {/* Job Description */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📋 Job Description</h3>
          <p className={styles.cardSub}>Paste the full job description. AI will screen resumes against this.</p>
          <textarea
            className={styles.textarea}
            rows={10}
            placeholder="Paste job description here...&#10;&#10;Example:&#10;We are looking for a Senior React Developer with 3+ years experience in React, Node.js, and MongoDB. The candidate should have strong problem-solving skills..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{jd.length} characters</div>
        </div>
      </div>

      {/* Start Screening button */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          className={styles.primaryBtn}
          style={{ padding: "14px 40px", fontSize: 15 }}
          onClick={screen}
          disabled={loading || !zipFile || !jd.trim()}
        >
          {loading ? "⏳ Screening Resumes..." : "✨ Start Bulk Screening"}
        </button>
      </div>

      {loading && (
        <div className={styles.card} style={{ textAlign: "center", padding: "32px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>AI is analyzing resumes...</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>This may take a moment depending on the number of resumes</div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className={styles.sectionTitle}>Results — {results.length} Candidates</h3>
            <button className={styles.successBtn} onClick={exportExcel}>📥 Export to Excel</button>
          </div>

          {/* Summary pills */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Shortlist", "Review", "Reject"].map((s) => {
              const count = results.filter((r) => r.status === s).length;
              return (
                <div key={s} style={{ background: `${statusColor[s]}22`, border: `1px solid ${statusColor[s]}44`, borderRadius: 8, padding: "6px 16px", fontSize: 13 }}>
                  <span style={{ color: statusColor[s], fontWeight: 700 }}>{count}</span>
                  <span style={{ color: "#94a3b8", marginLeft: 6 }}>{s}</span>
                </div>
              );
            })}
          </div>

          {/* Results table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Score</th><th>Experience</th><th>Status</th><th>Top Factor</th><th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const topFactor = r.factors
                    ? Object.entries(r.factors).sort((a, b) => b[1] - a[1])[0]
                    : null;
                  return (
                    <tr key={i}>
                      <td style={{ color: "#64748b" }}>{i + 1}</td>
                      <td className={styles.bold}>{r.name}</td>
                      <td>
                        <span style={{ color: scoreColor(r.score), fontWeight: 700, fontFamily: "'Syne',sans-serif", fontSize: 15 }}>
                          {r.score}
                        </span>
                        <span style={{ color: "#64748b", fontSize: 11 }}>/100</span>
                      </td>
                      <td style={{ color: "#94a3b8", fontSize: 13 }}>{r.experience || "—"}</td>
                      <td>
                        <span className={styles.badge} style={{ color: statusColor[r.status], background: `${statusColor[r.status]}22` }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ color: "#64748b", fontSize: 12 }}>
                        {topFactor ? `${topFactor[0].replace(/([A-Z])/g, " $1").trim()} (${topFactor[1]})` : "—"}
                      </td>
                      <td>
                        <button className={styles.inlineBtn} onClick={() => setExpanded(expanded === i ? null : i)}>
                          {expanded === i ? "▲ Hide" : "▼ Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded detail */}
          {expanded !== null && results[expanded] && (() => {
            const r = results[expanded];
            return (
              <div className={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div className={styles.cardTitle} style={{ marginBottom: 4 }}>{r.name}</div>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{r.summary}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(r.score), fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{r.score}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Overall Score</div>
                  </div>
                </div>

                {/* 14 factors */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 24px", marginBottom: 16 }}>
                  {r.factors && [
                    ["Skill Match",           r.factors.skillMatch],
                    ["Relevant Experience",   r.factors.relevantExperience],
                    ["Education",             r.factors.educationQualification],
                    ["Certifications",        r.factors.certifications],
                    ["Industry Experience",   r.factors.industryExperience],
                    ["Project Experience",    r.factors.projectExperience],
                    ["Technical Competency",  r.factors.technicalCompetency],
                    ["Domain Knowledge",      r.factors.domainKnowledge],
                    ["Role Relevance",        r.factors.roleRelevance],
                    ["Achievements & Impact", r.factors.achievementsImpact],
                    ["Career Stability",      r.factors.careerStability],
                    ["Communication",         r.factors.communicationResumeQuality],
                    ["Leadership",            r.factors.leadershipExperience],
                    ["Learning Agility",      r.factors.learningAgility],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
                        <span>{label}</span>
                        <span style={{ color: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{val ?? "—"}</span>
                      </div>
                      <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${val ?? 0}%`, background: val >= 80 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444", transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div className={styles.rankDetailTitle}>✅ Strengths</div>
                    {r.strengths?.map((s, j) => <div key={j} className={styles.strengthItem}>• {s}</div>)}
                  </div>
                  <div>
                    <div className={styles.rankDetailTitle}>⚠️ Gaps</div>
                    {r.gaps?.map((g, j) => <div key={j} className={styles.gapItem}>• {g}</div>)}
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ── HR Onboarding ─────────────────────────────────────────────────────────────
function HROnboarding() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    hrAPI.getOnboarding()
      .then((d) => setCandidates(d.candidates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const readiness = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
  const rec = selected?.onboardingPlan?.onboardingMeta?.recommendation;
  const recColor = { hire: "#22c55e", consider: "#f59e0b", pass: "#ef4444" };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>🚀 Onboarding Pipeline</h2>
        <span className={styles.itemSub}>{candidates.length} candidate{candidates.length !== 1 ? "s" : ""} ready</span>
      </div>

      {candidates.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.empty}>No candidates have onboarding plans yet. AI onboarding plans are generated automatically after interview evaluation with a "hire" or "consider" recommendation.</p>
        </div>
      ) : (
        <div className={styles.twoCol}>
          {/* Left — candidate list */}
          <div className={styles.card} style={{ overflowY: "auto", maxHeight: 600 }}>
            <h3 className={styles.cardTitle}>Eligible Candidates</h3>
            {candidates.map((c) => (
              <div
                key={c._id}
                className={styles.listItem}
                style={{ cursor: "pointer", background: selected?._id === c._id ? "var(--hr-accent)11" : "transparent", borderRadius: 8, padding: "10px 8px" }}
                onClick={() => setSelected(c)}
              >
                <div style={{ flex: 1 }}>
                  <div className={styles.itemTitle}>{c.fullName || c.email}</div>
                  <div className={styles.itemSub}>
                    {c.onboardingJobId?.title || "Unknown role"} · {c.onboardingJobId?.company || ""}
                  </div>
                  <div className={styles.skillTags} style={{ marginTop: 4 }}>
                    {c.skills?.slice(0, 3).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {c.roleReadinessScore != null && (
                    <div style={{ color: readiness(c.roleReadinessScore), fontWeight: 700, fontSize: 18 }}>
                      {c.roleReadinessScore}<span style={{ fontSize: 11, color: "#94a3b8" }}>/100</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {c.onboardingGeneratedAt ? new Date(c.onboardingGeneratedAt).toLocaleDateString() : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right — plan detail */}
          <div className={styles.card} style={{ overflowY: "auto", maxHeight: 600 }}>
            {!selected ? (
              <p className={styles.empty}>Select a candidate to view their onboarding plan.</p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 className={styles.cardTitle} style={{ marginBottom: 2 }}>{selected.fullName || selected.email}</h3>
                    <div className={styles.itemSub}>{selected.onboardingJobId?.title} · {selected.onboardingJobId?.company}</div>
                  </div>
                  {rec && <span className={styles.badge} style={{ color: recColor[rec] || "#e2e8f0", textTransform: "uppercase" }}>{rec}</span>}
                </div>

                {selected.onboardingPlan?.welcomeMessage && (
                  <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16, fontStyle: "italic", color: "#94a3b8", fontSize: 13 }}>
                    "{selected.onboardingPlan.welcomeMessage}"
                  </div>
                )}

                {/* Scores row */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  {[
                    { label: "Role Readiness", val: selected.roleReadinessScore },
                    { label: "Interview",      val: selected.onboardingPlan?.onboardingMeta?.interviewScore },
                    { label: "Technical",      val: selected.onboardingPlan?.onboardingMeta?.technicalScore },
                    { label: "Communication",  val: selected.onboardingPlan?.onboardingMeta?.communicationScore },
                  ].map(({ label, val }) => val != null && (
                    <div key={label} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 90 }}>
                      <div style={{ color: readiness(val), fontWeight: 700, fontSize: 20 }}>{val}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Day 1 checklist */}
                {selected.onboardingPlan?.day1Checklist?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className={styles.rankDetailTitle}>📋 Day 1 Checklist</div>
                    {selected.onboardingPlan.day1Checklist.map((item, i) => (
                      <div key={i} style={{ color: "#94a3b8", fontSize: 13, padding: "3px 0" }}>☐ {item}</div>
                    ))}
                  </div>
                )}

                {/* Goals */}
                {[
                  { label: "Week 1 Goals", key: "week1Goals" },
                  { label: "30-Day Goals", key: "day30Goals" },
                  { label: "90-Day Goals", key: "day90Goals" },
                ].map(({ label, key }) => selected.onboardingPlan?.[key]?.length > 0 && (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <div className={styles.rankDetailTitle}>🎯 {label}</div>
                    {selected.onboardingPlan[key].map((g, i) => (
                      <div key={i} style={{ color: "#94a3b8", fontSize: 13, padding: "3px 0" }}>• {g}</div>
                    ))}
                  </div>
                ))}

                {/* Skills to learn */}
                {selected.onboardingPlan?.skillsToLearn?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className={styles.rankDetailTitle}>📚 Skills to Learn</div>
                    {selected.onboardingPlan.skillsToLearn.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #1e293b" }}>
                        <div>
                          <span style={{ color: "#e2e8f0", fontSize: 13 }}>{s.skill}</span>
                          {s.resource && <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{s.resource}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: s.priority === "high" ? "#ef4444" : s.priority === "medium" ? "#f59e0b" : "#22c55e" }}>
                          {s.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths & areas */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  {selected.onboardingPlan?.strengths?.length > 0 && (
                    <div>
                      <div className={styles.rankDetailTitle}>✅ Strengths</div>
                      {selected.onboardingPlan.strengths.map((s, i) => <div key={i} className={styles.strengthItem}>• {s}</div>)}
                    </div>
                  )}
                  {selected.onboardingPlan?.areasToGrow?.length > 0 && (
                    <div>
                      <div className={styles.rankDetailTitle}>📈 Areas to Grow</div>
                      {selected.onboardingPlan.areasToGrow.map((a, i) => <div key={i} className={styles.gapItem}>• {a}</div>)}
                    </div>
                  )}
                </div>

                {/* Submitted documents */}
                <div style={{ marginTop: 8 }}>
                  <div className={styles.rankDetailTitle}>📎 Submitted Documents</div>
                  {!selected.onboardingDocs?.length
                    ? <p className={styles.empty} style={{ fontSize: 13, marginTop: 6 }}>No documents submitted yet.</p>
                    : selected.onboardingDocs.map((doc) => (
                      <div key={doc._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #1e293b" }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{doc.name}</span>
                          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 10 }}>{new Date(doc.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer" className={styles.inlineBtn}>View ↗</a>
                      </div>
                    ))
                  }
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main HR Dashboard ─────────────────────────────────────────────────────────
export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const fetchJobs = () => {
    setLoadingJobs(true);
    jobsAPI.getMy().then((d) => setJobs(d.jobs)).finally(() => setLoadingJobs(false));
  };
  const fetchInterviews = () => interviewAPI.getHR().then((d) => setInterviews(d.interviews));

  useEffect(() => { fetchJobs(); fetchInterviews(); }, []);

  const deleteJob = async (id) => {
    if (!confirm("Delete this job?")) return;
    await jobsAPI.delete(id);
    fetchJobs();
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"   && <Overview jobs={jobs} interviews={interviews} onTabChange={setActiveTab} />}
      {activeTab === "post-job"   && <PostJob onPosted={fetchJobs} />}
      {activeTab === "my-jobs"    && <MyJobs jobs={jobs} loading={loadingJobs} onDelete={deleteJob} onTabChange={setActiveTab} />}
      {activeTab === "candidates" && <Candidates jobs={jobs} />}
      {activeTab === "interviews" && <Interviews interviews={interviews} jobs={jobs} onScheduled={fetchInterviews} onRefresh={fetchInterviews} />}
      {activeTab === "ai-ranking"  && <AIRanking jobs={jobs} />}
      {activeTab === "bulk-screen" && <BulkScreening />}
      {activeTab === "onboarding"  && <HROnboarding />}
    </DashboardLayout>
  );
}