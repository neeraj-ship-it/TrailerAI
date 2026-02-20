"use client";
import ReactDraggableList from "react-draggable-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RiCloseLine, RiSaveLine } from "react-icons/ri";
import {
  PaymentGatewayItem,
  PaymentOptionsTypeEnum,
} from "@/types/paymentGateway";
import {
  PGDraggableListCommonProps,
  PGDraggableListItemWrapper,
} from "./PGDraggableListItem";
import { usePG } from "./hooks/usePg";
import { PGConfirmationDialog } from "./PGConfirmationDialog";
import { useDialog } from "@/hooks/useDialog";
import { Spinner } from "@/components/ui/spinner";
import { BackdropSpinner } from "@/components/ui/backdrop-spinner";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { PGUnsavedChangesDialog } from "./PGUnsavedChangesDialog";

export const PaymentGateway = () => {
  const {
    paymentOptionType,
    containerRef,
    handleCancel,
    handleEnableToggle,
    handleListChange,
    handleRecommendedChange,
    handleSave,
    paymentOptions,
    handlePGChange,
    handlePaymentOptionTypeChanged,
    originalPaymentOptions,
    isGetPgDetailsLoading,
    hasUnsavedChanges,
    isUpdatePgDetailsLoading,
  } = usePG();
  const { isDialogOpen, closeDialog, openDialog, dialogData } = useDialog<{
    type: "confirmation" | "unsavedChanges";
    data?: {
      newScreenType: PaymentOptionsTypeEnum;
    };
  }>();

  const { checkPrivilege } = useUser();

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {paymentOptions && originalPaymentOptions && (
        <PGConfirmationDialog
          isDialogOpen={isDialogOpen && dialogData?.type === "confirmation"}
          closeDialog={closeDialog}
          updatedPGDetails={paymentOptions}
          originalPGDetails={originalPaymentOptions}
          handleSubmit={handleSave}
        />
      )}
      <PGUnsavedChangesDialog
        isDialogOpen={isDialogOpen && dialogData?.type === "unsavedChanges"}
        setIsAlertOpen={closeDialog}
        handleAlertCancel={closeDialog}
        handleAlertConfirm={() => {
          handlePaymentOptionTypeChanged(
            dialogData?.data?.newScreenType as PaymentOptionsTypeEnum
          );
          closeDialog();
        }}
      />
      <Card className="mb-12">
        <CardContent className="p-4">
          <Label
            htmlFor="payment-option-select"
            className="text-sm font-medium text-foregroundSecondary mb-4 block"
          >
            Please Select Payment Option Type
          </Label>
          <Select
            onValueChange={(value) => {
              if (hasUnsavedChanges()) {
                openDialog({
                  type: "unsavedChanges",
                  data: { newScreenType: value as PaymentOptionsTypeEnum },
                });
              } else
                handlePaymentOptionTypeChanged(value as PaymentOptionsTypeEnum);
            }}
            value={paymentOptionType}
          >
            <SelectTrigger
              id="payment-option-select"
              className="w-full"
              autoFocus
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PaymentOptionsTypeEnum).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {paymentOptions && !isGetPgDetailsLoading && (
        <>
          <div ref={containerRef} className="mb-10">
            <ReactDraggableList<
              PaymentGatewayItem,
              PGDraggableListCommonProps,
              PGDraggableListItemWrapper
            >
              itemKey="packageName"
              template={PGDraggableListItemWrapper}
              list={paymentOptions}
              onMoveEnd={handleListChange}
              container={() => containerRef.current}
              commonProps={{
                onEnableToggle: handleEnableToggle,
                onRecommendedChange: handleRecommendedChange,
                onPGChange: handlePGChange,
              }}
            />
          </div>
          {checkPrivilege(
            ProtectedRoutesEnum.PaymentGateway,
            PrivilegeTypesEnum.UPDATE
          ) && (
            <div className="flex justify-end space-x-4">
              <Button onClick={handleCancel} variant="outline" className="w-32">
                <RiCloseLine className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => {
                  openDialog({
                    type: "confirmation",
                  });
                }}
                className="w-32"
              >
                <RiSaveLine className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </>
      )}
      {isGetPgDetailsLoading && (
        <div className="h-[400px] rounded-lg w-full flex justify-center items-center bg-gray-900">
          <Spinner />
        </div>
      )}
      {!paymentOptions && !isGetPgDetailsLoading && (
        <div className="h-[400px] rounded-lg w-full flex justify-center items-center bg-gray-900">
          <p className="text-xl font-bold">
            Please Select Screen type to proceed further.
          </p>
        </div>
      )}
      {isUpdatePgDetailsLoading && <BackdropSpinner />}
    </div>
  );
};
