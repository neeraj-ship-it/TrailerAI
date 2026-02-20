import { ProtectedRoutesEnum, RouteConfig, RoutesEnum } from "@/types/routes";
import {
  RiRefund2Line,
  RiSecurePaymentLine,
  RiSmartphoneLine,
  RiDashboardLine,
  RiFilmLine,
  RiVideoLine,
  RiMovie2Line,
  RiScissorsLine,
} from "react-icons/ri";

export const Routes: {
  [key in RoutesEnum]: RouteConfig;
} = {
  [RoutesEnum.LOGIN]: {
    path: "/login",
    name: "Login",
    isProtected: false,
  },
  [RoutesEnum.FORBIDDEN]: {
    path: "/forbidden",
    name: "Forbidden",
    isProtected: false,
  },
  [RoutesEnum.DASHBOARD]: {
    path: "/",
    name: "Dashboard",
    isProtected: false,
  },
  [RoutesEnum.REFUND]: {
    path: "/refund",
    icon: RiRefund2Line,
    name: "Refund",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.REFUND,
  },
  [RoutesEnum.PaymentGateway]: {
    path: "/payment-gateway",
    icon: RiSecurePaymentLine,
    name: "Payment Gateway",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.PaymentGateway,
  },
  [RoutesEnum.HOMEPAGE]: {
    path: "/dynamicHomepage",
    icon: RiSmartphoneLine,
    name: "Dynamic Homepage",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.HOMEPAGE,
  },
  [RoutesEnum.VARIANT]: {
    path: "/dynamicHomepage/variants",
    name: "Variant Details",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.VARIANT,
  },
  [RoutesEnum.ROW]: {
    path: "/dynamicHomepage/rows",
    name: "Row Details",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.VARIANT,
  },
  [RoutesEnum.CENSOR_BOARD]: {
    path: "/censor-board",
    name: "Censor Board",
    icon: RiFilmLine,
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.CENSOR_BOARD,
  },
  [RoutesEnum.PLATTER]: {
    path: "/dynamicHomepage/platter-management",
    name: "Platter Management",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.PLATTER,
  },
  [RoutesEnum.DEEPLINK]: {
    path: "/deeplink-console",
    icon: RiDashboardLine,
    name: "Link Manager",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.DEEPLINK,
  },
  [RoutesEnum.VIDEO_QC]: {
    path: "/video-qc",
    icon: RiVideoLine,
    name: "Video QC",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.VIDEO_QC,
  },
  [RoutesEnum.TRAILER]: {
    path: "/trailer",
    icon: RiMovie2Line,
    name: "Trailer Generator",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.TRAILER,
  },
  [RoutesEnum.CLIP_EXTRACTOR]: {
    path: "/clip-extractor",
    icon: RiScissorsLine,
    name: "Clip Extractor",
    isProtected: true,
    protectedPageName: ProtectedRoutesEnum.CLIP_EXTRACTOR,
  },
};

export const sidebarNavigationRoutes = [
  Routes.TRAILER,
  Routes.CLIP_EXTRACTOR,
] as const;
