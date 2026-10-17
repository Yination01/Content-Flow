"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Status } from "./ui";

export type Job = {
  id: number;
  content: string;
  platform: "YouTube" | "TikTok";
  schedule: string;
  status: Status;
  attempts: number;
};

type AppState = {
  hasContent: boolean;
  setHasContent: (value: boolean) => void;
  jobs: Job[];
  addJobs: (platforms: string[], schedule: string) => void;
  updateJob: (id: number, status: Status) => void;
};

const StateContext = createContext<AppState | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [hasContent, setHasContent] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1049,
      content: "A creator's guide to consistent content",
      platform: "YouTube",
      schedule: "Tomorrow, 9:00 AM UTC",
      status: "pending",
      attempts: 0,
    },
    {
      id: 1048,
      content: "3 habits that improved my focus",
      platform: "TikTok",
      schedule: "Today, 4:30 PM UTC",
      status: "completed",
      attempts: 1,
    },
    {
      id: 1047,
      content: "Build a calmer morning routine",
      platform: "YouTube",
      schedule: "Jun 18, 10:00 AM UTC",
      status: "failed",
      attempts: 2,
    },
  ]);

  function addJobs(platforms: string[], schedule: string) {
    const additions = platforms.map((platform, index) => ({
      id: Date.now() + index,
      content: "A creator's guide to consistent content",
      platform: platform as Job["platform"],
      schedule,
      status: "pending" as Status,
      attempts: 0,
    }));
    setJobs((current) => [...additions, ...current]);
  }

  function updateJob(id: number, status: Status) {
    setJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, status, attempts: job.attempts + 1 } : job
      )
    );
  }

  return (
    <StateContext.Provider
      value={{ hasContent, setHasContent, jobs, addJobs, updateJob }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(StateContext);
  if (!value) throw new Error("useAppState must be used inside StateProvider");
  return value;
}
