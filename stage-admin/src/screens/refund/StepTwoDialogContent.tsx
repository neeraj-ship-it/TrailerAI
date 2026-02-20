import {
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { otherRefundReason } from "../../utils/constants";
import { useEffect, useState } from "react";

interface StepTwoProps {
  refundReason: { type: string; value: string };
  userDetails?: string;
  handleSubmit: () => void;
  handleCancel: () => void;
}

export const StepTwoDialogContent = ({
  refundReason,
  userDetails,
  handleSubmit,
  handleCancel,
}: StepTwoProps) => {
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          <div className="flex justify-between items-center">
            Are you sure?
            <p className="text-foregroundSecondary text-sm">Step 2 of 2</p>
          </div>
        </AlertDialogTitle>
        <AlertDialogDescription>
          This action is irreversible. Please cross-verify the user details and
          reason.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="mt-4">
        <strong>User:</strong> {userDetails}
        <br />
        <strong>Reason:</strong>{" "}
        {refundReason.type === otherRefundReason
          ? refundReason.value
          : refundReason.type}
      </div>
      <AlertDialogFooter className="mt-4">
        <AlertDialogCancel onClick={handleCancel}>Back</AlertDialogCancel>
        <AlertDialogAction onClick={handleSubmit} disabled={timer > 0}>
          {timer > 0 ? `Initiate Refund (${timer})` : "Initiate Refund"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};
