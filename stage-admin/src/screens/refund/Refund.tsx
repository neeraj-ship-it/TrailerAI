"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefundTable } from "./RefundTable";
import { useRefund } from "@/screens/refund/hooks/useRefund";
import { Card, CardContent } from "@/components/ui/card";
import { IoMail, IoCall, IoSearch } from "react-icons/io5";
import { Loader } from "@/components/ui/loader";

export const Refund = () => {
  const {
    searchInput,
    searchResult,
    searchQuery,
    transactionDetailsLoading,
    isInitateRefundLoading,
    isValidInput,
    showInputError,
    handleInputChange,
    initSearch,
    initiateRefund,
    setShowInputError,
  } = useRefund();

  const handleAnimationEnd = () => {
    setShowInputError(false);
  };

  return (
    <div className="flex flex-col gap-4 p-8">
      <p className="text-foregroundSecondary">
        Please enter the following field
      </p>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex gap-8 items-center">
            <div className="relative w-full flex items-center">
              <Input
                autoFocus
                className={`pl-10 py-2 border rounded-lg shadow-sm  ${
                  showInputError
                    ? "!border-destructive focus-visible:ring-0 animate-shake"
                    : "border-gray-300 focus:border-primary focus:ring-primary"
                }`}
                type="text"
                value={searchInput?.value || ""}
                placeholder="Enter email or 10-digit phone number"
                onChange={handleInputChange}
                onKeyUp={(e) => {
                  if (e.key === "Enter") initSearch();
                }}
                onAnimationEnd={handleAnimationEnd}
                aria-invalid={!isValidInput}
                aria-describedby="input-error"
              />
              <span
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  isValidInput
                    ? "text-success"
                    : showInputError
                    ? "text-destructive"
                    : "text-foreground"
                } `}
              >
                {searchInput?.type === "phoneNumber" ? (
                  <IoCall aria-label="Phone number" />
                ) : searchInput?.type === "email" ? (
                  <IoMail aria-label="Email" />
                ) : (
                  <IoSearch aria-label="Search" />
                )}
              </span>
            </div>
            <Button className="w-[20vw]" onClick={() => initSearch()}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-16 overflow-hidden">
        <CardContent className="w-full h-[400px] p-0">
          {searchResult ? (
            <RefundTable
              searchQuery={searchQuery}
              initiateRefund={initiateRefund}
              tableData={searchResult}
              isInitateRefundLoading={isInitateRefundLoading}
            />
          ) : transactionDetailsLoading ? (
            <Loader />
          ) : (
            <div className="h-full w-full flex justify-center items-center bg-gray-900">
              <p className="text-xl font-bold">
                Please initiate search to proceed further.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
