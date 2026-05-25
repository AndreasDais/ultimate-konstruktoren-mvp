"use client";

import {
  ENGINEERING_CONTEXT_STORAGE_KEY,
  buildEngineeringContext,
} from "@/lib/engineering-context";
import type { EngineeringContext } from "@/lib/engineering-context";


function isNorwayEngineeringContext(context: EngineeringContext | null | undefined): boolean {
  return context?.region?.countryCode === "NO";
}

export function loadEngineeringContextFromStorage(): EngineeringContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const context = buildEngineeringContext(JSON.parse(raw) as Partial<EngineeringContext>);

    // Norway / NO uses the default Norwegian PILAR flow, not international mode.
    if (isNorwayEngineeringContext(context)) {
      window.localStorage.removeItem(ENGINEERING_CONTEXT_STORAGE_KEY);
      return null;
    }

    return context;
  } catch (error) {
    console.warn("[engineering-context] Could not read local context:", error);
    return null;
  }
}

export function saveEngineeringContextToStorage(context: EngineeringContext): void {
  if (isNorwayEngineeringContext(context)) {
    window.localStorage.removeItem(ENGINEERING_CONTEXT_STORAGE_KEY);
    return;
  }

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
