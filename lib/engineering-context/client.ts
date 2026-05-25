"use client";

import {
  ENGINEERING_CONTEXT_STORAGE_KEY,
  buildEngineeringContext,
} from "@/lib/engineering-context";
import type { EngineeringContext } from "@/lib/engineering-context";

export function loadEngineeringContextFromStorage(): EngineeringContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    return buildEngineeringContext(JSON.parse(raw) as Partial<EngineeringContext>);
  } catch (error) {
    console.warn("[engineering-context] Could not read local context:", error);
    return null;
  }
}

export function saveEngineeringContextToStorage(context: EngineeringContext): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ENGINEERING_CONTEXT_STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.warn("[engineering-context] Could not save local context:", error);
  }
}

export function shortEngineeringContextLabel(context: EngineeringContext | null): string | null {
  if (!context) return null;
  return `${context.region.countryCode} · ${context.standards.label}`;
}
