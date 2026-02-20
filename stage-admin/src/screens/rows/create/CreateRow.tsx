"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCreateRow,
  WIDGET_TYPES,
  PLATFORMS,
  CONTENT_TYPES,
} from "./hooks/useCreateRow";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Search } from "lucide-react";
import { useState } from "react";
import { Content } from "./types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
import { FC } from "react";
import { ORDER_KEYS, SORT_ORDERS } from "./constants";
import { ContentTypeEnum } from "@/types/variant";
import { DIALECTS } from "@/utils/constants";

// Add props interface
interface CreateRowProps {
  rowKey?: string;
  isEditMode: boolean;
}

export const CreateRow: FC<CreateRowProps> = ({ rowKey, isEditMode }) => {
  const {
    selectedWidgetType,
    showForm,
    formState,
    genres,
    subGenres,
    themes,
    moods,
    descriptorTags,
    handleWidgetTypeChange,
    handleInputChange,
    handlePlatformToggle,
    handleBack,
    handleFilterChange,
    handleGenreToggle,
    handleCategoryToggle,
    contentsByLanguage,
    handleContentToggle,
    handleSave,
    showContentSelection,
    isLoadingContents,
    handleContentSelectionChange,
  } = useCreateRow(rowKey);

  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const isPromotedBanner = selectedWidgetType === "promotedContentBanner";

  const getFilteredContents = (contents: Content[], language: string) => {
    const searchTerm = searchTerms[language]?.toLowerCase() || "";
    return contents.filter((content) =>
      content.title.toLowerCase().includes(searchTerm)
    );
  };

  // Get the selection order number (returns undefined if not selected)
  const getSelectionOrder = (slug: string) => {
    const index = formState.filter.contentSlug.indexOf(slug);
    return index !== -1 ? index + 1 : undefined;
  };

  return (
    <div className="flex flex-col gap-4 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-foregroundSecondary">Create Row</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Widget Type</Label>
              <Select
                value={selectedWidgetType}
                onValueChange={handleWidgetTypeChange}
                disabled={
                  isEditMode && selectedWidgetType === "promotedContentBanner"
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select widget type" />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.filter(
                    (type) =>
                      !isEditMode ||
                      (type !== "promotedContentBanner" &&
                        selectedWidgetType !== "promotedContentBanner")
                  ).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/([A-Z])/g, " $1").trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditMode && selectedWidgetType === "promotedContentBanner" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Widget type cannot be changed for Promoted Content Banner
                </p>
              )}
            </div>

            {selectedWidgetType && (!rowKey || showForm) && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hindi Title</Label>
                    <Input
                      value={formState.hin}
                      onChange={(e) => handleInputChange("hin", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>English Title</Label>
                    <Input
                      value={formState.en}
                      onChange={(e) => handleInputChange("en", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formState.status}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Order By</Label>
                    <Select
                      value={formState.orderKey}
                      onValueChange={(value) =>
                        handleInputChange("orderKey", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select order key" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_KEYS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Select
                      value={
                        formState.sortOrder
                          ? formState.sortOrder.toString()
                          : ""
                      }
                      onValueChange={(value) =>
                        handleInputChange(
                          "sortOrder",
                          value ? parseInt(value) : null
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sort order" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_ORDERS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Limit</Label>
                    <Input
                      type="number"
                      value={formState.limit}
                      onChange={(e) =>
                        handleInputChange("limit", parseInt(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Not Available In</Label>
                  <div className="flex gap-4">
                    {PLATFORMS.map((platform) => (
                      <div
                        key={platform}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={platform}
                          checked={formState.notAvailableIn.includes(platform)}
                          onCheckedChange={() => handlePlatformToggle(platform)}
                          disabled={isPromotedBanner}
                        />
                        <Label
                          htmlFor={platform}
                          className={cn(
                            "capitalize",
                            isPromotedBanner && "text-muted-foreground"
                          )}
                        >
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {isPromotedBanner && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Not available in web and tv for Promoted Content Banner
                    </p>
                  )}
                </div>

                {!isPromotedBanner && (
                  <>
                    <div className="space-y-4 p-6 bg-secondary/10 rounded-lg border-2 border-secondary">
                      <h3 className="text-xl font-bold text-primary">
                        Filter Categories
                      </h3>

                      {/* Filter Type Selection */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Filter Type
                        </Label>
                        <RadioGroup
                          value={formState.filter.isAnd ? "and" : "or"}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="and"
                                id="isAnd"
                                checked={formState.filter.isAnd}
                                onClick={() =>
                                  handleFilterChange(
                                    "isAnd",
                                    !formState.filter.isAnd
                                  )
                                }
                              />
                              <Label htmlFor="isAnd">AND</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="or"
                                id="isOr"
                                checked={formState.filter.isOr}
                                onClick={() =>
                                  handleFilterChange(
                                    "isOr",
                                    !formState.filter.isOr
                                  )
                                }
                              />
                              <Label htmlFor="isOr">OR</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Content Type Dropdown */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Content Type
                        </Label>
                        <Select
                          value={formState.filter.contentType}
                          onValueChange={(value) => {
                            handleFilterChange(
                              "contentType",
                              value as ContentTypeEnum
                            );
                            // Clear format when switching away from show
                            if (value !== ContentTypeEnum.SHOW) {
                              handleFilterChange("format", undefined);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Format Dropdown - Only shown for microDrama widget type */}
                      {selectedWidgetType === "microDrama" && (
                        <div className="space-y-2">
                          <Label className="text-lg font-semibold text-primary">
                            Format
                          </Label>
                          <Select
                            value={formState.filter.format}
                            onValueChange={(value) =>
                              handleFilterChange(
                                "format",
                                value as "standard" | "microdrama"
                              )
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="microdrama">
                                Microdrama
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Genres Section */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Select Genres
                        </Label>
                        <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-md border-2 border-border/50 max-h-[200px] overflow-y-auto">
                          {genres.map((genre) => (
                            <div
                              key={genre.id}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                formState.filter.genreIds.includes(genre.id) &&
                                  "bg-primary/10"
                              )}
                            >
                              <Checkbox
                                id={`genre-${genre.id}`}
                                checked={formState.filter.genreIds.includes(
                                  genre.id
                                )}
                                onCheckedChange={() =>
                                  handleGenreToggle(genre.id)
                                }
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Label
                                htmlFor={`genre-${genre.id}`}
                                className={cn(
                                  "capitalize cursor-pointer",
                                  formState.filter.genreIds.includes(
                                    genre.id
                                  ) && "font-medium text-primary"
                                )}
                              >
                                {genre.name.replace(/-/g, " ")}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SubGenres Section */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Select Sub-Genres
                        </Label>
                        <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-md border-2 border-border/50 max-h-[200px] overflow-y-auto">
                          {subGenres.map((subGenre) => (
                            <div
                              key={subGenre._id}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                formState.filter.subGenreIds.includes(
                                  subGenre._id
                                ) && "bg-primary/10"
                              )}
                            >
                              <Checkbox
                                id={`subgenre-${subGenre._id}`}
                                checked={formState.filter.subGenreIds.includes(
                                  subGenre._id
                                )}
                                onCheckedChange={() =>
                                  handleCategoryToggle(
                                    subGenre._id,
                                    "subGenreIds"
                                  )
                                }
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Label
                                htmlFor={`subgenre-${subGenre._id}`}
                                className={cn(
                                  "capitalize cursor-pointer",
                                  formState.filter.subGenreIds.includes(
                                    subGenre._id
                                  ) && "font-medium text-primary"
                                )}
                              >
                                {subGenre.name.replace(/-/g, " ")}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Themes Section */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Select Themes
                        </Label>
                        <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-md border-2 border-border/50 max-h-[200px] overflow-y-auto">
                          {themes.map((theme) => (
                            <div
                              key={theme._id}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                formState.filter.themeIds.includes(theme._id) &&
                                  "bg-primary/10"
                              )}
                            >
                              <Checkbox
                                id={`theme-${theme._id}`}
                                checked={formState.filter.themeIds.includes(
                                  theme._id
                                )}
                                onCheckedChange={() =>
                                  handleCategoryToggle(theme._id, "themeIds")
                                }
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Label
                                htmlFor={`theme-${theme._id}`}
                                className={cn(
                                  "capitalize cursor-pointer",
                                  formState.filter.themeIds.includes(
                                    theme._id
                                  ) && "font-medium text-primary"
                                )}
                              >
                                {theme.name.replace(/-/g, " ")}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Moods Section */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Select Moods
                        </Label>
                        <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-md border-2 border-border/50 max-h-[200px] overflow-y-auto">
                          {moods.map((mood) => (
                            <div
                              key={mood._id}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                formState.filter.moodIds.includes(mood._id) &&
                                  "bg-primary/10"
                              )}
                            >
                              <Checkbox
                                id={`mood-${mood._id}`}
                                checked={formState.filter.moodIds.includes(
                                  mood._id
                                )}
                                onCheckedChange={() =>
                                  handleCategoryToggle(mood._id, "moodIds")
                                }
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Label
                                htmlFor={`mood-${mood._id}`}
                                className={cn(
                                  "capitalize cursor-pointer",
                                  formState.filter.moodIds.includes(mood._id) &&
                                    "font-medium text-primary"
                                )}
                              >
                                {mood.name.replace(/-/g, " ")}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Descriptor Tags Section */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-primary">
                          Select Descriptor Tags
                        </Label>
                        <div className="grid grid-cols-4 gap-4 p-4 bg-background rounded-md border-2 border-border/50 max-h-[200px] overflow-y-auto">
                          {descriptorTags.map((tag) => (
                            <div
                              key={tag._id}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md transition-colors",
                                formState.filter.descriptorTags.includes(
                                  tag._id
                                ) && "bg-primary/10"
                              )}
                            >
                              <Checkbox
                                id={`tag-${tag._id}`}
                                checked={formState.filter.descriptorTags.includes(
                                  tag._id
                                )}
                                onCheckedChange={() =>
                                  handleCategoryToggle(
                                    tag._id,
                                    "descriptorTags"
                                  )
                                }
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              />
                              <Label
                                htmlFor={`tag-${tag._id}`}
                                className={cn(
                                  "capitalize cursor-pointer",
                                  formState.filter.descriptorTags.includes(
                                    tag._id
                                  ) && "font-medium text-primary"
                                )}
                              >
                                {tag.name.replace(/-/g, " ")}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Do you want to select specific content?</Label>
                        <RadioGroup
                          defaultValue="no"
                          onValueChange={handleContentSelectionChange}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="content-yes" />
                            <Label htmlFor="content-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="content-no" />
                            <Label htmlFor="content-no">No</Label>
                          </div>
                          <p>
                            Note: If you select specific contents then filter
                            categories will be disabled
                          </p>
                        </RadioGroup>
                      </div>

                      {showContentSelection && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            Select Content Titles:-{" "}
                          </h3>

                          {/* Display selected content slugs */}
                          {formState.filter.contentSlug &&
                            formState.filter.contentSlug.length > 0 && (
                              <div className="mb-4">
                                <Label className="text-sm font-semibold">
                                  Selected Content Slugs:
                                </Label>
                                <ul className="list-disc pl-5">
                                  {formState.filter.contentSlug.map(
                                    (slug, index) => (
                                      <li
                                        key={index}
                                        className="text-sm text-muted-foreground"
                                      >
                                        {index + 1}. {slug}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {isLoadingContents ? (
                            <div className="flex justify-center p-4">
                              <Loader />
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-6">
                              {Object.entries(contentsByLanguage).map(
                                ([language, contents]) => (
                                  <div key={language} className="space-y-2">
                                    <Label className="capitalize">
                                      {DIALECTS.find(
                                        (d) => d.value === language
                                      )?.label || language}
                                    </Label>
                                    <div className="flex flex-col space-y-2">
                                      <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                          placeholder="Search titles..."
                                          className="pl-8"
                                          value={searchTerms[language] || ""}
                                          onChange={(e) =>
                                            setSearchTerms((prev) => ({
                                              ...prev,
                                              [language]: e.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="p-4 border rounded-md space-y-2 h-[300px] overflow-y-auto">
                                        {getFilteredContents(
                                          contents,
                                          language
                                        ).map((content) => (
                                          <div
                                            key={content.slug}
                                            className="flex items-center space-x-2"
                                          >
                                            <div className="relative">
                                              <Checkbox
                                                id={`content-${content.slug}`}
                                                checked={formState.filter.contentSlug.includes(
                                                  content.slug
                                                )}
                                                onCheckedChange={() =>
                                                  handleContentToggle(
                                                    content.slug
                                                  )
                                                }
                                              />
                                              {getSelectionOrder(
                                                content.slug
                                              ) && (
                                                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                                                  {getSelectionOrder(
                                                    content.slug
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <Label
                                              htmlFor={`content-${content.slug}`}
                                              className="text-sm"
                                            >
                                              {content.title}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {isPromotedBanner && (
                  <div className="space-y-4 p-6 bg-secondary/10 rounded-lg border-2 border-secondary">
                    <h3 className="text-xl font-bold text-primary">
                      Select Content
                    </h3>
                    {isLoadingContents ? (
                      <div className="flex justify-center p-4">
                        <Loader />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-6">
                        {Object.entries(contentsByLanguage).map(
                          ([language, contents]) => (
                            <div key={language} className="space-y-2">
                              <Label className="text-lg font-semibold text-primary">
                                {DIALECTS.find((d) => d.value === language)
                                  ?.label || language}
                              </Label>
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search titles..."
                                  className="pl-8"
                                  value={searchTerms[language] || ""}
                                  onChange={(e) =>
                                    setSearchTerms((prev) => ({
                                      ...prev,
                                      [language]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <RadioGroup
                                value={
                                  formState.filter.contentSlug.find((slug) =>
                                    contents.some((c) => c.slug === slug)
                                  ) || ""
                                }
                                onValueChange={(value) => {
                                  const otherLanguageSelections =
                                    formState.filter.contentSlug.filter(
                                      (slug) =>
                                        !contents.find((c) => c.slug === slug)
                                    );
                                  handleFilterChange("contentSlug", [
                                    ...otherLanguageSelections,
                                    value,
                                  ]);
                                }}
                              >
                                <div className="p-4 border rounded-md space-y-2 h-[300px] overflow-y-auto">
                                  {getFilteredContents(contents, language).map(
                                    (content) => (
                                      <div
                                        key={content.slug}
                                        className="flex items-center space-x-2"
                                      >
                                        <RadioGroupItem
                                          value={content.slug}
                                          id={`content-${content.slug}`}
                                        />
                                        <Label
                                          htmlFor={`content-${content.slug}`}
                                          className="text-sm"
                                        >
                                          {content.title}
                                        </Label>
                                      </div>
                                    )
                                  )}
                                </div>
                              </RadioGroup>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" onClick={handleBack}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
