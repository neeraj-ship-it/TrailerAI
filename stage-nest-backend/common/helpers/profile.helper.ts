import { DialectName } from 'common/enums/app.enum';

//generate random string using dialect + randomnumber
export const generateRandomDisplayName = (dialect: string) => {
  const dialectName = DialectName[dialect as keyof typeof DialectName];
  const randomNumber = Math.floor(Math.random() * 1000000);
  return `${dialectName}${randomNumber}`;
};
