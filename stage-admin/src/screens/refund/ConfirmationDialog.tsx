"use client";

import { useState } from "react";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { useConfirmationDialog } from "./hooks/useConfirmationDialog";
import { StepOneDialogContent } from "./StepOneDialogContent";
import { StepTwoDialogContent } from "./StepTwoDialogContent";

interface RefundDialogProps {
  isDialogOpen: boolean;
  initiateRefund: (reason: string) => void;
  closeDialog: () => void;
  userDetails?: string;
}

export const ConfirmationDialog = ({
  isDialogOpen,
  closeDialog,
  initiateRefund,
  userDetails,
}: RefundDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const {
    refundReason,
    handleSelectChange,
    handleSubmit,
    isSubmitDisabled,
    handleClose,
    handleOtherReasonChange,
  } = useConfirmationDialog(initiateRefund, closeDialog);

  const handleNextStep = () => {
    setCurrentStep(2);
  };
  const handlePreviousStep = () => setCurrentStep(1);

  const handleCancel = () => {
    if (currentStep === 2) {
      handlePreviousStep();
    } else {
      handleClose();
    }
  };

  return (
    <AlertDialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <AlertDialogContent>
        {currentStep === 1 ? (
          <StepOneDialogContent
            refundReason={refundReason}
            handleSelectChange={handleSelectChange}
            handleOtherReasonChange={handleOtherReasonChange}
            isSubmitDisabled={isSubmitDisabled}
            handleNextStep={handleNextStep}
            handleCancel={handleCancel}
          />
        ) : (
          <StepTwoDialogContent
            refundReason={refundReason}
            userDetails={userDetails}
            handleSubmit={handleSubmit}
            handleCancel={handleCancel}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
