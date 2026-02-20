import { PaymentGatewayItem, PGChangeDiff } from "@/types/paymentGateway";

export const diffPGDetails = (
  original: PaymentGatewayItem[],
  updated: PaymentGatewayItem[]
) => {
  const changes: {
    orderChanges: PGChangeDiff[];
    propertyChanges: PGChangeDiff[];
  } = {
    orderChanges: [],
    propertyChanges: [],
  };

  // Check for index changes
  original.forEach((orig, index) => {
    const updatedIndex = updated.findIndex(
      (upd) => upd.packageName === orig.packageName
    );
    if (updatedIndex !== index) {
      changes.orderChanges.push({
        type: "order",
        appName: orig.appName,
        originalIndex: index,
        updatedIndex,
      });
    }
  });

  // Check for property changes
  original.forEach((orig) => {
    const updatedItem = updated.find(
      (upd) => upd.packageName === orig.packageName
    );
    if (updatedItem) {
      (Object.keys(orig) as (keyof PaymentGatewayItem)[]).forEach((key) => {
        if (orig[key] !== updatedItem[key] && key !== "supportedPGs") {
          changes.propertyChanges.push({
            type: "property",
            appName: orig.appName,
            property: key,
            originalValue: orig[key],
            updatedValue: updatedItem[key],
          });
        }
      });
    }
  });

  return changes;
};
