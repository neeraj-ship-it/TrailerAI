import { otherRefundReason } from "@/utils/constants";
import { useState } from "react";

export const useConfirmationDialog = (
  initiateRefund: (reason: string) => void,
  closeDialog: () => void
) => {
  const [refundReason, setRefundReason] = useState<{
    type: string;
    value: string;
  }>({
    type: "",
    value: "",
  });

  const handleClose = () => {
    closeDialog();
    setRefundReason({
      type: "",
      value: "",
    });
  };

  const handleSelectChange = (value: string) => {
    setRefundReason({ type: value as string, value: "" });
  };

  const handleOtherReasonChange = (value: string) => {
    setRefundReason({ type: otherRefundReason, value });
  };

  const handleSubmit = () => {
    if (refundReason.type === otherRefundReason) {
      initiateRefund(refundReason.value);
    } else {
      initiateRefund(refundReason.type);
    }
    handleClose();
  };

  const isSubmitDisabled =
    !refundReason ||
    refundReason.type === "" ||
    (refundReason.type === otherRefundReason && refundReason.value === "");
  return {
    refundReason,
    handleClose,
    isSubmitDisabled,
    handleSelectChange,
    handleSubmit,
    handleOtherReasonChange,
  };
};
