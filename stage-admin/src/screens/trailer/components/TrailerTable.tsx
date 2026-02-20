"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { TrailerProjectListItem } from "@/types/trailer";
import { formatTimestamp } from "@/utils/helpers";
import { useRouter } from "next/navigation";

interface TrailerTableProps {
  items: TrailerProjectListItem[];
}

const getStatusBadgeVariant = (completedAt?: Date, error?: string) => {
  if (error) return "destructive";
  if (completedAt) return "default";
  return "secondary";
};

const getStatusText = (item: TrailerProjectListItem) => {
  if (item.completedAt) return "Completed";
  if (item.startedAt) return "Processing";
  return "Pending";
};

const formatDateForDisplay = (date: Date | string | undefined): string => {
  if (!date) return "-";
  try {
    const dateStr = typeof date === "string" ? date : date.toISOString();
    return formatTimestamp(dateStr);
  } catch {
    return "Invalid Date";
  }
};

export function TrailerTable({ items }: TrailerTableProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center py-8">
          <p className="text-muted-foreground">No trailer projects found.</p>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {items.map((item) => (
        <TableRow
          key={item._id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => router.push(`/trailer/${item.projectId}`)}
        >
          <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
          <TableCell className="text-sm">
            {item.contentMetadata?.title || "-"}
          </TableCell>
          <TableCell className="text-sm">{item.contentSlug || "-"}</TableCell>
          <TableCell>
            <Badge variant={getStatusBadgeVariant(item.completedAt)}>
              {getStatusText(item)}
            </Badge>
          </TableCell>
          <TableCell className="font-mono text-xs">
            {item.rawMediaId || "-"}
          </TableCell>
          <TableCell className="text-sm">
            {formatDateForDisplay(item.createdAt)}
          </TableCell>
          <TableCell className="text-sm">
            {formatDateForDisplay(item.updatedAt)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
