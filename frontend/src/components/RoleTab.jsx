import styles from "./RoleTab.module.css";
import { User, Building, Settings } from "./Icons";

const roles = [
  { id: "candidate", label: "Candidate", icon: <User size={14} /> },
  { id: "hr",        label: "HR",        icon: <Building size={14} /> },
  { id: "admin",     label: "Admin",     icon: <Settings size={14} /> },
];

export default function RoleTab({ active, onChange }) {
  return (
    <div className={styles.wrapper} role="tablist" aria-label="Select login role">
      <div className={styles.track}>
        {roles.map((r) => (
          <button
            key={r.id}
            role="tab"
            aria-selected={active === r.id}
            className={`${styles.tab} ${active === r.id ? styles[r.id] : ""}`}
            onClick={() => onChange(r.id)}
          >
            <span className={styles.icon}>{r.icon}</span>
            <span className={styles.label}>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
