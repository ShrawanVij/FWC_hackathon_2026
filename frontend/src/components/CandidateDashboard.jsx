import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import { jobsAPI, candidateAPI, interviewAPI, aiAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import styles from "./CandidateDashboard.module.css";
import {
  Briefcase, Calendar, Sparkles, FileText, Target, Search, Mic, Rocket,
  User, Lightbulb, Check, Trophy, TrendingUp, BookOpen, DollarSign,
  ExternalLink, Trash, ArrowRight, CheckSquare, Users, Zap,
} from "./Icons";

// ── Stat Card ──────────────────────────────────────────────────────────────────
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

// ── Overview Tab ───────────────────────────────────────────────────────────────
function Overview({ user, appliedJobs, interviews, onTabChange }) {
  const [profileReview, setProfileReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewErr, setReviewErr] = useState("");

  const runReview = async () => {
    setReviewLoading(true);
    try { const d = await aiAPI.reviewProfile(); setProfileReview(d.review); }
    catch (e) { setReviewErr(e.message); setTimeout(() => setReviewErr(""), 4000); }
    finally { setReviewLoading(false); }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Welcome back, {user?.fullName || "Candidate"}</h2>
      <div className={styles.statsRow}>
        <StatCard iconEl={<Briefcase size={18} />} label="Jobs Applied"   value={appliedJobs.length}                         color="var(--cand-accent)" />
        <StatCard iconEl={<Calendar size={18} />}  label="Interviews"      value={interviews.length}                          color="#7c3aed" />
        <StatCard iconEl={<Sparkles size={18} />}  label="Profile Skills"  value={user?.skills?.length || 0}                  color="#d97706" />
        <StatCard iconEl={<FileText size={18} />}  label="Resume"          value={user?.resumeUrl ? "Uploaded" : "Missing"}   color={user?.resumeUrl ? "var(--color-success)" : "var(--color-error)"} />
        {user?.roleReadinessScore != null && (
          <StatCard iconEl={<Target size={18} />} label="Role Readiness" value={`${user.roleReadinessScore}/100`} color="var(--color-success)" />
        )}
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Recent Applications</h3>
          {appliedJobs.slice(0, 4).length === 0
            ? <p className={styles.empty}>No applications yet. <button className={styles.inlineBtn} onClick={() => onTabChange("jobs")}>Browse jobs <ArrowRight size={12}/></button></p>
            : appliedJobs.slice(0, 4).map((j) => (
              <div key={j._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemTitle}>{j.title}</div>
                  <div className={styles.itemSub}>{j.company} · {j.location}</div>
                </div>
                <span className={`${styles.badge} ${styles[j.status]}`}>{j.status}</span>
              </div>
            ))
          }
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>AI Profile Review</h3>
          {profileReview ? (
            <div className={styles.aiReview}>
              <div className={styles.scoreCircle} style={{ "--s": profileReview.profileScore }}>
                <span className={styles.scoreNum}>{profileReview.profileScore}</span>
                <span className={styles.scoreLabel}>Score</span>
              </div>
              <p className={styles.aiSummary}>{profileReview.summary}</p>
              <div className={styles.tips}>
                {profileReview.tips?.map((t, i) => (
                  <div key={i} className={styles.tip}>
                    <Lightbulb size={14} /> {t}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.aiPrompt}>
              <p>Get AI-powered feedback on your profile to stand out to recruiters.</p>
              {reviewErr && <div style={{ color: "var(--color-error)", fontSize: 12, marginBottom: 8 }}>{reviewErr}</div>}
              <button className={styles.aiBtn} onClick={runReview} disabled={reviewLoading}>
                <Sparkles size={14} /> {reviewLoading ? "Analyzing..." : "Analyze My Profile"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Browse Jobs Tab ────────────────────────────────────────────────────────────
function BrowseJobs({ appliedJobIds, onApply }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const showMsg = (text, type = "error") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 4000); };

  useEffect(() => {
    jobsAPI.getAll().then((d) => setJobs(d.jobs)).finally(() => setLoading(false));
  }, []);

  const apply = async (id) => {
    const job = jobs.find((j) => j._id === id);
    if (!window.confirm(`Apply to ${job?.title} at ${job?.company}?`)) return;
    setApplying(id);
    try {
      await jobsAPI.apply(id);
      showMsg("Applied successfully!", "success");
      onApply?.();
    }
    catch (e) { showMsg(e.message); }
    finally { setApplying(null); }
  };

  const filtered = jobs.filter(
    (j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.section}>
      {msg.text && (
        <div style={{ background: msg.type === "success" ? "var(--color-success-bg)" : "var(--color-error-bg)", color: msg.type === "success" ? "var(--color-success)" : "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
          {msg.text}
        </div>
      )}
      <div className={styles.searchBar}>
        <Search size={15} />
        <input placeholder="Search jobs or companies..." value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} />
      </div>
      {loading ? <div className={styles.loading}>Loading jobs...</div> : (
        <div className={styles.jobGrid}>
          {filtered.map((job) => {
            const applied = appliedJobIds.includes(job._id);
            return (
              <div key={job._id} className={styles.jobCard}>
                <div className={styles.jobHeader}>
                  <div>
                    <div className={styles.jobTitle}>{job.title}</div>
                    <div className={styles.jobCompany}>{job.company} · {job.location}</div>
                  </div>
                  <span className={styles.jobType}>{job.type}</span>
                </div>
                <p className={styles.jobDesc}>{job.description?.substring(0, 120)}...</p>
                <div className={styles.skillTags}>
                  {job.skills?.slice(0, 4).map((s) => <span key={s} className={styles.skillTag}>{s}</span>)}
                </div>
                <div className={styles.jobFooter}>
                  {job.salaryRange && (
                    <span className={styles.salary}>
                      <DollarSign size={12} /> {job.salaryRange}
                    </span>
                  )}
                  <button
                    className={`${styles.applyBtn} ${applied ? styles.appliedBtn : ""}`}
                    onClick={() => !applied && apply(job._id)}
                    disabled={applied || applying === job._id}
                  >
                    {applied ? "Applied" : applying === job._id ? "Applying..." : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className={styles.empty}>No jobs found.</p>}
        </div>
      )}
    </div>
  );
}

// ── Applied Jobs Tab ───────────────────────────────────────────────────────────
function AppliedJobs({ jobs, loading }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Your Applications</h2>
      {loading ? <div className={styles.loading}>Loading...</div> : jobs.length === 0
        ? <div className={styles.empty}>You haven't applied to any jobs yet.</div>
        : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Type</th><th>Applied</th><th>Status</th><th>AI Score</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id}>
                    <td className={styles.bold}>{j.title}</td>
                    <td>{j.company}</td>
                    <td>{j.location}</td>
                    <td>{j.type}</td>
                    <td>{new Date(j.appliedAt).toLocaleDateString()}</td>
                    <td><span className={`${styles.badge} ${styles[j.status]}`}>{j.status}</span></td>
                    <td>{j.aiScore != null ? <span className={styles.aiScore}>{j.aiScore}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ── Mock Interview Tab ─────────────────────────────────────────────────────────
function MockInterview() {
  const [step, setStep] = useState("setup");
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };

  const start = async () => {
    if (!jobTitle) { showErr("Enter a job title"); return; }
    setLoading(true);
    try {
      const d = await aiAPI.startMockInterview({ jobTitle, skills });
      setQuestions(d.questions);
      setAnswers(new Array(d.questions.length).fill(""));
      setCurrent(0);
      setStep("interview");
    } catch (e) { showErr(e.message); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const d = await aiAPI.evaluateMockInterview({ jobTitle, questions, answers });
      setEvaluation(d.evaluation);
      setStep("results");
    } catch (e) { showErr(e.message); }
    finally { setLoading(false); }
  };

  const gradeColor = { A: "var(--color-success)", B: "#84cc16", C: "var(--color-warning)", D: "#f97316", F: "var(--color-error)" };

  return (
    <div className={styles.section}>
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {step === "setup" && (
        <div className={styles.card} style={{ maxWidth: 560 }}>
          <h2 className={styles.cardTitle}>AI Mock Interview</h2>
          <p className={styles.cardSub}>Generate role-specific questions and get AI evaluation on your answers.</p>
          <div className={styles.formGroup}>
            <label className={styles.label}>Job Title *</label>
            <input className={styles.input} placeholder="e.g. Frontend Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Your Skills (comma separated)</label>
            <input className={styles.input} placeholder="e.g. React, Node.js, MongoDB" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
          <button className={styles.primaryBtn} onClick={start} disabled={loading}>
            {loading ? "Generating Questions..." : "Start Interview"}
          </button>
        </div>
      )}

      {step === "interview" && (
        <div className={styles.card} style={{ maxWidth: 680 }}>
          <div className={styles.qProgress}>Question {current + 1} of {questions.length}</div>
          <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
          <h3 className={styles.question}>{questions[current]}</h3>
          <textarea
            className={styles.answerBox}
            placeholder="Type your answer here..."
            value={answers[current]}
            onChange={(e) => { const a = [...answers]; a[current] = e.target.value; setAnswers(a); }}
            rows={5}
          />
          <div className={styles.navBtns}>
            {current > 0 && <button className={styles.secBtn} onClick={() => setCurrent(c => c - 1)}>Previous</button>}
            {current < questions.length - 1
              ? <button className={styles.primaryBtn} onClick={() => setCurrent(c => c + 1)}>Next</button>
              : <button className={styles.primaryBtn} onClick={submit} disabled={loading}>{loading ? "Evaluating..." : "Submit & Get Results"}</button>
            }
          </div>
        </div>
      )}

      {step === "results" && evaluation && (
        <div className={styles.resultsWrap}>
          <div className={styles.scoreHeader}>
            <div className={styles.bigScore} style={{ color: gradeColor[evaluation.grade] }}>
              {evaluation.overallScore}<span style={{ fontSize: 24 }}>/100</span>
            </div>
            <div className={styles.grade} style={{ background: gradeColor[evaluation.grade] }}>{evaluation.grade}</div>
            <p className={styles.evalSummary}>{evaluation.summary}</p>
            <span className={`${styles.badge} ${evaluation.recommendation === "hire" ? styles.shortlisted : evaluation.recommendation === "consider" ? styles.reviewed : styles.rejected}`}>
              {evaluation.recommendation?.toUpperCase()}
            </span>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Strengths</h3>
              {evaluation.strengths?.map((s, i) => <div key={i} className={styles.strengthItem}>• {s}</div>)}
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Areas to Improve</h3>
              {evaluation.improvements?.map((s, i) => <div key={i} className={styles.improvItem}>• {s}</div>)}
            </div>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Per-Question Feedback</h3>
            {evaluation.feedback?.map((f, i) => (
              <div key={i} className={styles.qFeedback}>
                <div className={styles.qFeedbackHeader}>
                  <span>Q{i+1}: {f.question}</span>
                  <span className={styles.qScore}>{f.score}/20</span>
                </div>
                <p className={styles.qFeedbackText}>{f.feedback}</p>
              </div>
            ))}
          </div>
          <button className={styles.secBtn} onClick={() => { setStep("setup"); setEvaluation(null); }}>Try Again</button>
        </div>
      )}
    </div>
  );
}

// ── Interview Tab ──────────────────────────────────────────────────────────────
function InterviewTab({ interviews, onRefresh }) {
  const [generatingFor, setGeneratingFor] = useState(null);
  const [submittingFor, setSubmittingFor] = useState(null);
  const [draftAnswers, setDraftAnswers]   = useState({});
  const [err, setErr] = useState("");
  const showErr = (msg) => { setErr(msg); setTimeout(() => setErr(""), 4000); };

  const generateQuestions = async (id) => {
    setGeneratingFor(id);
    try { await aiAPI.generateInterviewQuestions(id); onRefresh(); }
    catch (e) { showErr(e.message); }
    finally { setGeneratingFor(null); }
  };

  const submitAnswers = async (id, questionCount) => {
    const answers = draftAnswers[id] || new Array(questionCount).fill("");
    setSubmittingFor(id);
    try { await interviewAPI.submitAnswers(id, answers); onRefresh(); }
    catch (e) { showErr(e.message); }
    finally { setSubmittingFor(null); }
  };

  const setAnswer = (interviewId, index, value, questionCount) => {
    setDraftAnswers((prev) => {
      const arr = [...(prev[interviewId] || new Array(questionCount).fill(""))];
      arr[index] = value;
      return { ...prev, [interviewId]: arr };
    });
  };

  const recColor = { hire: "var(--color-success)", consider: "var(--color-warning)", pass: "var(--color-error)" };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>My Scheduled Interviews</h2>
      {err && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {interviews.length === 0 ? (
        <p className={styles.empty}>No interviews scheduled yet.</p>
      ) : (
        interviews.map((iv) => (
          <div key={iv._id} className={styles.card} style={{ marginBottom: 16 }}>
            <div className={styles.listItem}>
              <div>
                <div className={styles.itemTitle}>{iv.job?.title} — {iv.job?.company}</div>
                <div className={styles.itemSub}>
                  {new Date(iv.scheduledAt).toLocaleString()} · {iv.mode}
                </div>
                {iv.meetLink && (
                  <a href={iv.meetLink} target="_blank" rel="noreferrer" className={styles.inlineBtn}>
                    Join Video Call <ArrowRight size={12}/>
                  </a>
                )}
              </div>
              <span className={styles.badge} style={{
                background: iv.status === "completed" ? "var(--color-success-bg)" : iv.status === "cancelled" ? "var(--color-error-bg)" : "var(--color-info-bg)",
                color:      iv.status === "completed" ? "var(--color-success)"    : iv.status === "cancelled" ? "var(--color-error)"    : "var(--color-info)",
              }}>{iv.status}</span>
            </div>

            {iv.mockScore != null && (
              <div style={{ marginTop: 12, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className={styles.itemSub}>Overall <strong style={{ color: "var(--text-primary)" }}>{iv.mockScore}/100</strong></span>
                  {iv.technicalScore     != null && <span className={styles.itemSub}>Technical <strong style={{ color: "var(--text-primary)" }}>{iv.technicalScore}/100</strong></span>}
                  {iv.communicationScore != null && <span className={styles.itemSub}>Communication <strong style={{ color: "var(--text-primary)" }}>{iv.communicationScore}/100</strong></span>}
                  {iv.confidenceScore    != null && <span className={styles.itemSub}>Confidence <strong style={{ color: "var(--text-primary)" }}>{iv.confidenceScore}/100</strong></span>}
                  {iv.recommendation && (
                    <span className={styles.badge} style={{ color: recColor[iv.recommendation] || "var(--text-primary)" }}>
                      {iv.recommendation.toUpperCase()}
                    </span>
                  )}
                </div>
                {iv.mockFeedback && <p className={styles.itemSub}>{iv.mockFeedback}</p>}
              </div>
            )}

            {iv.mockQuestions.length === 0 ? (
              <button
                className={styles.aiBtn}
                style={{ marginTop: 12 }}
                onClick={() => generateQuestions(iv._id)}
                disabled={generatingFor === iv._id}
              >
                <Sparkles size={14} /> {generatingFor === iv._id ? "Generating..." : "Generate Interview Questions"}
              </button>
            ) : iv.mockAnswers.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <div className={styles.cardTitle}>Answer the Questions</div>
                {iv.mockQuestions.map((q, i) => (
                  <div key={i} className={styles.formGroup}>
                    <label className={styles.label}>Q{i + 1}: {q}</label>
                    <textarea
                      className={styles.answerBox}
                      rows={3}
                      placeholder="Type your answer..."
                      value={(draftAnswers[iv._id] || [])[i] || ""}
                      onChange={(e) => setAnswer(iv._id, i, e.target.value, iv.mockQuestions.length)}
                    />
                  </div>
                ))}
                <button
                  className={styles.primaryBtn}
                  onClick={() => submitAnswers(iv._id, iv.mockQuestions.length)}
                  disabled={submittingFor === iv._id}
                >
                  {submittingFor === iv._id ? "Saving..." : "Submit Answers"}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div className={styles.cardTitle}>Submitted Answers</div>
                {iv.mockQuestions.map((q, i) => (
                  <div key={i} className={styles.qFeedback}>
                    <div className={styles.qFeedbackHeader}><span>Q{i + 1}: {q}</span></div>
                    <p className={styles.qFeedbackText}>{iv.mockAnswers[i] || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div style={{ margin: "32px 0 16px", borderTop: "1px solid var(--border)", paddingTop: 24 }}>
        <h2 className={styles.sectionTitle}>Mock Interview Practice</h2>
      </div>
      <MockInterview />
    </div>
  );
}

// ── Onboarding Tab ─────────────────────────────────────────────────────────────
function OnboardingTab() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [docs, setDocs]         = useState([]);
  const [docName, setDocName]   = useState("");
  const [docUrl, setDocUrl]     = useState("");
  const [docSaving, setDocSaving] = useState(false);

  const refresh = () => candidateAPI.getOnboarding()
    .then((d) => { setData(d); setDocs(d.docs || []); })
    .catch(() => setData({ plan: null }))
    .finally(() => setLoading(false));

  useEffect(() => { refresh(); }, []);

  const [docErr, setDocErr] = useState("");
  const showDocErr = (msg) => { setDocErr(msg); setTimeout(() => setDocErr(""), 4000); };

  const submitDoc = async () => {
    if (!docName.trim() || !docUrl.trim()) { showDocErr("Both name and URL are required"); return; }
    setDocSaving(true);
    try {
      const d = await candidateAPI.submitDoc({ name: docName.trim(), url: docUrl.trim() });
      setDocs(d.docs);
      setDocName(""); setDocUrl("");
    } catch (e) { showDocErr(e.message); }
    finally { setDocSaving(false); }
  };

  const removeDoc = async (docId) => {
    if (!window.confirm("Remove this document?")) return;
    try { const d = await candidateAPI.deleteDoc(docId); setDocs(d.docs); }
    catch (e) { showDocErr(e.message); }
  };

  if (loading) return <div className={styles.section}><div className={styles.loading}>Loading your onboarding plan...</div></div>;

  if (!data?.plan) return (
    <div className={styles.section}>
      <div className={styles.card} style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", color: "var(--cand-accent)", marginBottom: 16 }}><Rocket size={48} /></div>
        <h2 className={styles.cardTitle}>Your Onboarding Plan</h2>
        <p className={styles.empty}>Your personalized onboarding plan will appear here once you've been selected for a position. Complete your profile and ace your interview to unlock it.</p>
      </div>
    </div>
  );

  const { plan, jobTitle, jobCompany, generatedAt } = data;
  const readiness = plan.roleReadiness ?? data.roleReadinessScore;
  const readinessColor = readiness >= 80 ? "var(--color-success)" : readiness >= 60 ? "var(--color-warning)" : "var(--color-error)";
  const meta = plan.onboardingMeta;

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 4 }}>{jobTitle || "Your Role"}</h2>
            <p className={styles.itemSub}>
              {jobCompany}{generatedAt ? ` · Generated ${new Date(generatedAt).toLocaleDateString()}` : ""}
            </p>
            {plan.welcomeMessage && (
              <p style={{ marginTop: 12, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>{plan.welcomeMessage}</p>
            )}
          </div>
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: readinessColor, lineHeight: 1 }}>{readiness}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>Role Readiness</div>
          </div>
        </div>

        {meta && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            {meta.rankingScore       != null && <span className={styles.itemSub}>Ranking <strong style={{ color: "var(--text-primary)" }}>{meta.rankingScore}/100</strong></span>}
            {meta.interviewScore     != null && <span className={styles.itemSub}>Interview <strong style={{ color: "var(--text-primary)" }}>{meta.interviewScore}/100</strong></span>}
            {meta.technicalScore     != null && <span className={styles.itemSub}>Technical <strong style={{ color: "var(--text-primary)" }}>{meta.technicalScore}/100</strong></span>}
            {meta.communicationScore != null && <span className={styles.itemSub}>Comm <strong style={{ color: "var(--text-primary)" }}>{meta.communicationScore}/100</strong></span>}
            {meta.confidenceScore    != null && <span className={styles.itemSub}>Confidence <strong style={{ color: "var(--text-primary)" }}>{meta.confidenceScore}/100</strong></span>}
            {meta.recommendation && (
              <span className={styles.badge} style={{
                background: meta.recommendation === "hire" ? "var(--color-success-bg)" : "var(--color-warning-bg)",
                color:      meta.recommendation === "hire" ? "var(--color-success)"    : "var(--color-warning)",
              }}>{meta.recommendation.toUpperCase()}</span>
            )}
          </div>
        )}
      </div>

      {plan.day1Checklist?.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>Day 1 Checklist</div>
          {plan.day1Checklist.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--text-primary)", alignItems: "flex-start" }}>
              <span style={{ color: "var(--cand-accent)", flexShrink: 0, marginTop: 2 }}><CheckSquare size={14} /></span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {plan.week1Goals?.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>Week 1 Goals</div>
          {plan.week1Goals.map((goal, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 14, color: "var(--text-primary)", alignItems: "flex-start" }}>
              <span style={{ color: "var(--cand-accent)", flexShrink: 0, marginTop: 2 }}><Target size={14} /></span>
              <span>{goal}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        {[["30-Day Goals", plan.day30Goals], ["60-Day Goals", plan.day60Goals], ["90-Day Goals", plan.day90Goals]].map(([label, goals]) =>
          goals?.length > 0 && (
            <div key={label} className={styles.card}>
              <div className={styles.cardTitle}>{label}</div>
              {goals.map((g, i) => <div key={i} className={styles.itemSub} style={{ padding: "4px 0" }}>• {g}</div>)}
            </div>
          )
        )}
      </div>

      {plan.skillsToLearn?.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>Skills Roadmap</div>
          {plan.skillsToLearn.map((s, i) => (
            <div key={i} className={styles.listItem} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{s.skill}</div>
                {s.resource && <div className={styles.itemSub}>{s.resource}</div>}
              </div>
              <span className={styles.badge} style={{
                background: s.priority === "high" ? "var(--color-error-bg)" : s.priority === "medium" ? "var(--color-warning-bg)" : "var(--color-info-bg)",
                color:      s.priority === "high" ? "var(--color-error)"    : s.priority === "medium" ? "var(--color-warning)"    : "var(--color-info)",
              }}>{(s.priority || "medium").toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.twoCol} style={{ marginBottom: 16 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Strengths</div>
          {plan.strengths?.map((s, i) => <div key={i} className={styles.itemSub} style={{ padding: "4px 0" }}>• {s}</div>)}
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Areas to Grow</div>
          {plan.areasToGrow?.map((a, i) => <div key={i} className={styles.itemSub} style={{ padding: "4px 0" }}>• {a}</div>)}
        </div>
      </div>

      {plan.teamIntegrationTips?.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>Team Integration Tips</div>
          {plan.teamIntegrationTips.map((tip, i) => (
            <div key={i} className={styles.itemSub} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {tip}
            </div>
          ))}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardTitle}>Submit Onboarding Documents</div>
        <p className={styles.itemSub} style={{ marginBottom: 14 }}>
          Upload links to your documents (Google Drive, Dropbox, etc.). HR will be able to view them.
        </p>

        {docErr && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 10 }}>{docErr}</div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            className={styles.input}
            style={{ flex: 1, minWidth: 140 }}
            placeholder="Document name (e.g. ID Proof, Degree)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <input
            className={styles.input}
            style={{ flex: 2, minWidth: 220 }}
            placeholder="Link URL (Google Drive, Dropbox...)"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
          />
          <button className={styles.primaryBtn} onClick={submitDoc} disabled={docSaving}>
            {docSaving ? "Saving..." : "Add"}
          </button>
        </div>

        {docs.length === 0
          ? <p className={styles.empty}>No documents submitted yet.</p>
          : docs.map((doc) => (
            <div key={doc._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{doc.name}</div>
                <div className={styles.itemSub}>{new Date(doc.submittedAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <a href={doc.url} target="_blank" rel="noreferrer" className={styles.inlineBtn}>View <ExternalLink size={11}/></a>
                <button className={styles.dangerBtn} style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => removeDoc(doc._id)}>Remove</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab({ user, onUpdate }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone]       = useState(user?.phone || "");
  const [skillInput, setSkillInput] = useState(user?.skills?.join(", ") || "");
  const [resumeUrl, setResumeUrl] = useState(user?.resumeUrl || "");
  const [resumeText, setResumeText] = useState(user?.resumeText || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const save = async () => {
    setSaving(true);
    try {
      const d = await candidateAPI.updateProfile({ fullName, phone, skills: skillInput, resumeUrl, resumeText });
      onUpdate(d.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setSaveErr(e.message); setTimeout(() => setSaveErr(""), 4000); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.card} style={{ maxWidth: 580 }}>
        <h2 className={styles.cardTitle}>My Profile</h2>
        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name</label>
          <input className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Phone Number</label>
          <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" type="tel" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Skills (comma separated)</label>
          <input className={styles.input} value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="React, Node.js, Python..." />
          <div className={styles.skillTags} style={{ marginTop: 8 }}>
            {skillInput.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <span key={s} className={styles.skillTag}>{s}</span>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Resume / Profile Summary</label>
          <textarea
            className={styles.textarea}
            rows={6}
            placeholder="Paste your resume, LinkedIn summary, or key experience here. This is what AI uses to rank you for jobs."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Resume URL</label>
          <input className={styles.input} value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          {resumeUrl && <a href={resumeUrl} target="_blank" rel="noreferrer" className={styles.inlineBtn}>View Resume <ExternalLink size={11}/></a>}
        </div>
        {saveErr && <div style={{ background: "var(--color-error-bg)", color: "var(--color-error)", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 10 }}>{saveErr}</div>}
        <button className={styles.primaryBtn} onClick={save} disabled={saving}>
          {saved ? "Saved" : saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function CandidateDashboard() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const fetchApplied = () => jobsAPI.getApplied().then((d) => setAppliedJobs(d.jobs)).catch(console.error);
  const fetchInterviews = () => interviewAPI.getCandidate().then((d) => setInterviews(d.interviews)).catch(console.error);

  useEffect(() => {
    fetchApplied().finally(() => setLoadingJobs(false));
    fetchInterviews();
  }, []);

  const appliedJobIds = appliedJobs.map((j) => j._id);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "overview"   && <Overview user={user} appliedJobs={appliedJobs} interviews={interviews} onTabChange={setActiveTab} />}
      {activeTab === "jobs"       && <BrowseJobs appliedJobIds={appliedJobIds} onApply={fetchApplied} />}
      {activeTab === "applied"    && <AppliedJobs jobs={appliedJobs} loading={loadingJobs} />}
      {activeTab === "interview"  && <InterviewTab interviews={interviews} onRefresh={fetchInterviews} />}
      {activeTab === "onboarding" && <OnboardingTab />}
      {activeTab === "profile"    && <ProfileTab user={user} onUpdate={updateUser} />}
    </DashboardLayout>
  );
}
