import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebounce", () => {
  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update before the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("hello");
  });

  it("updates after the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("world");
  });

  it("resets timer on rapid updates and only fires once", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "c" });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: "d" });
    act(() => { vi.advanceTimersByTime(100); });

    // Only 300ms total has passed since "d" was set — not enough
    expect(result.current).toBe("a");

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("d");
  });

  it("works with number values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(42);
  });

  it("works with object values (same reference after delay)", () => {
    const obj = { count: 1 };
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: obj } }
    );

    const newObj = { count: 2 };
    rerender({ value: newObj });

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(newObj);
  });

  it("does not update when value stays the same", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "same" } }
    );

    rerender({ value: "same" });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe("same");
  });
});
