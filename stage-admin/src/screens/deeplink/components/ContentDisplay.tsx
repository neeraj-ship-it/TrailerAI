import { Globe, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { ContentData, ContentStatusEnum } from "@/types/content";

interface ContentDisplayProps {
  selectedItem: ContentData | null;
  hasWriteAccess: boolean;
  onCopyToClipboard: (text: string) => void;
}

export function ContentDisplay({
  selectedItem,
  hasWriteAccess,
  onCopyToClipboard,
}: ContentDisplayProps) {
  if (!selectedItem) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Globe className="h-16 w-16 text-gray-600 mx-auto mb-6" />
          <h3 className="text-xl font-medium text-white mb-3">
            No Content Selected
          </h3>
          <p className="text-gray-400">
            Follow the search flow to find and select content to view its links.
          </p>
        </CardContent>
      </Card>
    );
  }

  const appLinksConfig = [
    {
      title: "Meta App Link",
      link: selectedItem.metaAppLink,
    },
    {
      title: "Google App Link",
      link: selectedItem.googleAppLink,
    },
    {
      title: "Firebase Main App Link",
      link: selectedItem.firebaseMainAppLink,
    },
    {
      title: "Web Paywall Link",
      link: selectedItem.webPaywallLink,
    },
    {
      title: "Content Web Link",
      link: selectedItem.contentWebLink,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{selectedItem.title}</CardTitle>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <Badge
            variant="secondary"
            className={
              selectedItem.contentType === "show"
                ? "bg-red-900 text-red-300 border-red-700"
                : selectedItem.contentType === "movie"
                ? "bg-green-900 text-green-300 border-green-700"
                : "bg-blue-900 text-blue-300 border-blue-700"
            }
          >
            {selectedItem.contentType}
          </Badge>
          <Badge variant="outline" className="bg-gray-700 text-gray-300">
            {selectedItem.contentDialect}
          </Badge>
          <Badge variant="outline" className="bg-gray-700 text-gray-300">
            {selectedItem.displayLanguage.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Content Status and Slug */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Content Status
            </h3>
            <Badge
              variant="secondary"
              className={
                selectedItem.contentStatus === ContentStatusEnum.ACTIVE
                  ? "bg-green-900 text-green-300 border border-green-700"
                  : "bg-yellow-900 text-yellow-300 border border-yellow-700"
              }
            >
              {selectedItem.contentStatus === ContentStatusEnum.ACTIVE
                ? "LIVE"
                : "TESTING"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Slug:</span>
            <div className="flex items-center gap-2">
              <Input
                value={selectedItem.contentSlug}
                readOnly
                className="w-32 bg-gray-900 border-gray-600 text-gray-300 text-sm"
              />
              {hasWriteAccess && (
                <CopyButton
                  text={selectedItem.contentSlug}
                  onCopy={onCopyToClipboard}
                  variant="ghost"
                  size="sm"
                  showText={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">App Links</h3>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">
                Language: {selectedItem.displayLanguage.toUpperCase()}
              </span>
            </div>
          </div>

          {appLinksConfig.map(({ title, link }) => (
            <div
              key={title}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{title}</h4>
                {hasWriteAccess && (
                  <CopyButton
                    text={link || ""}
                    onCopy={onCopyToClipboard}
                    variant="ghost"
                    size="sm"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={link || ""}
                  readOnly
                  className="flex-1 bg-gray-900 border-gray-600 text-gray-300"
                />
                <Button asChild size="sm">
                  <a
                    href={link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
