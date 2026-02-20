import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React from "react";

export const PGUnsavedChangesDialog = ({
  isDialogOpen,
  setIsAlertOpen,
  handleAlertCancel,
  handleAlertConfirm,
}: {
  isDialogOpen: boolean;
  setIsAlertOpen: (isOpen: boolean) => void;
  handleAlertCancel: () => void;
  handleAlertConfirm: () => void;
}) => {
  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to continue? You
            will lose all your progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleAlertCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAlertConfirm}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
