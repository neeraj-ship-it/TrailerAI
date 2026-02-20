"use client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { formatTimestamp } from "@/utils/helpers";
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@radix-ui/react-alert-dialog";

interface RefundStatusHistory {
  refundStatus: string;
  time: Date;
}

interface RefundDetailModalProps {
  isModalOpen: boolean;
  closeModal: () => void;
  refundDetails: {
    refundTransactionId?: string;
    refundAmount?: number;
    refundStatus?: string;
    refundInitiatedByUserName?: string;
    refundStatusHistory?: RefundStatusHistory[];
    refundVendor?: string;
    refundCreatedAt?: Date;
    refundReason?: string;
  };
}

export const RefundDetailDialog = ({
  isModalOpen,
  closeModal,
  refundDetails,
}: RefundDetailModalProps) => {
  const handleCancel = () => {
    closeModal();
  };

  return (
    <AlertDialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <AlertDialogContent className="p-6 rounded-lg shadow-lg max-w-lg w-full">
        <AlertDialogHeader className="border-b pb-4 mb-4">
          <AlertDialogTitle>
            <div className="flex justify-between items-center text-xl font-semibold">
              Refund Details
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm mt-2">
            Refund initiated by{" "}
            <span className="font-medium">
              {refundDetails.refundInitiatedByUserName}
            </span>{" "}
            on{" "}
            <span className="font-medium">
              {formatTimestamp(refundDetails.refundCreatedAt?.toString() ?? "")}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 break-words w-full">
              <strong className="block text-sm font-medium">
                Transaction ID:
              </strong>
              <span className="break-words">
                {refundDetails.refundTransactionId ?? "N/A"}
              </span>
            </div>
            <div>
              <strong className="block text-sm font-medium">Amount:</strong>
              <span>Rs. {refundDetails.refundAmount?.toFixed(2) ?? "N/A"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong className="block text-sm font-medium">Status:</strong>
              <span>{refundDetails.refundStatus ?? "N/A"}</span>
            </div>
            <div>
              <strong className="block text-sm font-medium">Vendor:</strong>
              <span>{refundDetails.refundVendor ?? "N/A"}</span>
            </div>
          </div>

          <div>
            <strong className="block text-sm font-medium">Reason:</strong>
            <span>{refundDetails.refundReason ?? "No reason provided"}</span>
          </div>

          <div>
            <strong className="block text-sm font-medium">
              Status History:
            </strong>
            <ul className="mt-2 space-y-2 text-sm">
              {refundDetails.refundStatusHistory?.length ? (
                refundDetails.refundStatusHistory.map((status, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{status.refundStatus}</span>
                    <span className="text-gray-500">
                      {formatTimestamp(status.time.toString())}
                    </span>
                  </li>
                ))
              ) : (
                <li>No status history available</li>
              )}
            </ul>
          </div>
        </div>

        <AlertDialogFooter className="mt-6 border-t pt-4 flex justify-end">
          <AlertDialogCancel
            onClick={handleCancel}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
