import {
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { otherRefundReason, refundReasons } from "../../utils/constants";

interface StepOneProps {
  refundReason: { type: string; value: string };
  handleSelectChange: (value: string) => void;
  handleOtherReasonChange: (value: string) => void;
  isSubmitDisabled: boolean;
  handleNextStep: () => void;
  handleCancel: () => void;
}

export const StepOneDialogContent = ({
  refundReason,
  handleSelectChange,
  handleOtherReasonChange,
  isSubmitDisabled,
  handleNextStep,
  handleCancel,
}: StepOneProps) => {
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          <div className="flex justify-between items-center">
            Initiate Refund
            <p className="text-foregroundSecondary text-sm">Step 1 of 2</p>
          </div>
        </AlertDialogTitle>
        <AlertDialogDescription>
          To initiate the refund, please select the reason
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex flex-col gap-4 mt-4">
        <Select value={refundReason.type} onValueChange={handleSelectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {refundReasons.map((reason) => (
              <SelectItem value={reason} key={reason}>
                {reason}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {refundReason.type === otherRefundReason && (
          <div className="flex flex-col gap-2">
            <label htmlFor="reason-textarea" className="text-sm font-medium">
              Please specify your reason
            </label>
            <Textarea
              autoFocus
              required
              value={refundReason.value}
              placeholder="Write something..."
              id="reason-textarea"
              name="reason"
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  handleNextStep();
                }
              }}
              onChange={(e) => handleOtherReasonChange(e.target.value)}
            />
          </div>
        )}
      </div>
      <AlertDialogFooter className="mt-4">
        <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            handleNextStep();
            e.preventDefault();
          }}
          disabled={isSubmitDisabled}
        >
          Next
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};
