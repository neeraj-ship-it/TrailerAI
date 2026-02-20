"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useVariant } from "./hooks/useVariant";
import { Loader } from "@/components/ui/loader";

export const Variant = () => {
  const { variantData, isLoading, handleViewVariant } = useVariant();
  const isVariantLength = variantData && variantData.length > 0;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex justify-between items-center">
        <p className="text-foregroundSecondary">Variants</p>
        <Button onClick={async () => await handleViewVariant(undefined)}>
          Create New Variant
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {isVariantLength ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variantData.map((variant) => (
                <Card
                  key={variant._id}
                  className={`hover:shadow-lg transition-all ${
                    variant.isDefault ? "border border-green-500" : ""
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div>
                      <h3 className="text-lg font-semibold">{variant.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: {variant.status}
                      </p>
                      <p className="text-sm font-bold text-blue-600">
                        Platforms: {variant.availableIn.join(", ")}
                      </p>
                      {variant.isDefault && (
                        <span className="text-green-500 font-semibold">Default</span>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleViewVariant(variant._id)}
                    >
                      View
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">No variants available.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
