import { PaymentGatewayItem, PGValueChange } from "@/types/paymentGateway";
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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { usePGConfirmationDialog } from "./hooks/usePGConfirmationDialog";

export const PGConfirmationDialog = ({
  originalPGDetails,
  updatedPGDetails,
  isDialogOpen,
  closeDialog,
  handleSubmit,
}: {
  originalPGDetails: PaymentGatewayItem[];
  updatedPGDetails: PaymentGatewayItem[];
  isDialogOpen: boolean;
  closeDialog: () => void;
  handleSubmit: (
    valueChanges: PGValueChange[],
    newOrder: number[] | undefined
  ) => Promise<void>;
}) => {
  const {
    handleCancelBtn,
    handleSaveBtn,
    calculateChanges,
    changes,
    checkedItems,
    handleCheckboxChange,
    allChecked,
  } = usePGConfirmationDialog(
    closeDialog,
    handleSubmit,
    originalPGDetails,
    updatedPGDetails
  );

  useEffect(() => {
    if (isDialogOpen) {
      calculateChanges();
    }
  }, [isDialogOpen]);

  return (
    <>
      <AlertDialog open={isDialogOpen} onOpenChange={handleCancelBtn}>
        <AlertDialogContent className="!max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Review Changes in PGs</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the changes in the PGs before saving
            </AlertDialogDescription>
          </AlertDialogHeader>
          {changes.orderChanges.length || changes.propertyChanges.length ? (
            <Table className="w-full mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">AppName</TableHead>
                  <TableHead className="text-left">Change Type</TableHead>
                  <TableHead className="text-left">Details</TableHead>
                  <TableHead className="text-left">Verify</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.orderChanges.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">
                      Order Changes
                    </TableCell>
                  </TableRow>
                ) : null}
                {changes.orderChanges
                  .sort((a, b) => (a.updatedIndex ?? 0) - (b.updatedIndex ?? 0))
                  .map((change, index) => (
                    <TableRow key={`order-${index}`}>
                      <TableCell>{change.appName}</TableCell>
                      <TableCell>{change.type}</TableCell>
                      <TableCell>
                        Moved from {change.originalIndex! + 1} to{" "}
                        {change.updatedIndex! + 1}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={checkedItems[`order-${index}`]}
                          onCheckedChange={() =>
                            handleCheckboxChange(`order-${index}`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                {changes.propertyChanges.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">
                      Property Changes
                    </TableCell>
                  </TableRow>
                ) : null}
                {changes.propertyChanges.map((change, index) => (
                  <TableRow key={`property-${index}`}>
                    <TableCell>{change.appName}</TableCell>
                    <TableCell>{change.property}</TableCell>
                    <TableCell>
                      Old: {String(change.originalValue)} <br />
                      New: {String(change.updatedValue)}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={checkedItems[`property-${index}`]}
                        onCheckedChange={() =>
                          handleCheckboxChange(`property-${index}`)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="pt-8 text-lg font-bold"> No Changes to show</p>
          )}
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={handleCancelBtn}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !allChecked ||
                (!changes.orderChanges.length &&
                  !changes.propertyChanges.length)
              }
              onClick={handleSaveBtn}
            >
              Next
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
