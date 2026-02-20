"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/PaginationControls";
import { useVideoQc } from "./hooks/useVideoQc";
import {
  AccessDeniedState,
  ErrorState,
  LoadingState,
  VideoQcTable,
} from "./components";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export default function VideoQc() {
  const router = useRouter();
  const {
    data,
    loading,
    error,
    currentPage,
    perPage,
    paginationInfo,
    handlePageChange,
    handlePerPageChange,
    hasReadAccess,
    hasWriteAccess,
  } = useVideoQc();

  if (!hasReadAccess) {
    return <AccessDeniedState />;
  }

  if (error) {
    return <ErrorState />;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Video QC</CardTitle>
            {hasWriteAccess && (
              <Button onClick={() => router.push("/video-qc/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            {loading ? (
              <LoadingState />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Project ID</TableHead>
                      <TableHead>Raw Media ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>No. of Attempts</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <VideoQcTable items={data} />
                  </TableBody>
                </Table>

                {data.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <PaginationControls
                      currentPage={currentPage}
                      perPage={perPage}
                      paginationInfo={paginationInfo}
                      onPageChange={handlePageChange}
                      onPerPageChange={handlePerPageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
