import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./DashboardLayout.module.css";
import {
  LayoutGrid, Briefcase, ClipboardList, Mic, Rocket, User,
  Plus, Users, Calendar, Sparkles, Upload, BarChart2, Cpu,
  LogOut, ChevronLeft, ChevronRight, Shield, MenuIcon,
} from "./Icons";

const navItems = {
  candidate: [
    { id: "overview",   icon: <LayoutGrid size={16} />,   label: "Overview"        },
    { id: "jobs",       icon: <Briefcase size={16} />,    label: "Browse Jobs"     },
    { id: "applied",    icon: <ClipboardList size={16} />,label: "Applied Jobs"    },
    { id: "interview",  icon: <Mic size={16} />,          label: "Interviews"      },
    { id: "onboarding", icon: <Rocket size={16} />,       label: "Onboarding"      },
    { id: "profile",    icon: <User size={16} />,         label: "My Profile"      },
  ],
  hr: [
    { id: "overview",    icon: <LayoutGrid size={16} />,   label: "Overview"            },
    { id: "post-job",    icon: <Plus size={16} />,         label: "Post a Job"          },
    { id: "my-jobs",     icon: <Briefcase size={16} />,    label: "My Jobs"             },
    { id: "candidates",  icon: <Users size={16} />,        label: "Candidates"          },
    { id: "interviews",  icon: <Calendar size={16} />,     label: "Interviews"          },
    { id: "ai-ranking",  icon: <Sparkles size={16} />,     label: "AI Resume Screening" },
    { id: "bulk-screen", icon: <Upload size={16} />,       label: "Bulk Screening"      },
    { id: "onboarding",  icon: <Rocket size={16} />,       label: "Onboarding"          },
  ],
  admin: [
    { id: "overview",  icon: <LayoutGrid size={16} />, label: "Overview"        },
    { id: "users",     icon: <Users size={16} />,      label: "Manage Users"    },
    { id: "jobs",      icon: <Briefcase size={16} />,  label: "All Jobs"        },
    { id: "analytics", icon: <BarChart2 size={16} />,  label: "Analytics"       },
    { id: "workforce", icon: <Cpu size={16} />,        label: "Workforce Intel" },
  ],
};

const roleColors = {
  candidate: "var(--cand-accent)",
  hr:        "var(--hr-accent)",
  admin:     "var(--admin-accent)",
};

const roleBadge = { candidate: "Candidate", hr: "HR", admin: "Admin" };

export default function DashboardLayout({ activeTab, onTabChange, children }) {
  const { user, handleLogout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role   = user?.role || "candidate";
  const accent = roleColors[role];
  const items  = navItems[role] || [];

  const handleNavChange = (id) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <div className={styles.shell} style={{ "--accent": accent }}>
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${mobileOpen ? styles.mobileOpen : ""}`}>
        <div className={styles.sideTop}>
          <div className={styles.brand}>
            <div className={styles.brandMark} style={{ background: accent }}>T</div>
            {!collapsed && <span className={styles.brandText}>TalentOS</span>}
          </div>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className={styles.userCard}>
          <div className={styles.avatar} style={{ background: accent }}>
            {(user?.fullName || user?.email || "U")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.fullName || user?.email?.split("@")[0]}</span>
              <span className={styles.userRole} style={{ color: accent }}>{roleBadge[role]}</span>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {items.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.active : ""}`}
              onClick={() => handleNavChange(item.id)}
              title={collapsed ? item.label : ""}
              aria-current={activeTab === item.id ? "page" : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {activeTab === item.id && <span className={styles.activeBar} />}
            </button>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          {!collapsed && <span className={styles.logoutLabel}>Sign out</span>}
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className={styles.burgerBtn} onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
              <MenuIcon size={20} />
            </button>
            <div className={styles.pageTitle}>
              {items.find(i => i.id === activeTab)?.label}
            </div>
          </div>
          <div className={styles.topRight}>
            <span
              className={styles.rolePill}
              style={{ background: `${accent}14`, color: accent, borderColor: `${accent}30` }}
            >
              {roleBadge[role]}
            </span>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
