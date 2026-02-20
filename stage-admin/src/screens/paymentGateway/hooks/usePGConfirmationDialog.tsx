import { useState } from "react";
import { diffPGDetails } from "../helpers/diffPGDetails";
import {
  PaymentGatewayItem,
  PGChangeDiff,
  PGValueChange,
} from "@/types/paymentGateway";

export const usePGConfirmationDialog = (
  closeDialog: () => void,
  handleSubmit: (
    valueChanges: PGValueChange[],
    newOrder: number[] | undefined
  ) => Promise<void>,
  originalPGDetails: PaymentGatewayItem[],
  updatedPGDetails: PaymentGatewayItem[]
) => {
  const [changes, setChanges] = useState<{
    orderChanges: PGChangeDiff[];
    propertyChanges: PGChangeDiff[];
  }>({
    orderChanges: [],
    propertyChanges: [],
  });
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(
    {}
  );

  const calculateChanges = () => {
    if (!originalPGDetails || !updatedPGDetails) return;
    const diff = diffPGDetails(originalPGDetails, updatedPGDetails);
    setChanges(diff);
    const initialCheckedState: { [key: string]: boolean } = {};
    diff.orderChanges.forEach((_, index) => {
      initialCheckedState[`order-${index}`] = false;
    });
    diff.propertyChanges.forEach((_, index) => {
      initialCheckedState[`property-${index}`] = false;
    });
    setCheckedItems(initialCheckedState);
  };

  const handleCheckboxChange = (key: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCancelBtn = () => {
    closeDialog();

    const initialCheckedState: { [key: string]: boolean } = {};
    changes.orderChanges.forEach((_, index) => {
      initialCheckedState[`order-${index}`] = false;
    });
    changes.propertyChanges.forEach((_, index) => {
      initialCheckedState[`property-${index}`] = false;
    });
    setCheckedItems(initialCheckedState);
  };

  function convertChangesToApiPayload() {
    const valueChanges: PGValueChange[] = [];

    changes.propertyChanges.forEach((change) => {
      const { appName, property, updatedValue } = change;

      let entry = valueChanges.find((item) => item.appName === appName);

      if (!entry) {
        entry = { appName };
        valueChanges.push(entry);
      }

      if (property === "paymentGateway" && typeof updatedValue === "string") {
        entry.paymentGateway = updatedValue;
      }

      if (property === "isEnabled" && typeof updatedValue === "boolean") {
        entry.isEnabled = updatedValue;
      }

      if (property === "displayText" && updatedValue === "(Recommended)") {
        entry.isRecommended = true;
      }
    });

    const newOrder = updatedPGDetails.map((updatedItem) => {
      return (
        originalPGDetails.findIndex(
          (originalItem) => originalItem.appName === updatedItem.appName
        ) + 1
      );
    });
    return {
      valueChanges,
      newOrder,
    };
  }

  const handleSaveBtn = () => {
    if (!allChecked) return;
    const { valueChanges, newOrder } = convertChangesToApiPayload();
    handleSubmit(valueChanges, newOrder);
  };

  const allChecked = Object.values(checkedItems).every((checked) => checked);

  return {
    changes,
    checkedItems,
    calculateChanges,
    handleCheckboxChange,
    handleCancelBtn,
    handleSaveBtn,
    allChecked,
  };
};
