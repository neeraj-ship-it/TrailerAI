export {
  addDays as addDaysToDate,
  subDays as subtractDaysFromDate,
} from 'date-fns';
import { format } from 'date-fns';

export const HINDI_TIME_PERIODS = {
  DOPAHAR: 'दोपहर', // Afternoon (12 PM - 3 PM)
  RAAT: 'रात', // Night (7 PM - 6 AM)
  SHAM: 'शाम', // Evening (3 PM - 7 PM)
  SUBAH: 'सुबह', // Morning (6 AM - 12 PM)
};

type DateFormat = 'ddmmyyyy';

export const convertEpochToUTCString = (epoch: number) => {
  return new Date(epoch * 1000).toUTCString();
};

export const convertEpochToDateTime = (epoch: number) => {
  return new Date(epoch * 1000);
};

export const convertDateToEpoch = (date: Date): number => {
  return date.getTime();
};

export const getDateIST = (date: Date): Date => {
  // Create a new Date object to avoid modifying the original
  // Validate input
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  const inputDate = new Date(date);

  // Convert to UTC time first by adding the local timezone offset
  const utcTime =
    inputDate.getTime() + inputDate.getTimezoneOffset() * 60 * 1000;

  // Add IST offset (UTC+5:30 = 5.5 hours in milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000;

  // Return new date with IST time
  return new Date(utcTime + istOffset);
};

export const formatDate = (date: Date, dateFormat: DateFormat): string => {
  switch (dateFormat) {
    case 'ddmmyyyy':
      return format(date, 'ddMMyyyy');
    default:
      throw new Error('Invalid date format');
  }
};

export const convertDurationToHoursAndMinutes = (duration: number): string => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  // Don't show hours if it's 0 hours
  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

export const formatDateOverlayText = (
  date: Date,
  locale: string,
  availableText: string,
): string => {
  // Get formatted date parts using native JS localization
  const day = date.toLocaleDateString(locale, { day: 'numeric' });
  const month = date.toLocaleDateString(locale, { month: 'long' });

  // Get hour in 12-hour format
  const hour =
    date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      })
      .match(/(\d+)/)?.[1] || date.getHours();

  // Format time based on locale
  let timeText: string;
  if (locale === 'hi-IN') {
    // Hindi format with cultural time periods
    const hours24 = date.getHours();
    let periodText: string;

    if (hours24 >= 6 && hours24 < 12) {
      periodText = HINDI_TIME_PERIODS.SUBAH; // Morning (6 AM to 12 PM)
    } else if (hours24 >= 12 && hours24 < 15) {
      periodText = HINDI_TIME_PERIODS.DOPAHAR; // Afternoon (12 PM to 3 PM)
    } else if (hours24 >= 15 && hours24 < 19) {
      periodText = HINDI_TIME_PERIODS.SHAM; // Evening (3 PM to 7 PM)
    } else {
      periodText = HINDI_TIME_PERIODS.RAAT; // Night (7 PM to 6 AM)
    }

    timeText = `${periodText} ${hour} बजे`;
  } else {
    // English format: "8AM" or "8PM"
    const period = date.getHours() < 12 ? 'AM' : 'PM';
    timeText = `${hour}${period}`;
  }

  return `${availableText} %s ${day} ${month} ${timeText}`;
};
