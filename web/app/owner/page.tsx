"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { AuditLog, OwnerAdmin } from "@/lib/types";
import { useSession } from "@/components/session-utils";
import { containerStagger, fadeUp } from "@/components/motion-presets";

function formatActionLabel(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

export default function OwnerPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<OwnerAdmin[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "CITIZEN" | "ADMIN" | "OWNER">("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [action, setAction] = useState<"ALL" | AuditLog["action"]>("ALL");
  const [updatingMobile, setUpdatingMobile] = useState<string | null>(null);

  const fetchLogs = async () => {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("role", filter);
    if (search.trim()) params.set("q", search.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (action !== "ALL") params.set("action", action);
    const endpoint = params.toString() ? `/owner/audit-logs?${params.toString()}` : "/owner/audit-logs";
    const next = await apiFetch<AuditLog[]>(endpoint);
    setLogs(next);
  };

  const fetchAdmins = async () => {
    const next = await apiFetch<OwnerAdmin[]>("/owner/admins");
    setAdmins(next);
  };

  const setAdminAccess = async (mobile: string, disabled: boolean) => {
    setUpdatingMobile(mobile);
    setError("");
    try {
      await apiFetch("/owner/admins/access", {
        method: "PATCH",
        body: { mobile, disabled },
      });
      await Promise.all([fetchAdmins(), fetchLogs()]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdatingMobile(null);
    }
  };

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    if (user.role !== "OWNER") {
      router.push("/dashboard");
      return;
    }

    void Promise.all([fetchLogs(), fetchAdmins()])
      .catch((err) => setError((err as Error).message));
  }, [loading, router, user]);

  const visibleLogs = useMemo(() => {
    return logs;
  }, [filter, logs]);

  if (loading || !user) {
    return <p>Loading...</p>;
  }

  return (
    <motion.main className="space-y-4" variants={containerStagger} initial={false} animate="show">
      <motion.div className="hero-panel flex flex-wrap items-center justify-between gap-3" variants={fadeUp}>
        <div>
          <p className="eyebrow">Developer Oversight</p>
          <h2 className="text-3xl font-semibold">Owner Audit Console</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Track actions performed by citizens and administrators across the product in one place.</p>
        </div>
        <Link className="btn-secondary" href="/dashboard">Back to feed</Link>
      </motion.div>

      <motion.div className="flex flex-wrap gap-2" variants={fadeUp}>
        {(["ALL", "CITIZEN", "ADMIN", "OWNER"] as const).map((value) => (
          <button key={value} className={filter === value ? "btn-primary" : "btn-secondary"} onClick={() => setFilter(value)} type="button">
            {value === "ALL" ? "All actions" : `${value.toLowerCase()} actions`}
          </button>
        ))}
      </motion.div>

      <motion.section className="card space-y-3" variants={fadeUp}>
        <h3 className="text-xl font-semibold">Search & Date Filters</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="input"
            placeholder="Search summary, entity id, or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
            <option value="ALL">All actions</option>
            <option value="AUTHENTICATED">Authenticated</option>
            <option value="ROLE_UPDATED">Role updated</option>
            <option value="LOCATION_UPDATED">Location updated</option>
            <option value="ISSUE_CREATED">Issue created</option>
            <option value="ISSUE_UPVOTED">Issue upvoted</option>
            <option value="COMMENT_ADDED">Comment added</option>
            <option value="ISSUE_REPORTED">Issue reported</option>
            <option value="ISSUE_STATUS_UPDATED">Issue status updated</option>
            <option value="ISSUE_RESOLVED">Issue resolved</option>
            <option value="ADMIN_ACCESS_UPDATED">Admin access updated</option>
          </select>
          <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" type="button" onClick={() => void fetchLogs()}>Apply filters</button>
        </div>
      </motion.section>

      <motion.section className="card space-y-3" variants={fadeUp}>
        <h3 className="text-xl font-semibold">Admin Access Controls</h3>
        <div className="space-y-3">
          {admins.map((admin) => {
            const disabled = Boolean(admin.adminAccessDisabledAt);
            return (
              <div key={admin.mobile} className="rounded-2xl border border-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{admin.mobile}</p>
                    <p className="text-xs text-[var(--muted)]">{admin.location.cityVillage}, {admin.location.district}, {admin.location.state}</p>
                    <p className="text-xs text-[var(--muted)]">{admin.hasAccount ? `Account role: ${admin.role || "UNKNOWN"}` : "Account not onboarded yet"}</p>
                  </div>
                  <button
                    className={disabled ? "btn-secondary" : "btn-primary"}
                    type="button"
                    disabled={!admin.hasAccount || updatingMobile === admin.mobile}
                    onClick={() => void setAdminAccess(admin.mobile, !disabled)}
                  >
                    {updatingMobile === admin.mobile ? "Updating..." : disabled ? "Enable Admin" : "Disable Admin"}
                  </button>
                </div>
              </div>
            );
          })}
          {admins.length === 0 && <p className="text-sm text-[var(--muted)]">No admin accounts found yet.</p>}
        </div>
      </motion.section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <motion.div className="space-y-3" variants={containerStagger}>
        {visibleLogs.map((log) => (
          <motion.article key={log.id} className="card space-y-2" variants={fadeUp}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold capitalize">{formatActionLabel(log.action)}</p>
                <p className="text-xs text-[var(--muted)]">{log.summary}</p>
              </div>
              <span className="rounded-full border border-black/10 px-2 py-1 text-xs">{log.actorRole || "UNKNOWN"}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
              <span>Actor: {log.actor?.mobile || "System"}</span>
              <span>Entity: {log.entityType}{log.entityId ? ` / ${log.entityId}` : ""}</span>
              <span>{new Date(log.createdAt).toLocaleString()}</span>
            </div>
          </motion.article>
        ))}
        {!error && visibleLogs.length === 0 && <motion.div className="card text-sm text-[var(--muted)]" variants={fadeUp}>No actions logged yet.</motion.div>}
      </motion.div>
    </motion.main>
  );
}