import type { ReactNode } from "react";

// Line icons on a 24px grid. Size with className (defaults to 16px); color follows currentColor.
function icon(paths: ReactNode) {
  return function Icon({ className = "size-4" }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`shrink-0 ${className}`}
      >
        {paths}
      </svg>
    );
  };
}

export const GridIcon = icon(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
);
export const SparkleIcon = icon(
  <>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16v4M16.5 18h4" />
  </>,
);
export const LayersIcon = icon(
  <>
    <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" />
    <path d="M3.5 12.5l8.5 4.5 8.5-4.5" />
    <path d="M3.5 16.5l8.5 4.5 8.5-4.5" />
  </>,
);
export const BuildingIcon = icon(
  <>
    <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
    <path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M10.5 20.5v-4h3v4" />
  </>,
);
export const MessageIcon = icon(<path d="M4 5.5h16v11H9.5L4 20.5z" />);
export const ClipboardIcon = icon(
  <>
    <rect x="5" y="4.5" width="14" height="16" rx="2" />
    <path d="M9 3.5h6v3H9zM9 11.5h6M9 15.5h4" />
  </>,
);
export const GraphIcon = icon(
  <>
    <circle cx="5.5" cy="6" r="2" />
    <circle cx="18.5" cy="6" r="2" />
    <circle cx="12" cy="18" r="2" />
    <path d="M6.6 7.8l4.3 8.4M17.4 7.8l-4.3 8.4M7.5 6h9" />
  </>,
);
export const GearIcon = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </>,
);
export const FolderIcon = icon(
  <path d="M3.5 7A1.5 1.5 0 015 5.5h5l2 2h7A1.5 1.5 0 0120.5 9v8.5A1.5 1.5 0 0119 19H5a1.5 1.5 0 01-1.5-1.5z" />,
);
export const ChevronDownIcon = icon(<path d="M7 10l5 5 5-5" />);
export const ChevronRightIcon = icon(<path d="M10 7l5 5-5 5" />);
export const CheckIcon = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </>,
);
export const XIcon = icon(<path d="M7 7l10 10M17 7L7 17" />);
export const MoreIcon = icon(
  <>
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="18" cy="12" r="1.2" />
  </>,
);
