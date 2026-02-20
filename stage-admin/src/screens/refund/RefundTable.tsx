"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefundSearch, SearchForm } from "../../types/refund";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useDialog } from "@/hooks/useDialog";
import { Card, CardContent } from "@/components/ui/card";
import { RefundDetailDialog } from "./RefundDetailDialog";
import { formatTimestamp } from "@/utils/helpers";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/UserContext";
import { PrivilegeTypesEnum, ProtectedRoutesEnum } from "@/types/routes";
import { useState } from "react";

interface TableProps {
  searchQuery?: SearchForm;
  tableData: RefundSearch[];
  initiateRefund: (id: string, eason: string) => void;
  isInitateRefundLoading: boolean;
}

export const RefundTable = ({
  searchQuery,
  tableData,
  initiateRefund,
  isInitateRefundLoading,
}: TableProps) => {
  const { isDialogOpen, closeDialog, openDialog, dialogData } = useDialog<{
    type: "initateRefund" | "refundDetails";
  }>();
  const { checkPrivilege } = useUser();
  const [currentRow, setCurrentRow] = useState<number>(0);

  const handleInitiateRefund = (reason: string) => {
    initiateRefund(tableData[0].subscriptionId, reason);
  };

  return (
    <div className="px-4 py-8 flex flex-col gap-6 h-full w-full">
      <p className="text-foregroundSecondary">
        Showing results for{" "}
        {searchQuery?.type === "email" ? "Email: " : "Phone Number: "}
        <span className="font-bold text-foreground">{searchQuery?.value}</span>
      </p>
      <Card className="flex-1 overflow-auto w-full ">
        <CardContent
          className={`py-4 px-2 bg-background w-full h-full flex justify-center ${
            tableData.length ? "" : "items-center"
          }`}
        >
          {tableData.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* <TableCell className="pl-4">Subscription ID</TableCell> */}
                    <TableCell className="py-2 border-b border-gray-200 font-bold">
                      Subscription Date
                    </TableCell>
                    <TableCell className="py-2 border-b border-gray-200 font-bold">
                      Subscription Valid Till
                    </TableCell>
                    <TableCell className="py-2 border-b border-gray-200 font-bold">
                      Vendor
                    </TableCell>
                    <TableCell className="py-2 border-b border-gray-200 font-bold">
                      Amount
                    </TableCell>
                    <TableCell className="py-2 border-b border-gray-200 text-center font-bold">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {tableData.map((row, index) => (
                    <TableRow
                      key={row._id}
                      className={index === 0 ? "bg-background" : ""}
                    >
                      {/* <TableCell className="pl-4 font-bold">
                  {row.subscriptionId}
                </TableCell> */}
                      <TableCell>
                        {formatTimestamp(row.subscriptionDate)}
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(row.subscriptionValid)}
                      </TableCell>
                      <TableCell>{row.vendor}</TableCell>
                      <TableCell>{row.payingPrice}</TableCell>
                      <TableCell align="center">
                        {row.isRefundable
                          ? checkPrivilege(
                              ProtectedRoutesEnum.REFUND,
                              PrivilegeTypesEnum.WRITE
                            ) &&
                            (!isInitateRefundLoading ? (
                              <Button
                                onClick={() => {
                                  openDialog({ type: "initateRefund" });
                                  setCurrentRow(index);
                                }}
                              >
                                Initiate Refund
                              </Button>
                            ) : (
                              <Button
                                variant={"secondary"}
                                onClick={() => {
                                  openDialog({ type: "refundDetails" });
                                  setCurrentRow(index);
                                }}
                              >
                                <Spinner size="sm" />
                              </Button>
                            ))
                          : row.refundStatus && (
                              <Button
                                onClick={() => {
                                  openDialog({ type: "refundDetails" });
                                  setCurrentRow(index);
                                }}
                              >
                                Refund Details
                              </Button>
                            )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ConfirmationDialog
                isDialogOpen={
                  isDialogOpen && dialogData?.type === "initateRefund"
                }
                closeDialog={closeDialog}
                initiateRefund={handleInitiateRefund}
                userDetails={searchQuery?.value}
              />
              <RefundDetailDialog
                isModalOpen={
                  isDialogOpen && dialogData?.type === "refundDetails"
                }
                closeModal={closeDialog}
                refundDetails={tableData[currentRow]}
              />
            </>
          ) : (
            <p className="text-xl text-center text-foregroundSecondary">
              No records found for this user.
              <br /> Either the user has not subscribed, or there might be a
              typo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
