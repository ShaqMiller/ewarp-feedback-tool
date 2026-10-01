"use client";

import { useEffect, useState } from "react";
import { mockData } from "@/lib/mockData";
import type { FeedbackData } from "@/lib/types";

export type DataSource = "mock" | "live";

// Set this in .env.local so "Live data" can reach the backend.
const API_URL = process.env.NEXT_PUBLIC_FEEDBACK_API_URL;

type State = {
  data: FeedbackData | null;
  loading: boolean;
  error: string | null;
};

async function loadFeedback(source: DataSource, signal: AbortSignal): Promise<FeedbackData> {
  if (source === "mock") return mockData;

  if (!API_URL) {
    throw new Error(
      "Live data isn't set up yet. Add NEXT_PUBLIC_FEEDBACK_API_URL to .env.local and restart the dev server.",
    );
  }

  const res = await fetch(API_URL, { signal });
  if (!res.ok) throw new Error(`The backend answered with an error (${res.status}).`);
  const json = await res.json();
  // Features come from the AI step, which may not exist yet on the backend.
  return { ...json, features: json.features ?? [] };
}

export function useFeedbackMap(source: DataSource): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    loadFeedback(source, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, loading: false, error: err.message });
      });

    return () => controller.abort();
  }, [source]);

  return state;
}
