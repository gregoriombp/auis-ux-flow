type IconName = "note" | "layers" | "expand" | "collapse" | "external" | "close" | "sun" | "moon" | "copy" | "check" | "back" | "trash" | "warning" | "reset"

const PATHS: Record<IconName, string> = {
  note: "M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5z",
  layers: "M10 3 3 6.5 10 10l7-3.5zM3 10l7 3.5 7-3.5M3 13.5 10 17l7-3.5",
  expand: "M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4",
  collapse: "M8 4v4H4M12 4v4h4M8 16v-4H4M12 16v-4h4",
  external: "M11 4h5v5M16 4l-7 7M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12",
  close: "M5 5l10 10M15 5 5 15",
  sun: "M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.3 4.3l1.1 1.1M14.6 14.6l1.1 1.1M4.3 15.7l1.1-1.1M14.6 5.4l1.1-1.1",
  moon: "M16 11.5A6.5 6.5 0 0 1 8.5 4a6.5 6.5 0 1 0 7.5 7.5z",
  copy: "M7.5 7.5v-2A1.5 1.5 0 0 1 9 4h5.5A1.5 1.5 0 0 1 16 5.5V11a1.5 1.5 0 0 1-1.5 1.5h-2M5.5 7.5H11A1.5 1.5 0 0 1 12.5 9v5.5A1.5 1.5 0 0 1 11 16H5.5A1.5 1.5 0 0 1 4 14.5V9a1.5 1.5 0 0 1 1.5-1.5z",
  check: "M4.5 10.5 8 14l7.5-8",
  back: "M12 5l-5 5 5 5",
  trash: "M4.5 6h11M8 6V4.5h4V6M6 6l.6 9a1 1 0 0 0 1 1h4.8a1 1 0 0 0 1-1L14 6",
  warning: "M10 3.5 2.8 16h14.4zM10 8.5v3.5M10 14.2v.3",
  reset: "M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 4.5v3h3",
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">
      <path d={PATHS[name]} />
    </svg>
  )
}
