import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Img from "@/components/ui/img";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentGatewayItem } from "@/types/paymentGateway";
import { Label } from "@radix-ui/react-label";
import React from "react";
import { TemplateProps } from "react-draggable-list";
import { RiDraggable } from "react-icons/ri";

export interface PGDraggableListCommonProps {
  onEnableToggle: (packageName: string) => void;
  onRecommendedChange: (packageName: string) => void;
  onPGChange: (packageName: string, pg: string) => void;
}

interface PGDraggableListItemProps
  extends TemplateProps<PaymentGatewayItem, PGDraggableListCommonProps> {}

const PGDraggableListItem = ({
  item,
  dragHandleProps,
  commonProps,
}: PGDraggableListItemProps) => {
  return (
    <Card className={item.isEnabled ? "opacity-100" : "opacity-50"}>
      <CardContent>
        <div className="flex items-center space-x-7">
          <div {...dragHandleProps} className="cursor-move">
            <RiDraggable
              size={24}
              className="hover:text-foregroundSecondary transition-colors duration-200"
            />
          </div>
          <div className="w-12 h-12 relative">
            <Img
              src={process.env.NEXT_PUBLIC_CDN_ROOT_URL + item.imagePath}
              alt={item.appName}
              width={48}
              height={48}
              className="rounded-lg object-contain"
            />
          </div>
          <span className="flex-grow font-medium text-lg">{item.appName}</span>

          <div className="flex gap-2 items-center">
            <Label
              htmlFor={`select-pg-${item.packageName}`}
              className="text-sm font-medium text-muted-foreground"
            >
              PG
            </Label>
            <Select
              onValueChange={(value) => {
                commonProps.onPGChange(item.packageName, value);
              }}
              defaultValue={item.paymentGateway}
            >
              <SelectTrigger
                id={`select-pg-${item.packageName}`}
                className="w-[200px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item.supportedPGs.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`enable-${item.packageName}`}
              checked={item.isEnabled}
              onCheckedChange={() =>
                commonProps.onEnableToggle(item.packageName)
              }
            />
            <Label htmlFor={`enable-${item.packageName}`}>Enabled</Label>
          </div>
          <RadioGroup
            onValueChange={() =>
              commonProps.onRecommendedChange(item.packageName)
            }
            value={item.displayText ? item.packageName : ""}
            className="flex items-center space-x-2"
          >
            <RadioGroupItem
              value={item.packageName}
              id={`recommended-${item.packageName}`}
            />
            <Label
              htmlFor={`recommended-${item.packageName}`}
              className={item.displayText ? "" : "text-foregroundSecondary"}
            >
              Recommended
            </Label>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export class PGDraggableListItemWrapper extends React.Component<PGDraggableListItemProps> {
  render() {
    return <PGDraggableListItem {...this.props} />;
  }
}
