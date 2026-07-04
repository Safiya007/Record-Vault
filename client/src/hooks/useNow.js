import { useState, useEffect } from "react";

// Returns the current time, updated every `intervalMs`. Powers live
// countdown timers without needing a page refresh or server round-trip.
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  return now;
};

export default useNow;
