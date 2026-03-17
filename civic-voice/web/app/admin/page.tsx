"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Issue } from "@/lib/types";
import { useSession } from "@/components/session-utils";
import { containerStagger, fadeUp } from "@/components/motion-presets";
import { useI18n } from "@/components/i18n-provider";

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading } = useSession();
  const [posts, setPosts] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [proofImages, setProofImages] = useState<File[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const fetchPosts = async () => {
    try {
      const result = await apiFetch<Issue[]>("/admin/posts");
      setPosts(result);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateStatus = async (id: string, status: "REPORTED" | "IN_PROGRESS") => {
    try {
      await apiFetch(`/admin/posts/${id}/status`, { method: "PATCH", body: { status } });
      await fetchPosts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleResolveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolving) return;

    setIsResolving(true);
    setError("");

    try {
      const imageUrls: string[] = [];

      // Upload each proof image
      for (const file of proofImages) {
        const formData = new FormData();
        formData.append("image", file);
        const uploadRes = await apiFetch<{ imageUrl: string }>("/upload/image", {
          method: "POST",
          body: formData,
          isFormData: true,
        });
        imageUrls.push(uploadRes.imageUrl);
      }

      // Resolve the issue with proof images
      await apiFetch(`/admin/posts/${resolving}/resolve`, {
        method: "POST",
        body: { resolutionProofImages: imageUrls },
      });

      setResolving(null);
      setProofImages([]);
      await fetchPosts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    if (user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    fetchPosts();
  }, [loading, user]);

  if (loading || !user) {
    return <p>{t("admin.loading")}</p>;
  }

  return (
    <motion.main className="space-y-4" variants={containerStagger} initial={false} animate="show">
      <motion.div className="hero-panel flex flex-wrap items-center justify-between gap-4" variants={fadeUp}>
        <div>
          <p className="eyebrow">Assigned Moderation Zone</p>
          <h2 className="text-3xl">{t("admin.title")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Only issues from your assigned location appear here, with proof-based resolution flow.</p>
        </div>
        <Link className="btn-secondary" href="/dashboard">{t("admin.backToFeed")}</Link>
      </motion.div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <motion.div className="space-y-3" variants={containerStagger}>
        {posts.map((post) => (
          <motion.article key={post.id} className="card" variants={fadeUp} whileHover={{ y: -2 }}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{post.cityVillage}, {post.district}</p>
                <h3 className="text-xl font-semibold">{post.title}</h3>
              </div>
              <span className="text-xs text-[var(--muted)]">{t("admin.reports")}: {post._count.reports}</span>
            </div>
            <p className="mb-3 text-sm leading-7 text-[var(--muted)]">{post.description}</p>
            <div className="flex flex-wrap gap-2">
              <button 
                className="btn-secondary" 
                onClick={() => updateStatus(post.id, "REPORTED")}
                disabled={isResolving}
              >
                {t("admin.reported")}
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => updateStatus(post.id, "IN_PROGRESS")}
                disabled={isResolving}
              >
                {t("admin.inProgress")}
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setResolving(post.id)}
                disabled={isResolving || post.status === "RESOLVED"}
              >
                {post.status === "RESOLVED" ? "✓ Resolved" : t("admin.resolved")}
              </button>
            </div>
          </motion.article>
        ))}
      </motion.div>

      {/* Resolve Modal */}
      {resolving && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="card m-4 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Resolve Issue</h3>
              <button 
                onClick={() => {
                  setResolving(null);
                  setProofImages([]);
                  setError("");
                }}
                className="text-[var(--muted)] hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Proof Photos (Before & After)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setProofImages(Array.from(e.target.files || []))}
                  className="input"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Upload 1-5 photos showing the resolution
                </p>
              </div>

              {proofImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {proofImages.map((file, idx) => (
                    <div key={idx} className="relative">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`Proof ${idx + 1}`}
                        className="max-h-24 w-full rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setProofImages(proofImages.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResolving(null);
                    setProofImages([]);
                    setError("");
                  }}
                  className="btn-secondary flex-1"
                  disabled={isResolving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={isResolving || proofImages.length === 0}
                >
                  {isResolving ? "Resolving..." : "Resolve & Upload Proof"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}
