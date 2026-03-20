"use client";
import { useEffect } from "react";

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

/**
 * Global keyboard shortcut hook.
 *
 * - Listens for keydown events on window
 * - Matches key + modifiers (meta, ctrl, shift)
 * - Prevents default browser behavior for matched shortcuts
 * - Does NOT fire when focus is inside input, textarea, or select elements
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't fire shortcuts when user is typing in form elements
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
