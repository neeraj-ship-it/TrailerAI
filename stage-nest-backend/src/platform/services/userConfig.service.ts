import { Injectable, Inject } from '@nestjs/common';

import { UserCulturesRepository } from '../../../common/repositories/userCulture.repository';
import { UserCulturesResponseDto } from '../dtos/config.response.dto';
import { Lang } from '@app/common/enums/app.enum';

import { ErrorHandlerService, Errors } from '@app/error-handler';

@Injectable()
export class UserConfigService {
  constructor(
    @Inject(UserCulturesRepository)
    private userCulturesRepository: UserCulturesRepository,

    @Inject(ErrorHandlerService)
    private errorHandlerService: ErrorHandlerService,
  ) {}

  async getAllUserCultures(lang: Lang): Promise<UserCulturesResponseDto[]> {
    const allUserCultures =
      await this.errorHandlerService.raiseErrorIfNullAsync(
        this.userCulturesRepository.getActiveUserCultures(),
        Errors.SETTING.USER_CULTURES_NOT_FOUND(),
      );

    return allUserCultures.map((cultureData) => ({
      abbreviation: cultureData.abbreviation,
      imageUrl: cultureData[lang].imageUrl,
      isEnabled: cultureData.isEnabled,
      name: cultureData.name,
      screens: {
        confirmationScreen: cultureData[lang].screens.confirmationScreen,
        selectionScreen: cultureData[lang].screens.selectionScreen,
        updateScreen: cultureData[lang].screens.updateScreen,
      },
      title: cultureData[lang].title,
    }));
  }
}
