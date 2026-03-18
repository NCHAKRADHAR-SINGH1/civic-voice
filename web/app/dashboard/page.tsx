"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Issue } from "@/lib/types";
import { useSession } from "@/components/session-utils";
import { IssueCard } from "@/components/issue-card";
import { containerStagger, fadeUp } from "@/components/motion-presets";
import { useI18n } from "@/components/i18n-provider";

const categories = ["roads", "drainage", "electricity", "garbage", "water", "civic-service"];

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading: sessionLoading, logout } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [trending, setTrending] = useState<Issue[]>([]);
  const [sort, setSort] = useState<"recent" | "upvoted">("upvoted");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newCategory, setNewCategory] = useState("roads");
  const [departmentTag, setDepartmentTag] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push("/login");
    }
  }, [sessionLoading, user, router]);

  const fetchIssues = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("sort", sort);
      if (category) params.set("category", category);
      if (query) params.set("q", query);

      const [feed, trend] = await Promise.all([
        apiFetch<Issue[]>(`/issues?${params.toString()}`),
        apiFetch<Issue[]>("/issues/trending"),
      ]);

      setIssues(feed);
      setTrending(trend);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchIssues();
    }
  }, [sort, category, user]);

  const createIssue = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let imageUrl = "";
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await apiFetch<{ imageUrl: string }>("/upload/image", {
          method: "POST",
          body: formData,
          isFormData: true,
        });
        imageUrl = uploadRes.imageUrl;
      }

      await apiFetch("/issues", {
        method: "POST",
        body: {
          title,
          description,
          category: newCategory,
          imageUrl: imageUrl || undefined,
          departmentTag: departmentTag || undefined,
        },
      });

      setTitle("");
      setDescription("");
      setDepartmentTag("");
      setImageFile(null);
      await fetchIssues();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || !user) {
    return <p className="text-sm text-[var(--muted)]">{t("dashboard.loadingSession")}</p>;
  }

  return (
    <motion.main
      className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      variants={containerStagger}
      initial={false}
      animate="show"
    >
      <motion.section className="space-y-4" variants={containerStagger}>
        <motion.div className="hero-panel" variants={fadeUp}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Community Feed</p>
              <h2 className="text-3xl">{t("dashboard.feedTitle")}</h2>
            </div>
            <div className="flex gap-2">
              <Link className="btn-secondary" href="/location">{t("dashboard.changeLocation")}</Link>
              {user.role === "ADMIN" && !user.adminAccessDisabledAt && <Link className="btn-secondary" href="/admin">{t("dashboard.admin")}</Link>}
              <button className="btn-secondary" onClick={logout} type="button">{t("dashboard.logout")}</button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "upvoted")}>
              <option value="upvoted">{t("dashboard.mostUpvoted")}</option>
              <option value="recent">{t("dashboard.mostRecent")}</option>
            </select>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t("dashboard.allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("dashboard.search")} />
            <button className="btn-secondary" type="button" onClick={fetchIssues}>{t("dashboard.apply")}</button>
          </div>
        </motion.div>

        {user.role !== "ADMIN" && <motion.form className="card space-y-4" onSubmit={createIssue} variants={fadeUp}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Raise New Issue</p>
              <h3 className="text-2xl">{t("dashboard.createIssue")}</h3>
            </div>
            <div className="stat-chip text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Your location</p>
              <p className="text-sm font-semibold">{user.location?.cityVillage || t("dashboard.notSet")}</p>
            </div>
          </div>
          <input className="input" placeholder={t("dashboard.title")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea
            className="input min-h-24"
            placeholder={t("dashboard.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder={t("dashboard.departmentOptional")}
              value={departmentTag}
              onChange={(e) => setDepartmentTag(e.target.value)}
            />
          </div>
          <input className="input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          <button className="btn-primary" type="submit" disabled={loading}>{t("dashboard.postIssue")}</button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </motion.form>}

        {loading && <p className="text-sm text-[var(--muted)]">{t("dashboard.loadingIssues")}</p>}
        <motion.div className="space-y-4" variants={containerStagger}>
          <AnimatePresence mode="popLayout">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onRefresh={fetchIssues} />
            ))}
          </AnimatePresence>
          {!loading && issues.length === 0 && <p className="text-sm text-[var(--muted)]">{t("dashboard.noIssues")}</p>}
        </motion.div>
      </motion.section>

      <motion.aside className="space-y-4" variants={containerStagger}>
        <motion.section className="card" variants={fadeUp}>
          <h3 className="mb-3 text-xl">{t("dashboard.trending")}</h3>
          <motion.div className="space-y-2" variants={containerStagger}>
            {trending.map((item, idx) => (
              <motion.div key={item.id} className="rounded-xl border border-black/10 p-3" variants={fadeUp}>
                <p className="text-xs text-[var(--muted)]">#{idx + 1} • {item._count.upvotes} {t("dashboard.upvotes")}</p>
                <p className="font-semibold">{item.title}</p>
              </motion.div>
            ))}
            {trending.length === 0 && <p className="text-sm text-[var(--muted)]">{t("dashboard.noTrends")}</p>}
          </motion.div>
        </motion.section>

        <motion.section className="card text-sm text-[var(--muted)]" variants={fadeUp}>
          <p>
            {t("dashboard.primaryLocation")}: {user.location?.cityVillage || t("dashboard.notSet")}, {user.location?.district || ""}
          </p>
          <p className="mt-2">{t("dashboard.statusTracking")}: {t("dashboard.statusFlow")}</p>
        </motion.section>
      </motion.aside>
    </motion.main>
  );
}
