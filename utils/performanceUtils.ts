/**
 * Performance Optimization Utilities
 * Use these hooks to optimize component rendering
 */

import { memo, useMemo, useCallback } from 'react';

/**
 * Memoized component wrapper - prevents unnecessary re-renders
 * Usage: export default memo(YourComponent);
 */
export { memo };

/**
 * Use this hook to memoize expensive calculations
 * Example:
 * const expensiveValue = useMemo(() => {
 *   return calculateSomething(data);
 * }, [data]);
 */
export { useMemo };

/**
 * Use this hook to create stable callback references
 * Example:
 * const handleClick = useCallback(() => {
 *   doSomething();
 * }, [dependency]);
 */
export { useCallback };

/**
 * Debounce utility for search inputs, resize events, etc.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle utility for expensive operations
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdated = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    }
  }, [value, interval]);

  return throttledValue;
}
