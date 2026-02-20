import {
  MandateStatusNotAvailableEnum,
  MasterMandateStatusEnum,
} from 'common/enums/common.enums';

export type MappedMandateStatus =
  | MasterMandateStatusEnum
  | MandateStatusNotAvailableEnum;
