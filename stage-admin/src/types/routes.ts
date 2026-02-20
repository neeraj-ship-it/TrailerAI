import { IconType } from "react-icons/lib";

export enum RoutesEnum {
  LOGIN = "LOGIN",
  FORBIDDEN = "FORBIDDEN",
  DASHBOARD = "DASHBOARD",
  REFUND = "REFUND",
  HOMEPAGE = "DYNAMIC_HOME",
  VARIANT = "VARIANT",
  ROW = "ROW",
  PaymentGateway = "PG",
  CENSOR_BOARD = "CENSOR_BOARD",
  PLATTER = "PLATTER_MANAGEMENT",
  DEEPLINK = "DEEPLINK",
  VIDEO_QC = "VIDEO_QC",
  TRAILER = "TRAILER",
  CLIP_EXTRACTOR = "CLIP_EXTRACTOR",
}

type RouteConfigBase = {
  name: string;
  path: string;
  icon?: IconType;
  isProtected: boolean;
  requiredPrivilege?: string;
};

export type RouteConfig = RouteConfigBase &
  (
    | { isProtected: false }
    | {
        isProtected: true;
        protectedPageName: ProtectedRoutesEnum;
      }
  );

export enum PrivilegeTypesEnum {
  FULL_ACCESS = "FULL_ACCESS",
  READ = "READ",
  WRITE = "WRITE",
  ALL = "ALL",
  UPDATE = "UPDATE",
}

export enum ProtectedRoutesEnum {
  REFUND = RoutesEnum.REFUND,
  HOMEPAGE = RoutesEnum.HOMEPAGE,
  VARIANT = RoutesEnum.VARIANT,
  HOMEPAGEROW = RoutesEnum.ROW,
  PaymentGateway = RoutesEnum.PaymentGateway,
  CENSOR_BOARD = RoutesEnum.CENSOR_BOARD,
  PLATTER = RoutesEnum.PLATTER,
  DEEPLINK = RoutesEnum.DEEPLINK,
  VIDEO_QC = RoutesEnum.VIDEO_QC,
  TRAILER = RoutesEnum.TRAILER,
  CLIP_EXTRACTOR = RoutesEnum.CLIP_EXTRACTOR,
}

export enum UnprotectedRoutesEnum {
  LOGIN = RoutesEnum.LOGIN,
  FORBIDDEN = RoutesEnum.FORBIDDEN,
  DASHBOARD = RoutesEnum.DASHBOARD,
}
