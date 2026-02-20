"use client";
import {
  useDetails,
  useUpdateDetails,
} from "@/service/modules/paymentGateway.api";
import {
  GETPgConfigResponse,
  PaymentGatewayItem,
  PaymentOptionsTypeEnum,
  PGValueChange,
} from "@/types/paymentGateway";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../hooks/useToast";

export const usePG = () => {
  const { toast } = useToast();

  const [paymentOptionType, setPaymentOptionType] =
    useState<PaymentOptionsTypeEnum>();
  const [paymentOptions, setPaymentOptions] = useState<PaymentGatewayItem[]>();
  const [originalPaymentOptions, setOriginalPaymentOptions] =
    useState<PaymentGatewayItem[]>();

  const {
    mutateAsync: getPgDetailsMutation,
    isPending: isGetPgDetailsLoading,
  } = useDetails();
  const {
    mutateAsync: updatePgDetailsMutation,
    isPending: isUpdatePgDetailsLoading,
  } = useUpdateDetails();

  const containerRef = useRef(null);

  useEffect(() => {
    if (paymentOptionType) fetchPaymentGateways();
  }, [paymentOptionType]);

  const getCurrPaymentOptions = (
    config: GETPgConfigResponse
  ): PaymentGatewayItem[] => {
    switch (paymentOptionType) {
      case PaymentOptionsTypeEnum.CUSTOM:
        return config.customPaymentOptions;
      case PaymentOptionsTypeEnum.PAYWALL:
        return config.paywallPaymentOptions;
      case PaymentOptionsTypeEnum.WEB:
        return config.webPaymentOptions;
      case PaymentOptionsTypeEnum.DEFAULT:
      default:
        return config.paymentOptions;
    }
  };

  const fetchPaymentGateways = async () => {
    const response = await getPgDetailsMutation();
    const data = await response.json();
    const paymentOptions = getCurrPaymentOptions(data);

    paymentOptions.forEach((option) => {
      if (data.possibleAppCombinations[option.appName])
        option.supportedPGs =
          data.possibleAppCombinations[option.appName].supportedPGs;
    });

    setPaymentOptions(paymentOptions);
    setOriginalPaymentOptions(paymentOptions);
  };

  const handlePaymentOptionTypeChanged = (value: PaymentOptionsTypeEnum) => {
    setPaymentOptionType(value);
  };
  const handleListChange = (newList: readonly PaymentGatewayItem[]) => {
    setPaymentOptions([...newList]);
  };

  const handleEnableToggle = (packageName: string) => {
    const updatedGateways = paymentOptions!.map((gateway) =>
      gateway.packageName === packageName
        ? { ...gateway, isEnabled: !gateway.isEnabled }
        : gateway
    );
    setPaymentOptions(updatedGateways);
  };

  const handlePGChange = (packageName: string, value: string) => {
    const updatedGateways = paymentOptions!.map((gateway) =>
      gateway.packageName === packageName
        ? { ...gateway, paymentGateway: value }
        : gateway
    );
    setPaymentOptions(updatedGateways);
  };

  const handleRecommendedChange = (packageName: string) => {
    const updatedGateways = paymentOptions!.map((gateway) => ({
      ...gateway,
      displayText: gateway.packageName === packageName ? "(Recommended)" : "",
    }));
    setPaymentOptions(updatedGateways);
  };

  const handleSave = async (
    valueChanges: PGValueChange[],
    newOrder: number[] | undefined
  ) => {
    try {
      const response = await updatePgDetailsMutation({
        changes: [
          {
            paymentOption: paymentOptionType!,
            valueChanges,
            newOrder,
          },
        ],
      });

      if (response.ok) {
        toast({
          variant: "success",
          title: "PG Updated Successfully",
        });
        fetchPaymentGateways();
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Failed to update PG. Please try again.",
      });
    }
  };

  const handleCancel = () => {
    setPaymentOptions(JSON.parse(JSON.stringify(originalPaymentOptions)));
  };

  const hasUnsavedChanges = useCallback(() => {
    return (
      JSON.stringify(paymentOptions) !== JSON.stringify(originalPaymentOptions)
    );
  }, [paymentOptions, originalPaymentOptions]);

  return {
    paymentOptionType,
    handlePaymentOptionTypeChanged,
    paymentOptions,
    containerRef,
    handleListChange,
    handleEnableToggle,
    handleRecommendedChange,
    handleSave,
    handleCancel,
    originalPaymentOptions,
    isGetPgDetailsLoading,
    handlePGChange,
    hasUnsavedChanges,
    isUpdatePgDetailsLoading,
  };
};
