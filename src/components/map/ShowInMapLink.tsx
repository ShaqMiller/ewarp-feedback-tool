import Link from "next/link";
import { GraphIcon } from "@/components/ui/icons";

// Opens the relationship map with this feature, vendor or response highlighted.
export function ShowInMapLink({ projectId, focusId }: { projectId: string; focusId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/map?focus=${encodeURIComponent(focusId)}`}
      className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors hover:bg-chip"
    >
      <GraphIcon className="size-3.5 text-muted" />
      Show in map
    </Link>
  );
}
