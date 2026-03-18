"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Issue } from "@/lib/types";
import { useSession } from "@/components/session-utils";
import { IssueCard } from "@/components/issue-card";
import { containerStagger, fadeUp } from "@/components/motion-presets";
import { useI18n } from "@/components/i18n-provider";

const FORCE_ROLE_SELECTION_KEY = "civic_voice_force_role_selection";

type DistrictLookupResult = {
  success: boolean;
  data?: {
    data: Array<{
      area?: string;
      state?: string;
      stateName?: string;
      district?: string;
      districtName?: string;
    }>;
    totalPages?: number;
  };
};

type IndiaPincodeClient = {
  getAllStates: () => string[];
  getDistrictsByState: (state: string) => {
    success: boolean;
    data?: string[];
  };
  getByState: (state: string, options?: { limit?: number; page?: number }) => DistrictLookupResult;
  getByDistrict: (district: string, options?: { limit?: number; page?: number }) => DistrictLookupResult;
};

export default function LocationPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, loading, refreshSession } = useSession();
  const [country, setCountry] = useState("India");
  const [stateValue, setStateValue] = useState("");
  const [district, setDistrict] = useState("");
  const [cityVillage, setCityVillage] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [cityVillages, setCityVillages] = useState<string[]>([]);
  const [pincodeClient, setPincodeClient] = useState<IndiaPincodeClient | null>(null);
  const [error, setError] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Issues view mode
  const [showingIssues, setShowingIssues] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    let active = true;

    async function initLocations() {
      try {
        const { getIndiaPincode } = await import("india-pincode/browser");
        const client = (await getIndiaPincode()) as unknown as IndiaPincodeClient;
        if (!active) {
          return;
        }

        const allStates = client.getAllStates();
        const collator = new Intl.Collator(locale);
        const sortedStates = [...allStates].sort((a, b) => collator.compare(a, b));
        setPincodeClient(client);
        setStates(sortedStates);

        // Force explicit selection so the form doesn't silently default to first state.
        setStateValue("");
        setDistrict("");
        setDistricts([]);
      } catch (loadError) {
        if (active) {
          setError((loadError as Error).message || "Unable to load India locations");
        }
      } finally {
        if (active) {
          setLoadingLocations(false);
        }
      }
    }

    initLocations();

    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => {
    if (!pincodeClient || !stateValue) {
      setDistricts([]);
      setDistrict("");
      setCityVillage("");
      setCityVillages([]);
      return;
    }

    const districtResponse = pincodeClient.getDistrictsByState(stateValue);
    const collator = new Intl.Collator(locale);
    const nextDistricts = districtResponse.success && districtResponse.data ? [...districtResponse.data].sort((a, b) => collator.compare(a, b)) : [];
    setDistricts(nextDistricts);
    const firstDistrict = nextDistricts[0] || "";
    setDistrict(firstDistrict);
    setCityVillage("");
    setCityVillages([]);
  }, [pincodeClient, stateValue, locale]);

  useEffect(() => {
    if (!pincodeClient || !stateValue || !district) {
      setCityVillages([]);
      setCityVillage("");
      return;
    }

    const client = pincodeClient;

    let active = true;

    async function loadDistrictVillages() {
      setLoadingVillages(true);
      try {
        const villages = new Set<string>();
        const normalizedDistrict = district.trim().toLowerCase();

        // Query by state first to avoid cross-state district collisions (e.g. same district names).
        const firstPage = client.getByState(stateValue, { limit: 1000, page: 1 });

        if (!firstPage.success || !firstPage.data) {
          if (active) {
            setCityVillages([]);
          }
          return;
        }

        for (const row of firstPage.data.data) {
          const rowDistrict = (row.districtName || row.district || "").trim().toLowerCase();
          if (row.area && rowDistrict === normalizedDistrict) {
            villages.add(row.area);
          }
        }

        const totalPages = firstPage.data.totalPages || 1;

        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = client.getByState(stateValue, { limit: 1000, page });
          if (!nextPage.success || !nextPage.data) {
            continue;
          }
          for (const row of nextPage.data.data) {
            const rowDistrict = (row.districtName || row.district || "").trim().toLowerCase();
            if (row.area && rowDistrict === normalizedDistrict) {
              villages.add(row.area);
            }
          }
        }

        if (!active) {
          return;
        }

        const collator = new Intl.Collator(locale);
        const allVillages = Array.from(villages).sort((a, b) => collator.compare(a, b));
        setCityVillages(allVillages);
        setCityVillage((current) => current || allVillages[0] || "");
      } catch {
        if (active) {
          setCityVillages([]);
        }
      } finally {
        if (active) {
          setLoadingVillages(false);
        }
      }
    }

    loadDistrictVillages();

    return () => {
      active = false;
    };
  }, [pincodeClient, district, stateValue, locale]);

  const formatLocationLabel = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const canSubmit = useMemo(() => {
    return Boolean(country && stateValue && district && cityVillage.trim()) && !loadingLocations;
  }, [country, stateValue, district, cityVillage, loadingLocations]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(t("location.completeFields"));
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch<{ user: { location?: { country?: string; state?: string; district?: string; cityVillage?: string } } }>(
        "/location/primary",
        {
          method: "PUT",
          body: { country, state: stateValue, district, cityVillage: cityVillage.trim() },
        }
      );

      if (response.user.location) {
        await refreshSession();
        localStorage.setItem(FORCE_ROLE_SELECTION_KEY, "true");
        router.push("/role");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl">
      {!showingIssues ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hero-panel">
            <p className="eyebrow">Location Intelligence</p>
            <h2 className="mb-4 text-4xl leading-tight">{t("location.title")}</h2>
            <p className="mb-8 text-sm leading-7 text-[var(--muted)] sm:text-base">{t("location.subtitle")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="stat-chip">
                <p className="text-sm font-semibold">Duplicate-aware</p>
                <p className="mt-1 text-xs text-[var(--muted)]">See existing issues before posting another report.</p>
              </div>
              <div className="stat-chip">
                <p className="text-sm font-semibold">Village-level</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Discover issues right down to city or village scope.</p>
              </div>
              <div className="stat-chip">
                <p className="text-sm font-semibold">Vote where you live</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Support problems affecting your actual locality.</p>
              </div>
            </div>
          </div>
          <section className="card p-6 sm:p-8">
            <h3 className="mb-1 text-2xl font-semibold">Set your primary location</h3>
            <p className="mb-5 text-sm text-[var(--muted)]">This controls what appears in your community feed and what you can upvote.</p>

            <form className="space-y-3" onSubmit={submit}>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="India">{t("location.india")}</option>
            </select>

            <select
              className="input"
              value={stateValue}
              onChange={(e) => setStateValue(e.target.value)}
              disabled={loadingLocations || states.length === 0}
            >
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s} value={s}>{formatLocationLabel(s)}</option>
              ))}
            </select>

            <select
              className="input"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={loadingLocations || districts.length === 0}
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d} value={d}>{formatLocationLabel(d)}</option>
              ))}
            </select>

            <input
              className="input"
              value={cityVillage}
              onChange={(e) => setCityVillage(e.target.value)}
              list="city-village-options"
              placeholder={loadingVillages ? t("location.loadingVillage") : t("location.typeVillage")}
              disabled={loadingLocations}
              required
            />
            <datalist id="city-village-options">
              {cityVillages.map((cv) => (
                <option key={cv} value={cv} />
              ))}
            </datalist>

            {loadingLocations && <p className="text-sm text-[var(--muted)]">{t("location.loadingAll")}</p>}
            {!loadingLocations && loadingVillages && <p className="text-sm text-[var(--muted)]">{t("location.loadingDistrictVillages")}</p>}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => router.push("/login")}
                className="btn-secondary flex-1" 
                type="button"
                disabled={saving}
              >
                Back
              </button>
              <button className="btn-primary flex-1" type="submit" disabled={saving || !canSubmit}>
                {saving ? t("location.saving") : "Next"}
              </button>
            </div>
            </form>
          </section>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="hero-panel">
            <p className="eyebrow">Community Snapshot</p>
            <h2 className="mb-2 text-3xl">Issues in your area</h2>
            <p className="text-sm text-[var(--muted)]">
              {formatLocationLabel(cityVillage)}, {formatLocationLabel(district)} • {formatLocationLabel(stateValue)}
            </p>
          </div>

          {loadingIssues ? (
            <div className="card p-12 text-center">
              <p className="text-[var(--muted)]">Loading issues...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="mb-4 text-[var(--muted)]">No issues reported in your area yet.</p>
              <p className="mb-6 text-sm text-[var(--muted)]">Be the first to report a civic issue!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn-primary flex-1"
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              className="space-y-4"
              variants={containerStagger}
              initial="hidden"
              animate="show"
            >
              {issues.map((issue, idx) => (
                <motion.div key={issue.id} variants={fadeUp} custom={idx}>
                  <IssueCard issue={issue} onRefresh={async () => {}} />
                </motion.div>
              ))}
              
              <motion.div className="pt-6" variants={fadeUp}>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn-primary w-full"
                >
                  Continue to Dashboard
                </button>
              </motion.div>
            </motion.div>
          )}

          {error && (
            <div className="card border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
