import styles from "./RoleTab.module.css";

const roles = [
  { id: "candidate", label: "Candidate" },
  { id: "hr",        label: "HR" },
  { id: "admin",     label: "Admin" },
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
            
            <span className={styles.label}>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
