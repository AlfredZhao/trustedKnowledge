import { useEffect, useRef, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 260, onDebouncedChange?: (value: T) => void): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const onDebouncedChangeRef = useRef(onDebouncedChange);

  useEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  useEffect(() => {
    if (Object.is(value, debouncedValue)) return;

    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
      onDebouncedChangeRef.current?.(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [debouncedValue, delayMs, value]);

  return debouncedValue;
}
