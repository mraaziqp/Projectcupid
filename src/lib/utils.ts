import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { lazy, ComponentType } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Failed to load component chunk, reloading page...", error);
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }
  });
}
