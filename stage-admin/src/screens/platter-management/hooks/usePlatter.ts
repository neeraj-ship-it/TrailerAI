import { DIALECTS } from "@/utils/constants";
import {
  PlatterPayload,
  usePlatterQuery,
  useUpdatePlatterMutation,
} from "@/service";
import { DialectEnum } from "@/types/common";
import { PlatterContentTypeEnum, PlatterTypeEnum } from "@/types/platter";
import { PLACEHOLDER_IMAGE_URL } from "@/utils/constants";
import { useCallback, useEffect, useState } from "react";
import { parsePlatterResponse } from "../helpers/imageParser";
import { z } from "zod";
import { useToast } from "@/hooks/useToast";
import { useQueryState } from "nuqs";
import { parseAsStringEnum, parseAsBoolean } from "nuqs";

export interface Content {
  slug: string;
  type: PlatterContentTypeEnum;
  image: string;
}

export interface Platter {
  platterType: PlatterTypeEnum;
  dialect: DialectEnum;
  contents: Content[];
  id: number;
}

const platterContentSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  type: z.enum(
    [PlatterContentTypeEnum.SHOW, PlatterContentTypeEnum.INDIVIDUAL],
    {
      required_error: "Type is required",
    }
  ),
});

const platterPayloadSchema = z.object({
  contents: z
    .array(platterContentSchema)
    .min(1, "At least one content item is required"),
  dialect: z.nativeEnum(DialectEnum),
  platterType: z.nativeEnum(PlatterTypeEnum),
});

export const usePlatter = () => {
  const { toast } = useToast();
  const [selectedLocationRaw, setSelectedLocation] = useQueryState(
    "dialect",
    parseAsStringEnum(DIALECTS.map((d) => d.value))
  );
  const selectedLocation = selectedLocationRaw ?? DIALECTS[0].value;
  const [selectedTabRaw, setSelectedTab] = useQueryState(
    "platterType",
    parseAsStringEnum(Object.values(PlatterTypeEnum))
  );
  const selectedTab = selectedTabRaw ?? PlatterTypeEnum.D0;

  // Sync editable with the query string as 'editable', always present
  const [editableRaw, setEditable] = useQueryState("editable", parseAsBoolean);
  const editable = editableRaw ?? false;

  const { data: platterData, isLoading: platterLoading } = usePlatterQuery(
    {
      dialect: selectedLocation,
      type: selectedTab,
    },
    {
      enabled: true,
    }
  );
  const [contentItems, setContentItems] = useState<
    Record<PlatterTypeEnum, Content[]>
  >({
    [PlatterTypeEnum.D0]: [],
    [PlatterTypeEnum.DN]: [],
  });

  useEffect(() => {
    if (platterData && platterData.res.items && platterData.type) {
      const parsedItems = parsePlatterResponse(platterData.res.items);
      setContentItems((prev) => ({
        ...prev,
        [platterData.type]: parsedItems,
      }));
    }
  }, [platterData, selectedTab]);

  const { mutateAsync: updatePlatterMutation, isPending: isUpdatingPlatter } =
    useUpdatePlatterMutation();

  const updateContentItem = useCallback(
    (updatedContent: Content, index: number) => {
      setContentItems((prevItems) => {
        const newItems = { ...prevItems };
        newItems[selectedTab][index] = updatedContent;
        return newItems;
      });
    },
    [selectedTab]
  );

  const handleLocationChange = useCallback((value: string) => {
    setSelectedLocation(value as DialectEnum);
  }, []);

  const parsePlatterPayload = useCallback((): PlatterPayload => {
    return {
      contents: contentItems[selectedTab].map((item) => ({
        slug: item.slug,
        type:
          item.type === PlatterContentTypeEnum.SHOW
            ? PlatterContentTypeEnum.SHOW
            : PlatterContentTypeEnum.INDIVIDUAL,
      })),
      dialect: selectedLocation,
      platterType: selectedTab,
    };
  }, [contentItems, selectedLocation, selectedTab]);

  const updatePlatter = useCallback(async () => {
    try {
      const payload = parsePlatterPayload();

      // Validate payload before sending
      const validationResult = platterPayloadSchema.safeParse(payload);

      if (!validationResult.success) {
        const errors = validationResult.error.errors;
        console.log(errors);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Empty content is not allowed",
        });
        return;
      }

      await updatePlatterMutation(payload);
      toast({
        title: "Success",
        description: "Platter updated successfully",
      });
    } catch (error) {
      console.error("Error updating platter:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "OOPS! Something went wrong",
      });
    }
  }, [parsePlatterPayload, updatePlatterMutation, toast]);

  const updateItems = useCallback(
    (items: Content[]) => {
      setContentItems((prev) => ({
        ...prev,
        [selectedTab]: items,
      }));
    },
    [selectedTab]
  );

  const addContentItem = useCallback(() => {
    setContentItems((prev) => ({
      ...prev,
      [selectedTab]: [
        ...prev[selectedTab],
        {
          type: "",
          slug: "",
          image: PLACEHOLDER_IMAGE_URL,
        },
      ],
    }));
  }, [selectedTab]);

  const deleteContentItem = useCallback(
    (index: number) => {
      setContentItems((prev) => {
        const newItems = { ...prev };
        newItems[selectedTab] = newItems[selectedTab].filter(
          (_, i) => i !== index
        );
        return newItems;
      });
    },
    [selectedTab]
  );

  return {
    selectedTab,
    setSelectedTab,
    selectedLocation,
    setSelectedLocation,
    contentItems: contentItems[selectedTab],
    setContentItems,
    handleLocationChange,
    updateContentItem,
    updateItems,
    updatePlatter,
    addContentItem,
    deleteContentItem,
    platterLoading,
    isUpdatingPlatter,
    editable,
    setEditable,
  };
};
