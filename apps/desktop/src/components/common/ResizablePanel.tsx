import { useState, useRef, useCallback, useEffect } from "react";

type ResizablePanelProps = {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  collapsedWidth?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
  collapseDirection?: "left" | "right";
  buttonOffset?: string;
};

export default function ResizablePanel({
  children,
  defaultWidth,
  minWidth = 60,
  maxWidth = 800,
  collapsedWidth = 48,
  isCollapsed,
  onToggleCollapse,
  className = "",
  collapseDirection = "right",
  buttonOffset = "50%",
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const currentWidth = isCollapsed ? collapsedWidth : width;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCollapsed) return;
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [isCollapsed, width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX =
        collapseDirection === "right"
          ? e.clientX - startXRef.current
          : startXRef.current - e.clientX;

      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + deltaX)
      );
      setWidth(newWidth);
    },
    [isDragging, minWidth, maxWidth, collapseDirection]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`flex-shrink-0 relative ${className}`}
      style={{
        width: currentWidth,
        height: "100%",
        transition: isDragging ? "none" : "width 0.3s ease",
      }}
    >
      {/* Panel Content */}
      <div className="h-full w-full overflow-hidden">
        {children}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={`absolute top-0 z-10 h-full w-2 cursor-col-resize ${
            collapseDirection === "right" ? "right-0" : "left-0"
          }`}
          onMouseDown={handleMouseDown}
        >
          <div
            className={`absolute top-1/2 left-1/2 h-8 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all ${
              isDragging
                ? "bg-[#FF9D2E]"
                : "bg-[rgba(255,170,60,.15)] hover:bg-[rgba(255,157,46,.5)]"
            }`}
          />
        </div>
      )}

      {/* Collapse/Expand Button */}
      <button
        onClick={onToggleCollapse}
        className={`absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,170,60,.25)] bg-[rgba(18,18,20,.95)] text-[#8C8C8C] transition-all hover:border-[#FF9D2E] hover:text-[#FFB347] ${
          collapseDirection === "right" ? "right-[-14px]" : "left-[-14px]"
        }`}
        style={{ top: buttonOffset, transform: "translateY(-50%)" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 transition-transform duration-300 ${
            collapseDirection === "right"
              ? isCollapsed
                ? "rotate-180"
                : ""
              : isCollapsed
              ? ""
              : "rotate-180"
          }`}
        >
          <path
            fillRule="evenodd"
            d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
