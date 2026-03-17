"use client";

import { FormEvent, useState } from "react";
import { ArrowBigUp, Flag, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Issue } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { cardHover, fadeUp } from "./motion-presets";
import { useI18n } from "@/components/i18n-provider";

type Props = {
  issue: Issue;
  onRefresh: () => Promise<void>;
};

export function IssueCard({ issue, onRefresh }: Props) {
  const { t, formatDateTime } = useI18n();
  const [comment, setComment] = useState("");
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const canVote = issue.isInUserLocation !== false && issue.status !== "RESOLVED";

  const upvote = async () => {
    if (!canVote) {
      return;
    }

    setActionError("");
    setLoading(true);
    try {
      await apiFetch(`/issues/${issue.id}/upvote`, { method: "POST" });
      await onRefresh();
    } catch (err) {
      setActionError((err as Error).message || "Failed to upvote issue");
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    setActionError("");
    setLoading(true);
    try {
      let imageUrl = "";

      if (commentImage) {
        const formData = new FormData();
        formData.append("image", commentImage);
        const uploadRes = await apiFetch<{ imageUrl: string }>("/upload/image", {
          method: "POST",
          body: formData,
          isFormData: true,
        });
        imageUrl = uploadRes.imageUrl;
      }

      await apiFetch(`/issues/${issue.id}/comments`, {
        method: "POST",
        body: {
          text: comment.trim() || undefined,
          imageUrl: imageUrl || undefined,
        },
      });
      setComment("");
      setCommentImage(null);
      await onRefresh();
    } catch (err) {
      setActionError((err as Error).message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const report = async (e: FormEvent) => {
    e.preventDefault();
    setActionError("");
    setLoading(true);
    try {
      await apiFetch(`/issues/${issue.id}/report`, {
        method: "POST",
        body: { reason: reportReason || t("issue.defaultReportReason") },
      });
      setReportReason("");
      await onRefresh();
    } catch (err) {
      setActionError((err as Error).message || "Failed to report issue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.article
      className="card space-y-4"
      variants={fadeUp}
      initial={false}
      animate="show"
      exit={{ opacity: 0, y: 14 }}
      whileHover={cardHover.hover}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] dark:bg-white/5">{issue.category}</span>
            {issue.departmentTag && <span className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{issue.departmentTag}</span>}
          </div>
          <h3 className="text-xl font-semibold">{issue.title}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {issue.category} • {issue.cityVillage}, {issue.district}, {issue.state}
          </p>
        </div>
        <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold">{issue.status.replace("_", " ")}</span>
      </div>

      <p className="text-sm leading-7 text-[var(--muted)]">{issue.description}</p>

      {issue.imageUrl && (
        // Next.js Image is intentionally avoided because source may be data URLs.
        <img src={issue.imageUrl} alt={issue.title} className="max-h-64 w-full rounded-xl object-cover" />
      )}

      {issue.status === "RESOLVED" && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center gap-2 pb-3">
            <span className="inline-block h-2 w-2 rounded-full bg-green-600"></span>
            <p className="font-semibold text-green-800 dark:text-green-200">Problem Resolved</p>
          </div>
          {issue.resolvedAt && (
            <p className="mb-3 text-xs text-green-700 dark:text-green-300">
              Resolved on {formatDateTime(issue.resolvedAt)}
            </p>
          )}
          {issue.resolutionProofImages && issue.resolutionProofImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-300">Proof of Resolution</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {issue.resolutionProofImages.map((imageUrl, idx) => (
                  <img
                    key={idx}
                    src={imageUrl}
                    alt={`Resolution proof ${idx + 1}`}
                    className="max-h-32 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="btn-secondary flex items-center gap-1" type="button" disabled={loading || !canVote} onClick={upvote}>
          <ArrowBigUp size={16} /> {issue._count.upvotes}
        </button>
        <span className="inline-flex items-center gap-1 text-[var(--muted)]">
          <MessageCircle size={16} /> {issue._count.comments}
        </span>
        <span className="text-xs text-[var(--muted)]">{t("issue.posted")} {formatDateTime(issue.createdAt)}</span>
      </div>

      {!canVote && issue.status === "RESOLVED" && <p className="text-xs text-green-700 dark:text-green-300">This issue has been resolved.</p>}
      {!canVote && issue.isInUserLocation === false && <p className="text-xs text-amber-700 dark:text-amber-300">Voting is allowed only for your primary location.</p>}
      {actionError && <p className="text-xs text-red-500">{actionError}</p>}

      <div className="space-y-2 rounded-[1.35rem] border border-black/10 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("issue.latestComments")}</p>
        {issue.comments.length === 0 && <p className="text-sm text-[var(--muted)]">{t("issue.noComments")}</p>}
        {issue.comments.map((c) => (
          <div key={c.id} className="space-y-2 text-sm">
            {c.text && <p>{c.text}</p>}
            {c.imageUrl && (
              // Next.js Image is intentionally avoided because source may be data URLs.
              <img src={c.imageUrl} alt="Comment attachment" className="max-h-60 w-full rounded-lg object-cover" />
            )}
          </div>
        ))}
        <form onSubmit={addComment} className="space-y-2">
          <input
            className="input"
            placeholder={t("issue.addComment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setCommentImage(e.target.files?.[0] || null)}
            />
            <button className="btn-secondary" type="submit" disabled={loading || (!comment.trim() && !commentImage)}>
              {t("issue.add")}
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={report} className="flex items-center gap-2">
        <input
          className="input"
          placeholder={t("issue.reportReason")}
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
        />
        <button className="btn-secondary inline-flex items-center gap-1" type="submit" disabled={loading}>
          <Flag size={14} /> {t("issue.report")}
        </button>
      </form>
    </motion.article>
  );
}
