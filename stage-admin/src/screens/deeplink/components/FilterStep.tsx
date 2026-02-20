import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface FilterStepProps {
  step: number;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  color: "blue" | "green" | "yellow" | "purple";
}

const colorClasses = {
  blue: "bg-blue-600 text-blue-400",
  green: "bg-green-600 text-green-400",
  yellow: "bg-yellow-600 text-yellow-400",
  purple: "bg-purple-600 text-purple-400",
};

export function FilterStep({
  step,
  title,
  icon: Icon,
  children,
  color,
}: FilterStepProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          >
            {step}
          </Badge>
          <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}




