"use client";

import { useEffect } from "react";
import type { FriendlyError } from "../../lib/errors";

/**
 * A prominent, dismissible alert that drops in from the top of the War Room
 * whenever a transaction is refused (e.g. claiming a tile already held, or no
 * energy). Auto-dismisses after a beat; tap or wait to clear.
 */
export function Alert({
  error,
  onClose,
  duration = 7000,
}: {
  error: FriendlyError | null;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [error, onClose, duration]);

  if (!error) return null;

  return (
    <div className="alert-wrap" role="alert" aria-live="assertive">
      <div className="alert-toast">
        <span className="alert-icon">⚠</span>
        <div className="alert-body">
          <p className="alert-title">{error.title}</p>
          <p className="alert-message">{error.message}</p>
        </div>
        <button className="alert-close" aria-label="Dismiss" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
