"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VideoQcItem, VideoQcStatusEnum } from "@/types/videoQc";
import { formatTimestamp } from "@/utils/helpers";
import { useRouter } from "next/navigation";

interface VideoQcTableProps {
  items: VideoQcItem[];
}

const getStatusBadgeVariant = (status: VideoQcStatusEnum) => {
  switch (status) {
    case VideoQcStatusEnum.APPROVED:
      return "default";
    case VideoQcStatusEnum.PROCESSING:
      return "secondary";
    case VideoQcStatusEnum.FAILED:
      return "destructive";
    case VideoQcStatusEnum.PENDING:
    default:
      return "outline";
  }
};

const formatDateForDisplay = (date: Date | string): string => {
  try {
    const dateStr = typeof date === "string" ? date : date.toISOString();
    return formatTimestamp(dateStr);
  } catch {
    return "Invalid Date";
  }
};

export function VideoQcTable({ items }: VideoQcTableProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center py-8">
          <p className="text-muted-foreground">No video QC records found.</p>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {items.map((item) => (
        <TableRow
          key={item.id}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => router.push(`/video-qc/${item.id}`)}
        >
          <TableCell className="font-mono text-xs">{item.id}</TableCell>
          <TableCell className="font-mono text-xs">{item.projectId}</TableCell>
          <TableCell className="font-mono text-xs">
            {item.rawMediaId || "-"}
          </TableCell>
          <TableCell>
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>{item.noOfAttempts}</TableCell>
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
