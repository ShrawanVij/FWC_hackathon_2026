import { useState, useEffect } from "react";
import InputField from "./InputField";
import { authAPI } from "../services/api.js";
import styles from "./LoginForm.module.css";
import { User, Mail, Key, LockIcon, AlertTriangle } from "./Icons";

const roleConfig = {
  candidate: {
    accent: "var(--cand-accent)",
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to explore opportunities",
    registerTitle: "Join TalentOS",
    registerSubtitle: "Create your free candidate account",
    emailLabel: "Email Address",
    extraField: null,
    loginBtn: "Sign In",
    registerBtn: "Create Account",
    showRegister: true,
  },
  hr: {
    accent: "var(--hr-accent)",
    loginTitle: "HR Portal",
    loginSubtitle: "Manage your talent pipeline",
    registerTitle: "Register HR Account",
    registerSubtitle: "Set up your recruiter access",
    emailLabel: "Work Email",
    extraField: null,
    loginBtn: "Access Portal",
    registerBtn: "Register",
    showRegister: true,
  },
  admin: {
    accent: "var(--admin-accent)",
    loginTitle: "Admin Console",
    loginSubtitle: "Restricted — authorized access only",
    registerTitle: "Create Admin Account",
    registerSubtitle: "Set your admin key to secure this account",
    emailLabel: "Admin Email",
    extraField: { label: "Admin Key", icon: <Key size={16} />, key: "adminKey", autocomplete: "off" },
    loginBtn: "Enter Console",
    registerBtn: "Create Admin Account",
    showRegister: true,
  },
};

export default function LoginForm({ role, onSuccess }) {
  const cfg = roleConfig[role];
  const [mode, setMode] = useState("login");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [extra, setExtra]       = useState("");

  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { reset(); }, [role]);
  useEffect(() => { return () => reset(); }, []);

  const reset = () => {
    setEmail(""); setPassword(""); setFullName(""); setExtra("");
    setError(""); setSuccess(false); setSuccessMsg("");
  };

  const switchMode = (m) => { reset(); setMode(m); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required."); return; }
    setError("");
    setLoading(true);

    try {
      let data;
      if (mode === "login") {
        const payload = { email, password, role };
        if (role === "admin" && extra) payload.adminKey = extra;
        data = await authAPI.login(payload);
      } else {
        const payload = { email, password, role };
        if (role === "candidate") payload.fullName = fullName;
        if (role === "hr")        { payload.fullName = fullName; }
        if (role === "admin")     payload.adminKey  = extra;
        data = await authAPI.register(payload);
      }

      setSuccessMsg(
        mode === "login"
          ? `Welcome back${data.user?.fullName ? ", " + data.user.fullName : ""}!`
          : "Account created! You are now signed in."
      );
      setSuccess(true);

      setTimeout(() => {
        reset();
        onSuccess(data.token, data.user);
      }, 800);

    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";
  const title    = isLogin ? cfg.loginTitle    : cfg.registerTitle;
  const subtitle = isLogin ? cfg.loginSubtitle : cfg.registerSubtitle;
  const btnLabel = isLogin ? cfg.loginBtn      : cfg.registerBtn;

  return (
    <form
      className={`${styles.form} ${styles[role]}`}
      onSubmit={handleSubmit}
      style={{ "--accent": cfg.accent }}
      noValidate
    >
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <div className={styles.fields}>
        {!isLogin && role !== "admin" && (
          <InputField
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User size={16} />}
            accent={cfg.accent}
            autoComplete="name"
            required
          />
        )}

        <InputField
          label={cfg.emailLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={16} />}
          accent={cfg.accent}
          autoComplete="email"
          required
        />

        {cfg.extraField && (isLogin || role === "admin") && (
          <InputField
            label={cfg.extraField.label}
            type={role === "admin" ? "password" : "text"}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            icon={cfg.extraField.icon}
            accent={cfg.accent}
            autoComplete={cfg.extraField.autocomplete}
          />
        )}

        {cfg.extraField && !isLogin && role === "hr" && (
          <InputField
            label={cfg.extraField.label}
            type="text"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            icon={cfg.extraField.icon}
            accent={cfg.accent}
            autoComplete={cfg.extraField.autocomplete}
          />
        )}

        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<LockIcon size={16} />}
          accent={cfg.accent}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
      </div>

      {isLogin && (
        <div className={styles.meta}>
          <label className={styles.remember}>
            <input type="checkbox" className={styles.checkbox} />
            <span className={styles.checkmark} />
            Remember me
          </label>
          <a href="#" className={styles.forgot}>Forgot password?</a>
        </div>
      )}

      {error && (
        <p className={styles.error}>
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      <button
        type="submit"
        className={`${styles.btn} ${loading ? styles.loading : ""} ${success ? styles.success : ""}`}
        disabled={loading || success}
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : success ? (
          <span className={styles.check}>{successMsg}</span>
        ) : (
          btnLabel
        )}
        {!loading && !success && <span className={styles.btnGlow} />}
      </button>

      {cfg.showRegister && (
        <p className={styles.register}>
          {isLogin ? "No account? " : "Already have an account? "}
          <button
            type="button"
            className={styles.link}
            onClick={() => switchMode(isLogin ? "register" : "login")}
          >
            {isLogin ? "Create one free" : "Sign in"}
          </button>
        </p>
      )}
    </form>
  );
}
