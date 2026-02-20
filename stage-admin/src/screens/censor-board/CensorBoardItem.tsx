"use client";

import type { ExcelDownloaderHandle } from "@/components/ExcelDownloader";
import ExcelDownloader from "@/components/ExcelDownloader";
import type { ExcelUploaderHandle } from "@/components/ExcelUploader";
import ExcelUploader from "@/components/ExcelUploader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  CensorBoardContentItem,
  exportAudience,
  useAddUsersToContentMutation,
} from "@/service/modules/censorBoard.api";
import { PlatterContentTypeEnum } from "@/types/platter";
import { PLACEHOLDER_IMAGE_URL } from "@/utils/constants";
import Image from "next/image";
import { useRef, useState, Dispatch, SetStateAction } from "react";
import { getImageUrl } from "../platter-management/helpers/imageParser";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/useToast";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog } from "./CensorBoard";
import { DialectEnum } from "@/types/common";

interface CensorBoardItemProps {
  item: CensorBoardContentItem;
  idx: number;
  dialect: DialectEnum;
  setDialog: Dispatch<SetStateAction<Dialog>>;
}

export default function CensorBoardItem({
  item,
  setDialog,
  dialect,
}: CensorBoardItemProps) {
  const excelUploaderRef = useRef<ExcelUploaderHandle>(null);
  const excelDownloaderRef = useRef<ExcelDownloaderHandle>(null);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const { mutateAsync: addUsersToContent, isPending: isAddingUsers } =
    useAddUsersToContentMutation();

  const handleExcelData = async (data: { [key: string]: string[] }) => {
    const userIds = data.userId;

    if (userIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No user IDs found in the uploaded file",
      });
      return;
    }

    try {
      // call api to add audience
      await addUsersToContent({
        slug: item.slug,
        users: userIds,
        dialect,
        type: item.contentType,
      });

      toast({
        title: "Success",
        description: `Successfully added ${userIds.length} users to ${item.title}`,
      });
    } catch (error) {
      console.error("Error adding users to content:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add users to content. Please try again.",
      });
    }
  };

  const handleDownloadUserIds = async () => {
    try {
      setIsDownloading(true);
      const userIds = await exportAudience({
        slug: item.slug,
        dialect,
        type: item.contentType,
      });

      // Pass the data directly to avoid state update lag
      excelDownloaderRef.current?.download({
        userId: userIds,
      });

      toast({
        title: "Success",
        description: `Successfully exported ${userIds.length} user IDs for ${item.title}`,
      });
    } catch (error) {
      console.error("Error downloading user IDs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download user IDs. Please try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddUsers = () => {
    excelUploaderRef.current?.open();
    // setDialog({
    //   open: true,
    //   type: "publish",
    //   onConfirm: () => excelUploaderRef.current?.open(),
    //   title: "Add Cohort?",
    //   description: "Are you sure you want to add a cohort to this content?",
    //   confirmLabel: "Add",
    //   confirmClassName: "bg-green-500",
    // });
  };

  const handleDelete = () => {
    // Placeholder delete function

    setDialog({
      open: true,
      type: "delete",
      onConfirm: handleConfirmDelete,
      title: "Delete Cohort",
      description: `Are you sure you want to delete the cohort for ${item.title}?`,
      confirmLabel: "Delete",
      confirmClassName: "bg-red-500",
    });
  };

  const handleConfirmDelete = async () => {
    try {
      // Placeholder delete function
      setDialog((prev) => ({
        ...prev,
        open: false,
      }));
      await addUsersToContent({
        slug: item.slug,
        users: [],
        dialect,
        type: item.contentType,
      });

      toast({
        title: "Success",
        description: `Successfully deleted ${item.title}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Error deleting ${item.title}. Please try again.`,
      });
    }
  };
  return (
    <Card variant="content-item">
      <CardHeader variant="content-item" className="relative">
        {false && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-2 z-10 bg-white  text-red-500 rounded-lg border border-gray-200 hover:bg-red-500 hover:text-white"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Image
          src={
            getImageUrl(item.thumbnail, item.contentType) ||
            PLACEHOLDER_IMAGE_URL
          }
          width={400}
          height={300}
          alt="Content thumbnail"
          className="w-full aspect-square object-fill"
          draggable={false}
          unoptimized
        />
      </CardHeader>
      <CardContent variant="content-icon" className="w-full justify-start">
        <Button className="text-gray-400 text-sm" variant={"outline"}>
          {item.contentType === PlatterContentTypeEnum.SHOW ? "Show" : "Movie"}
        </Button>
      </CardContent>
      <CardFooter variant="content-item">
        <div className="font-semibold text-base text-white truncate w-full">
          {item.title}
        </div>
        {!item.isAudienceAdded ? (
          <Button
            className="w-full mt-4"
            variant="red-icon"
            style={{ letterSpacing: "0.05em" }}
            onClick={handleAddUsers}
            disabled={isAddingUsers}
          >
            {isAddingUsers ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Adding Users...
              </>
            ) : (
              "Upload Cohort"
            )}
          </Button>
        ) : (
          <div className="grid grid-cols-2 w-full gap-2 mt-4">
            <Button
              variant="red-icon"
              onClick={handleAddUsers}
              className="w-full truncate"
              disabled={isAddingUsers}
            >
              {isAddingUsers ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Icons.editIcon className="w-5 h-5 mr-2" />
              )}
              {isAddingUsers ? "Adding Users..." : "Change Cohort"}
            </Button>
            <Button
              className="w-full truncate"
              variant="secondary"
              onClick={handleDownloadUserIds}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-6 h-5 mr-2 animate-spin" />
              ) : (
                <Icons.downloadIcon className="w-6 h-5 mr-2" />
              )}
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          </div>
        )}
        <ExcelUploader
          ref={excelUploaderRef}
          columnNames={["userId"]}
          onDataParsed={handleExcelData}
        />
        <ExcelDownloader
          ref={excelDownloaderRef}
          filename={`user_ids_${item.title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`}
          sheetName="User IDs"
          headers={["userId"]}
        />
      </CardFooter>
    </Card>
  );
}
