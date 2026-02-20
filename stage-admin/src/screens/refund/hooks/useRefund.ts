import { useInitiateRefund, useTransactionDetails } from "@/service";
import { RefundSearch, SearchForm } from "@/types/refund";
import { useState } from "react";
import { useToast } from "../../../hooks/useToast";
import { z } from "zod";

const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^\d{10}$/);

export const useRefund = () => {
  const [searchInput, _setSearchInput] = useState<SearchForm>();
  const [searchQuery, setSearchQuery] = useState<SearchForm>();
  const [searchResult, setSearchResult] = useState<RefundSearch[]>();
  const [isValidInput, setIsValidInput] = useState(false);
  const [showInputError, setShowInputError] = useState(false);

  const { toast } = useToast();

  const {
    mutateAsync: getTransactionDetailsMutation,
    isPending: getTransactionDetailsLoading,
  } = useTransactionDetails();

  const {
    mutateAsync: initiateRefundMutation,
    isPending: isInitateRefundLoading,
  } = useInitiateRefund();

  const initSearch = async (fetchAgain = false) => {
    const currSearch = fetchAgain ? searchQuery : searchInput;

    if ((!fetchAgain && !isValidInput) || !currSearch?.value) {
      setShowInputError(true);
      return;
    }

    setSearchResult(undefined);

    const response = await getTransactionDetailsMutation({
      value: currSearch.value,
      type: currSearch.type,
    });
    const data = await response.json();
    setSearchResult(data.transactions);
    setSearchQuery(currSearch);
    setSearchInput();
    setIsValidInput(false);
  };

  const initiateRefund = async (id: string, reason: string) => {
    try {
      const response = await initiateRefundMutation({
        transactionId: id,
        reason,
      });
      if (response.status === 201)
        toast({
          variant: "success",
          title: "Refund Initiated Successfully",
        });
      else {
        toast({
          variant: "destructive",
          title: "Refund failed. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refund failed. Please try again.",
      });
    }
    initSearch(true);
  };

  const setSearchInput = (e?: typeof searchInput) => {
    if (!e || e?.value === "") {
      _setSearchInput(undefined);
    } else _setSearchInput(e);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validateInput = (value: string) => {
      const isEmail = emailSchema.safeParse(value).success;
      const isPhoneNumber = phoneSchema.safeParse(value).success;

      if (/^\d{1,10}$/.test(value)) {
        setIsValidInput(isPhoneNumber);
        setSearchInput({ type: "phoneNumber", value });
      } else {
        setIsValidInput(isEmail);
        setSearchInput({ type: "email", value });
      }
    };
    validateInput(e.target.value);
  };

  return {
    // state
    searchInput,
    searchQuery,
    searchResult,
    isValidInput,
    transactionDetailsLoading: getTransactionDetailsLoading,
    isInitateRefundLoading,
    showInputError,
    setShowInputError,
    handleInputChange,
    initSearch,
    initiateRefund,
  };
};
