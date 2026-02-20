import { PlatterContentTypeEnum, PlatterItem } from "@/types/platter";
import { Content } from "../hooks/usePlatter";

export const getImageUrl = (
  fileName: string,
  contentType: PlatterContentTypeEnum
): string => {
  if (!fileName || !contentType)
    return "https://placehold.co/800x800?text=No+Image";

  return `https://stagemediavideo.s3.ap-south-1.amazonaws.com/${
    contentType === PlatterContentTypeEnum.SHOW ? "show" : "episode"
  }/square/large/${fileName}`;
};

export const parsePlatterResponse = (items: PlatterItem[]): Content[] => {
  return items.map((item) => {
    const fileName = item.thumbnail.ratio1.sourceLink;

    return {
      slug: item.slug,
      type: item.contentType,
      image: getImageUrl(fileName || "", item.contentType),
    };
  });
};
