import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import CompanyFormModal from "../../components/crm/CompanyFormModal";
import LeadGeneratorModal from "../../components/crm/LeadGeneratorModal";
import { getAllCompanies } from "../../lib/crm/storage";
import { Company, LeadStatus, ServiceType, LEAD_STATUSES, SERVICE_TYPES, CLOSED_STATUSES, LEAD_SOURCES } from "../../lib/crm/types";
import ThemeToggle from "../../lib/theme/ThemeToggle";

// This page only exists to be run locally via `npm run dev`. It talks to
// localStorage, not a database, so there is nothing here worth exposing
// on the public deployment - if it's ever accidentally deployed, this
// is the real, server-enforced block (the same pattern already used by
// pages/api/dev/*.js), not just an unlinked route.
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === "production") {
    return { notFound: true };
  }
  return { props: {} };
};

const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  "Ny lead": { bg: "var(--accent-soft-bg)", text: "var(--accent-hover)" },
  "Kontaktad": { bg: "var(--neutral-bg)", text: "var(--neutral-text)" },
  "Svarat": { bg: "var(--teal-bg)", text: "var(--teal-text)" },
  "Möte bokat": { bg: "var(--purple-bg)", text: "var(--purple-text)" },
  "Offert skickad": { bg: "var(--warning-bg)", text: "var(--warning-text)" },
  "Vunnen": { bg: "var(--success-bg)", text: "var(--success-text)" },
  "Förlorad": { bg: "var(--danger-bg)", text: "var(--danger-text)" }
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span style={{ ...styles.statusBadge, background: colors.bg, color: colors.text }}>
      {status}
    </span>
  );
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}`;
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatSEK(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export default function AdminCrmPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "all">("all");
  const [modalCompany, setModalCompany] = useState<Company | null | undefined>(undefined); // undefined = closed
  const [generatorOpen, setGeneratorOpen] = useState(false);

  useEffect(() => {
    getAllCompanies().then((all) => {
      setCompanies(all);
      setLoaded(true);
    });
  }, []);

  const stats = useMemo(() => {
    return {
      total: companies.length,
      newLeads: companies.filter((c) => c.status === "Ny lead").length,
      meetingsBooked: companies.filter((c) => c.status === "Möte bokat").length,
      quotesSent: companies.filter((c) => c.status === "Offert skickad").length,
      won: companies.filter((c) => c.status === "Vunnen").length
    };
  }, [companies]);

  const commissionOverview = useMemo(() => {
    const pending = companies.filter((c) => c.commissionStatus === "Väntande");
    const paid = companies.filter((c) => c.commissionStatus === "Utbetald");
    const sum = (list: Company[]) => list.reduce((total, c) => total + (c.commissionAmount || 0), 0);

    const perSource = LEAD_SOURCES.map((source) => ({
      source,
      amount: companies
        .filter((c) => (c.leadSource || "Annat") === source)
        .reduce((total, c) => total + (c.commissionAmount || 0), 0)
    }));

    return {
      totalPending: sum(pending),
      totalPaid: sum(paid),
      perSource
    };
  }, [companies]);

  const followUps = useMemo(() => {
    const today = todayIso();
    const open = companies.filter((c) => c.nextFollowUp && !CLOSED_STATUSES.includes(c.status));
    const overdue = open.filter((c) => c.nextFollowUp < today).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));
    const dueToday = open.filter((c) => c.nextFollowUp === today);
    const upcoming = open.filter((c) => c.nextFollowUp > today).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));
    return { overdue, dueToday, upcoming };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return companies.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (serviceFilter !== "all" && c.service !== serviceFilter) return false;

      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        c.contactPerson.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
      );
    });
  }, [companies, search, statusFilter, serviceFilter]);

  const handleSaved = (company: Company) => {
    setCompanies((prev) => {
      const exists = prev.some((c) => c.id === company.id);
      const next = exists ? prev.map((c) => (c.id === company.id ? company : c)) : [...prev, company];
      return [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  };

  const handleDeleted = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div style={styles.page}>
      <Head>
        <title>Effexo CRM</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Effexo CRM</h1>
          <p style={styles.subtitle}>
            {stats.total === 0 ? "Inga företag ännu" : `${stats.total} företag i registret`} · Endast lokalt, sparas i webbläsaren
          </p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/" style={styles.backLink}>← Till effexo.se</Link>
          <ThemeToggle />
          <button type="button" style={styles.secondaryHeaderButton} onClick={() => setGeneratorOpen(true)}>
            🔎 Hitta leads med AI
          </button>
          <button type="button" style={styles.primaryButton} onClick={() => setModalCompany(null)}>
            + Skapa företag
          </button>
        </div>
      </header>

      <section style={styles.statsGrid}>
        <StatCard label="Totala leads" value={stats.total} />
        <StatCard label="Nya leads" value={stats.newLeads} />
        <StatCard label="Möten bokade" value={stats.meetingsBooked} />
        <StatCard label="Offerter" value={stats.quotesSent} />
        <StatCard label="Vunna kunder" value={stats.won} />
      </section>

      {loaded && stats.total > 0 && (
        <section style={styles.commissionSection}>
          <div style={styles.commissionTotals}>
            <div style={styles.commissionTotalCard}>
              <span style={styles.statLabel}>Väntande provision</span>
              <span style={styles.commissionTotalValue}>{formatSEK(commissionOverview.totalPending)}</span>
            </div>
            <div style={styles.commissionTotalCard}>
              <span style={styles.statLabel}>Utbetald provision</span>
              <span style={styles.commissionTotalValue}>{formatSEK(commissionOverview.totalPaid)}</span>
            </div>
          </div>
          <div style={styles.commissionBySource}>
            <h3 style={styles.commissionBySourceTitle}>Provision per leadkälla</h3>
            <div style={styles.commissionSourceList}>
              {commissionOverview.perSource.map(({ source, amount }) => (
                <div key={source} style={styles.commissionSourceRow}>
                  <span>{source}</span>
                  <span style={styles.commissionSourceAmount}>{formatSEK(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {loaded && (followUps.overdue.length > 0 || followUps.dueToday.length > 0 || followUps.upcoming.length > 0) && (
        <section style={styles.followUpGrid}>
          <FollowUpColumn title="Försenade uppföljningar" companies={followUps.overdue} tone="overdue" onOpen={setModalCompany} />
          <FollowUpColumn title="Uppföljningar idag" companies={followUps.dueToday} tone="today" onOpen={setModalCompany} />
          <FollowUpColumn title="Kommande uppföljningar" companies={followUps.upcoming} tone="upcoming" onOpen={setModalCompany} />
        </section>
      )}

      <section style={styles.toolbar}>
        <input
          style={styles.searchInput}
          placeholder="Sök på företag, kontaktperson, stad eller e-post..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}>
          <option value="all">Alla statusar</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select style={styles.filterSelect} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value as ServiceType | "all")}>
          <option value="all">Alla tjänster</option>
          {SERVICE_TYPES.map((service) => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
      </section>

      <section style={styles.tableCard}>
        {!loaded ? (
          <p style={styles.emptyState}>Laddar...</p>
        ) : filteredCompanies.length === 0 ? (
          <p style={styles.emptyState}>
            {companies.length === 0 ? "Inga företag ännu – klicka på \"+ Skapa företag\" för att lägga till ditt första." : "Inga företag matchar sökningen/filtren."}
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Företag</th>
                <th style={styles.th}>Kontaktperson</th>
                <th style={styles.th}>Tjänst</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Källa</th>
                <th style={styles.th}>Nästa uppföljning</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} style={styles.tr} onClick={() => setModalCompany(company)}>
                  <td style={styles.tdName}>{company.name}</td>
                  <td style={styles.td}>{company.contactPerson || "–"}</td>
                  <td style={styles.td}>{company.service}</td>
                  <td style={styles.td}><StatusBadge status={company.status} /></td>
                  <td style={styles.td}>{company.leadSource || "–"}</td>
                  <td style={styles.td}>{company.nextFollowUp ? formatDate(company.nextFollowUp) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalCompany !== undefined && (
        <CompanyFormModal
          company={modalCompany}
          onClose={() => setModalCompany(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {generatorOpen && (
        <LeadGeneratorModal
          companies={companies}
          onClose={() => setGeneratorOpen(false)}
          onLeadAdded={handleSaved}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

function FollowUpColumn({
  title,
  companies,
  tone,
  onOpen
}: {
  title: string;
  companies: Company[];
  tone: "overdue" | "today" | "upcoming";
  onOpen: (company: Company) => void;
}) {
  if (companies.length === 0) return null;

  const toneColor = tone === "overdue" ? "var(--danger-text)" : tone === "today" ? "var(--warning-text)" : "var(--text)";

  return (
    <div style={styles.followUpColumn}>
      <h3 style={{ ...styles.followUpTitle, color: toneColor }}>{title} ({companies.length})</h3>
      <ul style={styles.followUpList}>
        {companies.map((company) => (
          <li key={company.id} style={styles.followUpItem} onClick={() => onOpen(company)}>
            <span style={styles.followUpName}>{company.name}</span>
            <span style={styles.followUpDate}>{formatDate(company.nextFollowUp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--background)",
    padding: "28px 32px 60px",
    color: "var(--text)"
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 16
  },
  title: {
    margin: "0 0 4px",
    fontSize: "1.8rem",
    fontWeight: 800,
    color: "var(--text)"
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "var(--text-muted)"
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  backLink: {
    fontSize: 13,
    color: "var(--text-muted)",
    textDecoration: "none"
  },
  primaryButton: {
    border: "none",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    borderRadius: 10,
    padding: "12px 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)"
  },
  secondaryHeaderButton: {
    border: "1px solid var(--accent-soft-border)",
    background: "var(--accent-soft-bg)",
    color: "var(--accent-hover)",
    borderRadius: 10,
    padding: "12px 20px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer"
  },
  commissionSection: {
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr",
    gap: 14,
    marginBottom: 24
  },
  commissionTotals: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14
  },
  commissionTotalCard: {
    background: "var(--surface)",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "var(--shadow-card)",
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  commissionTotalValue: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "var(--text)"
  },
  commissionBySource: {
    background: "var(--surface)",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "var(--shadow-card)"
  },
  commissionBySourceTitle: {
    margin: "0 0 10px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.02em"
  },
  commissionSourceList: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 16px"
  },
  commissionSourceRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13.5,
    color: "var(--text-secondary)",
    padding: "4px 0"
  },
  commissionSourceAmount: {
    fontWeight: 700,
    color: "var(--text)"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 14,
    marginBottom: 24
  },
  statCard: {
    background: "var(--surface)",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "var(--shadow-card)",
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  statValue: {
    fontSize: "1.7rem",
    fontWeight: 800,
    color: "var(--text)"
  },
  statLabel: {
    fontSize: 13,
    color: "var(--text-muted)",
    fontWeight: 600
  },
  followUpGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginBottom: 24
  },
  followUpColumn: {
    background: "var(--surface)",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "var(--shadow-card)"
  },
  followUpTitle: {
    margin: "0 0 10px",
    fontSize: 14,
    fontWeight: 700
  },
  followUpList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2
  },
  followUpItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 6px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13.5
  },
  followUpName: {
    fontWeight: 600,
    color: "var(--text)"
  },
  followUpDate: {
    color: "var(--text-muted)",
    fontWeight: 600
  },
  toolbar: {
    display: "flex",
    gap: 10,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1.5px solid var(--border-input)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
    boxSizing: "border-box"
  },
  filterSelect: {
    padding: "11px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1.5px solid var(--border-input)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
    minWidth: 160
  },
  tableCard: {
    background: "var(--surface)",
    borderRadius: 14,
    boxShadow: "var(--shadow-card)",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "12px 18px",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "1px solid var(--border)"
  },
  tr: {
    cursor: "pointer",
    borderBottom: "1px solid var(--surface-secondary)"
  },
  td: {
    padding: "14px 18px",
    fontSize: 14,
    color: "var(--text-secondary)"
  },
  tdName: {
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)"
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 700
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: 14,
    margin: 0
  }
};
