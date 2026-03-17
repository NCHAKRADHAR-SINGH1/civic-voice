"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { User } from "@/lib/types";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await apiFetch<{ user: User }>("/auth/session");
        if (active) {
          setUser(response.user);
        }
      } catch (error) {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  const refreshSession = async () => {
    const response = await apiFetch<{ user: User }>("/auth/session");
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  };

  return { user, loading, logout, refreshSession };
}
