import { PlatformOptionEnum } from "@/types/variant";
import { DialectEnum } from "@/types/common";

export const DIALECTS = [
  { value: DialectEnum.HARYANA, label: "Haryanvi" },
  { value: DialectEnum.RAJASTHAN, label: "Rajasthani" },
  { value: DialectEnum.BHOPURI, label: "Bhojpuri" },
  { value: DialectEnum.GUJARATI, label: "Gujarati" },
];

export const otherRefundReason = "Other";

export const refundReasons = [
  "TNPL Autopay (was not informed)",
  "Cancelled but money deducted",
  "Money deducted multiple times",
  "Time Nahi hai",
  "Galti se kar liya",
  "TV pe nahi chal raha",
  otherRefundReason,
];

// cookies keys
export const CookieKeys = {
  token: "token",
  privileges: "privileges",
};

export const platformOptions = [
  PlatformOptionEnum.APP,
  PlatformOptionEnum.TV,
  PlatformOptionEnum.WEB,
];

export const PLACEHOLDER_IMAGE_URL =
  "https://placehold.co/1600x1600?text=No+Image";

export const Routes = {
  Home: { path: "/dynamicHomepage" },
  Variants: { path: "/dynamicHomepage/variants" },
  VariantDetail: (variantId: string) =>
    `/dynamicHomepage/variants/${variantId}`,
  CreateVariant: { path: "/dynamicHomepage/variants/create" },
};

export const rowRoutes = {
  Home: { path: "/dynamicHomepage" },
  Rows: { path: "/dynamicHomepage/rows" },
  RowDetail: (rowId: string) => `/dynamicHomepage/rows/${rowId}`,
  CreateRow: { path: "/dynamicHomepage/rows/create" },
};

export const dialogConfig = {
  publish: {
    title: "Confirm Publish",
    description:
      "Are you sure you want to publish these changes? This will update the platter for all users.",
    confirmLabel: "Publish",
    confirmClassName: "bg-red-700 hover:bg-red-800 cursor-pointer",
  },
  delete: {
    title: "Delete Content",
    description:
      "Are you sure you want to delete this content item? This action cannot be undone.",
    confirmLabel: "Delete",
    confirmClassName: "bg-red-700 hover:bg-red-800 cursor-pointer",
  },
};
