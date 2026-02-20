interface UserCultureScreens {
  confirmationScreen: ScreenData;
  selectionScreen: ScreenData;
  updateScreen: ScreenData;
}

interface ScreenData {
  title: string;
}

export interface UserCulturesResponseDto {
  abbreviation: string;
  imageUrl: string;
  isEnabled: boolean;
  name: string;
  screens: UserCultureScreens;
  title: string;
}
