"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { categoriesApi } from "@/service/modules/categories.api";
import { contentApi } from "@/service/modules/content.api";
import { FormState, Genre, Category, Content } from "../types";
import { WIDGET_TYPES, PLATFORMS, CONTENT_TYPES } from "../constants";
import { useToast } from "@/hooks/useToast";
import { rowApi } from "@/service/modules/row.api";
import { DIALECTS, rowRoutes } from "@/utils/constants";
import { ContentTypeEnum } from "@/types/variant";

export { WIDGET_TYPES, PLATFORMS, CONTENT_TYPES };

const initialFormState: FormState = {
  hin: "",
  en: "",
  status: "active",
  orderKey: "releaseDate",
  sortOrder: -1,
  limit: 10,
  notAvailableIn: [],
  filter: {
    isAnd: false,
    isOr: true,
    genreIds: [],
    themeIds: [],
    subGenreIds: [],
    moodIds: [],
    descriptorTags: [],
    contentType: ContentTypeEnum.MIXED,
    contentSlug: [],
    format: undefined,
  },
};

export const useCreateRow = (rowKey?: string) => {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedWidgetType, setSelectedWidgetType] = useState<
    (typeof WIDGET_TYPES)[number] | ""
  >("");
  const [showForm, setShowForm] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [subGenres, setSubGenres] = useState<Category[]>([]);
  const [themes, setThemes] = useState<Category[]>([]);
  const [moods, setMoods] = useState<Category[]>([]);
  const [descriptorTags, setDescriptorTags] = useState<Category[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [showContentSelection, setShowContentSelection] = useState(false);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [contentsByLanguage, setContentsByLanguage] = useState<
    Record<string, Content[]>
  >({});
  const [isEditMode] = useState(!!rowKey);
  const [rowId, setRowId] = useState<string>("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const [
          genresRes,
          subGenresRes,
          themesRes,
          moodsRes,
          descriptorTagsRes,
        ] = await Promise.all([
          categoriesApi.getGenres(),
          categoriesApi.getSubGenres(),
          categoriesApi.getThemes(),
          categoriesApi.getMoods(),
          categoriesApi.getDescriptorTags(),
        ]);

        const [
          genresData,
          subGenresData,
          themesData,
          moodsData,
          descriptorTagsData,
        ] = await Promise.all([
          genresRes.json(),
          subGenresRes.json(),
          themesRes.json(),
          moodsRes.json(),
          descriptorTagsRes.json(),
        ]);

        setGenres(genresData.data.genres || []);
        setSubGenres(subGenresData.data.subGenres || []);
        setThemes(themesData.data.theme || []);
        setMoods(moodsData.data.mood || []);
        setDescriptorTags(descriptorTagsData.data.descriptorTag || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setGenres([]);
        setSubGenres([]);
        setThemes([]);
        setMoods([]);
        setDescriptorTags([]);
      }
    };

    // Fetch categories when widget type is selected and it's not a promoted banner
    if (selectedWidgetType && selectedWidgetType !== "promotedContentBanner") {
      fetchCategories();
    }
  }, [selectedWidgetType]);

  useEffect(() => {
    const fetchRowData = async () => {
      if (!rowKey) return;

      try {
        const response = await rowApi.getRow(
          rowKey,
          "en",
          "har",
          "android",
          "app"
        );
        const data = await response.json();
        const rowData = data.data;

        // Store the row ID
        setRowId(rowData._id);

        // Set widget type first to ensure proper initialization
        setSelectedWidgetType(
          rowData.widgetType as (typeof WIDGET_TYPES)[number]
        );
        setShowForm(true);

        // Set form state with row data
        setFormState({
          hin: rowData.hin,
          en: rowData.en,
          status: rowData.status as "active" | "inactive",
          orderKey: rowData.orderKey,
          sortOrder: rowData.sortOrder,
          limit: rowData.limit,
          notAvailableIn: rowData.notAvailableIn,
          filter: {
            isAnd: rowData.filter.isAnd,
            isOr: rowData.filter.isOr,
            genreIds: rowData.filter.genreIds,
            themeIds: rowData.filter.themeIds,
            subGenreIds: rowData.filter.subGenreIds,
            moodIds: rowData.filter.moodIds,
            descriptorTags: rowData.filter.descriptorTags,
            contentType: rowData.filter.contentType,
            contentSlug: rowData.filter.contentSlug,
            format: rowData.filter.format,
          },
        });

        // If content slugs exist, show content selection
        if (rowData.filter.contentSlug.length > 0) {
          setShowContentSelection(true);
          await handleContentSelectionChange("yes");
        }
      } catch (error) {
        console.error("Error fetching row data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch row data",
        });
      }
    };

    fetchRowData();
  }, [rowKey]);

  const fetchContentsForLanguage = async (dialect: string) => {
    try {
      const response = await contentApi.getAllContents({
        dialect,
        lang: "en",
      });
      const data = await response.json();

      // Return the data with correct structure
      return {
        language: dialect,
        contents: data.data || [], // This will be array of {title, slug, language}
      };
    } catch (error) {
      console.error(`Error fetching contents for ${dialect}:`, error);
      return {
        language: dialect,
        contents: [],
      };
    }
  };

  useEffect(() => {
    console.log("Current content slugs:", formState.filter.contentSlug);
  }, [formState.filter.contentSlug]);

  const handleContentSelectionChange = async (value: string) => {
    const shouldShow = value === "yes";
    setShowContentSelection(shouldShow);

    // Clear content slugs when user selects "No"
    if (!shouldShow) {
      setFormState((prev) => ({
        ...prev,
        filter: {
          ...prev.filter,
          contentSlug: [], // Clear the content slugs array
        },
      }));
    }

    if (shouldShow) {
      setIsLoadingContents(true);
      try {
        // Fetch content for all three languages
        const results = await Promise.all(
          DIALECTS.map((dialect) => fetchContentsForLanguage(dialect.value))
        );

        // Group contents by language
        const allContents = results.reduce((acc, { language, contents }) => {
          acc[language] = contents;
          return acc;
        }, {} as Record<string, Content[]>);

        setContentsByLanguage(allContents);
        // Flatten all contents for the main content array
        setContents(Object.values(allContents).flat());
      } catch (error) {
        console.error("Error fetching contents:", error);
        setContents(contents);
        setContentsByLanguage({});
        setContents([]);
      } finally {
        setIsLoadingContents(false);
      }
    }
  };

  const handleWidgetTypeChange = (type: (typeof WIDGET_TYPES)[number]) => {
    setSelectedWidgetType(type);

    // If we're in edit mode, don't reset the form
    if (!rowKey) {
      setShowForm(false);

      if (type === "promotedContentBanner") {
        setFormState({
          ...initialFormState,
          notAvailableIn: ["web", "tv"],
        });
      } else {
        setFormState(initialFormState);
      }
    } else {
      // In edit mode, just update the widget type
      setFormState((prev) => ({
        ...prev,
        widgetType: type,
        // If changing to promotedContentBanner, ensure web and tv are in notAvailableIn
        notAvailableIn:
          type === "promotedContentBanner"
            ? Array.from(new Set([...prev.notAvailableIn, "web", "tv"]))
            : prev.notAvailableIn,
      }));
    }
  };

  const handleContinue = () => {
    setShowForm(true);
  };

  const handleInputChange = (
    name: keyof FormState,
    value: string | number | null
  ) => {
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    if (selectedWidgetType === "promotedContentBanner") return; // Prevent changes for promotedContentBanner

    setFormState((prev) => ({
      ...prev,
      notAvailableIn: prev.notAvailableIn.includes(platform)
        ? prev.notAvailableIn.filter((p) => p !== platform)
        : [...prev.notAvailableIn, platform],
    }));
  };

  const handleBack = () => {
    // router.push("/dynamicHomepage/rows");
    router.push(rowRoutes.Rows.path);
  };

  type FilterState = FormState["filter"];
  const handleFilterChange = <K extends keyof FilterState>(
    name: K,
    value: FilterState[K]
  ) => {
    if (name === "isAnd" || name === "isOr") {
      setFormState((prev) => ({
        ...prev,
        filter: {
          ...prev.filter,
          isAnd: name === "isAnd" ? (value as boolean) : false,
          isOr: name === "isOr" ? (value as boolean) : false,
        },
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        filter: {
          ...prev.filter,
          [name]: value,
        },
      }));
    }
  };

  const handleGenreToggle = (genreId: number) => {
    setFormState((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        genreIds: prev.filter.genreIds.includes(genreId)
          ? prev.filter.genreIds.filter((id) => id !== genreId)
          : [...prev.filter.genreIds, genreId],
      },
    }));
  };

  const handleCategoryToggle = (
    id: number,
    category: "subGenreIds" | "themeIds" | "moodIds" | "descriptorTags"
  ) => {
    setFormState((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        [category]: prev.filter[category].includes(id)
          ? prev.filter[category].filter((existingId) => existingId !== id)
          : [...prev.filter[category], id],
      },
    }));
  };

  const handleContentToggle = (slug: string) => {
    setFormState((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        contentSlug: prev.filter.contentSlug.includes(slug)
          ? prev.filter.contentSlug.filter((id) => id !== slug)
          : [...prev.filter.contentSlug, slug],
      },
    }));
  };

  const handleSave = async () => {
    try {
      if (!formState.hin || !formState.en || !selectedWidgetType) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Hindi title, English title and Widget Type are required",
        });
        return;
      }

      // Add validation for promoted banner content
      if (selectedWidgetType === "promotedContentBanner") {
        const selectedContentByLanguage = Object.entries(
          contentsByLanguage
        ).reduce((acc, [lang, contents]) => {
          acc[lang] = formState.filter.contentSlug.filter((slug) =>
            contents.some((c) => c.slug === slug)
          ).length;
          return acc;
        }, {} as Record<string, number>);

        formState.filter.contentType = ContentTypeEnum.MIXED;
        const missingLanguages = Object.entries(selectedContentByLanguage)
          .filter(([, count]) => count !== 1)
          .map(
            ([lang]) => DIALECTS.find((d) => d.value === lang)?.label || lang
          );

        if (missingLanguages.length > 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: `Please select exactly one content from each language: ${missingLanguages.join(
              ", "
            )}`,
          });
          return;
        }
      }

      const payloadFormState = { ...formState };

      if (!showContentSelection) {
        payloadFormState.filter = {
          ...payloadFormState.filter,
          contentSlug: [],
        };
      }

      // Set format for microDrama widget type
      if (selectedWidgetType === "microDrama") {
        payloadFormState.filter.format =
          payloadFormState.filter.format || "standard";
      } else {
        payloadFormState.filter.format = undefined;
      }

      const payload = {
        ...payloadFormState,
        widgetType: selectedWidgetType,
      };

      console.log("Payload being sent:", payload); // Log the payload for debugging

      if (rowKey && rowId) {
        await rowApi.updateRow(rowId, payload);
        toast({
          title: "Success",
          description: "Row updated successfully",
        });
      } else {
        await rowApi.createRow(payload);
        toast({
          title: "Success",
          description: "Row created successfully",
        });
      }

      router.push(rowRoutes.Rows.path);
    } catch (error) {
      console.error("Error saving row:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${
          rowKey ? "update" : "create"
        } row. Please try again.`,
      });
    }
  };

  useEffect(() => {
    if (selectedWidgetType === "promotedContentBanner") {
      handleContentSelectionChange("yes");
    }
  }, [selectedWidgetType]);

  return {
    selectedWidgetType,
    showForm,
    formState,
    genres,
    subGenres,
    themes,
    moods,
    descriptorTags,
    contentsByLanguage,
    handleWidgetTypeChange,
    handleContinue,
    handleInputChange,
    handlePlatformToggle,
    handleBack,
    handleFilterChange,
    handleGenreToggle,
    handleCategoryToggle,
    handleContentToggle,
    handleSave,
    showContentSelection,
    isLoadingContents,
    handleContentSelectionChange,
    isEditMode,
  };
};
