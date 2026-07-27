import { useEffect } from "react";

export function useRenderScheduler(draw: () => void): void {
  useEffect(() => {
    if (document.hidden) return;
    const frame = window.requestAnimationFrame(() => {
      draw();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [draw]);
}
