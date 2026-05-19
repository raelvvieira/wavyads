import { forwardRef, type ReactNode } from "react";
import { SLIDE_H, SLIDE_W } from "./templates/shared";

interface Props {
  scale?: number; // 1 = native 1080x1350
  children: ReactNode;
}

/**
 * Wraps a template at native 1080x1350 size, but visually scales it down via CSS transform
 * so previews fit any container. The native-size DOM is what gets exported to PNG.
 */
export const SlideCanvas = forwardRef<HTMLDivElement, Props>(({ scale = 0.25, children }, ref) => {
  return (
    <div
      style={{
        width: SLIDE_W * scale,
        height: SLIDE_H * scale,
        overflow: "hidden",
        borderRadius: 12,
        background: "#000",
        flexShrink: 0,
      }}
    >
      <div
        ref={ref}
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
});

SlideCanvas.displayName = "SlideCanvas";
