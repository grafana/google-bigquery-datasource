import { DependencyList, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Local replacements for the handful of `react-use` hooks the plugin relied on.
 * Keeping them here avoids pulling in the entire `react-use` dependency.
 */

export interface AsyncState<T> {
  loading: boolean;
  error?: Error;
  value?: T;
}

// Returns a getter that reports whether the component is still mounted, so async
// callbacks can avoid setting state after unmount.
function useMountedState(): () => boolean {
  const mountedRef = useRef(false);
  const get = useCallback(() => mountedRef.current, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return get;
}

/**
 * Wraps an async function, tracking its loading/value/error state. Returns the
 * current state and a callback that invokes the function. Only the result of the
 * most recent call is applied to state.
 */
export function useAsyncFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  deps: DependencyList = []
): [AsyncState<Awaited<ReturnType<T>>>, T] {
  const [state, setState] = useState<AsyncState<Awaited<ReturnType<T>>>>({ loading: false });
  const lastCallId = useRef(0);
  const isMounted = useMountedState();

  const callback = useCallback((...args: Parameters<T>) => {
    const callId = ++lastCallId.current;

    if (!state.loading) {
      setState((prev) => ({ ...prev, loading: true }));
    }

    return fn(...args).then(
      (value) => {
        if (isMounted() && callId === lastCallId.current) {
          setState({ value, loading: false });
        }
        return value;
      },
      (error) => {
        if (isMounted() && callId === lastCallId.current) {
          setState({ error, loading: false });
        }
        return error;
      }
    );
    // The deps are forwarded from the caller, mirroring react-use's API.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  return [state, callback as unknown as T];
}

/**
 * Runs an async function on mount and whenever `deps` change, exposing its
 * loading/value/error state.
 */
export function useAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  deps: DependencyList = []
): AsyncState<Awaited<ReturnType<T>>> {
  const [state, callback] = useAsyncFn(fn, deps);

  useEffect(() => {
    callback();
  }, [callback]);

  return state;
}

/**
 * Calls `fn` after `ms` milliseconds, resetting the timer whenever `deps`
 * change (and once on mount). Returns an `isReady` getter and a `cancel`
 * function, mirroring react-use's signature.
 */
export function useDebounce(
  fn: () => void,
  ms = 0,
  deps: DependencyList = []
): [() => boolean | null, () => void] {
  const isReadyRef = useRef<boolean | null>(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const isReadyGetter = useCallback(() => isReadyRef.current, []);

  const cancel = useCallback(() => {
    isReadyRef.current = null;
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
  }, []);

  useEffect(() => {
    isReadyRef.current = false;
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    timeout.current = setTimeout(() => {
      isReadyRef.current = true;
      fnRef.current();
    }, ms);

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
    // The deps are forwarded from the caller, mirroring react-use's API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [isReadyGetter, cancel];
}

export interface CopyToClipboardState {
  value?: string;
  error?: Error;
  noUserInteraction: boolean;
}

/**
 * Returns the result of the last copy attempt and a function to copy text to the
 * clipboard.
 */
export function useCopyToClipboard(): [CopyToClipboardState, (value: string) => void] {
  const isMounted = useMountedState();
  const [state, setState] = useState<CopyToClipboardState>({ noUserInteraction: true });

  const copyToClipboard = useCallback(
    (value: string) => {
      if (!isMounted()) {
        return;
      }

      const onSuccess = () => setState({ value, error: undefined, noUserInteraction: true });
      const onError = (error: Error) => setState({ value, error, noUserInteraction: true });

      try {
        if (navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(value).then(onSuccess, onError);
          return;
        }

        // Fallback for non-secure contexts where the async Clipboard API is unavailable.
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('copy');
        document.body.removeChild(textarea);
        onSuccess();
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [isMounted]
  );

  return [state, copyToClipboard];
}

export interface MeasureRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const defaultMeasureRect: MeasureRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

/**
 * Observes an element's content rect via ResizeObserver. Returns a callback ref
 * to attach to the element and the latest measured rect.
 */
export function useMeasure<E extends Element = Element>(): [(element: E | null) => void, MeasureRect] {
  const [element, ref] = useState<E | null>(null);
  const [rect, setRect] = useState<MeasureRect>(defaultMeasureRect);

  const observer = useMemo(
    () =>
      new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { x, y, width, height, top, left, bottom, right } = entry.contentRect;
          setRect({ x, y, width, height, top, left, bottom, right });
        }
      }),
    []
  );

  useEffect(() => {
    if (!element) {
      return;
    }
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element, observer]);

  return [ref, rect];
}
