"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHomepage } from "./hooks/useHomepage";
import { Loader } from "@/components/ui/loader";

export const DynamicHomepageInputs = () => {
  const { handleVariantButtonClick, handleRowButtonClick,handlePlatterButtonClick, isLoading } = useHomepage();

  return (
    <div className="flex flex-col gap-4 p-8">
      <p className="text-foregroundSecondary">Dynamic Homepage Inputs</p>
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              size="lg" 
              className="h-32 text-xl"
              onClick={handleVariantButtonClick}
              disabled={isLoading}
            >
              {isLoading ? <Loader /> : "Variants"}
            </Button>
            <Button 
              size="lg" 
              className="h-32 text-xl"
              variant="secondary"
              onClick={handleRowButtonClick}
              disabled={isLoading}
            >
              Rows
            </Button>
            <Button 
              size="lg" 
              className="h-32 text-xl"
              variant="secondary"
              onClick={handlePlatterButtonClick}
              disabled={isLoading}
            >
              Platter Management
            </Button>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 