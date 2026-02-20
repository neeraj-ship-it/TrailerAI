import { TimeStamp } from '../dtos/content.dto';

export function secondsToHMS(seconds: number): TimeStamp {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return {
    hours,
    minutes,
    seconds: remainingSeconds,
  };
}

export function hmsToSeconds(time: TimeStamp): number {
  return time.hours * 3600 + time.minutes * 60 + time.seconds;
}

export function calculateRemainingForNextEpisodeNudgeInSeconds(
  contentDuration: number,
  nextEpisodeNudgeStartTime?: number,
): number {
  // if next episode nudge start time is 0, return 0. Because it means that the next episode nudge is not set.
  if (nextEpisodeNudgeStartTime === 0 || !nextEpisodeNudgeStartTime) {
    return 0;
  }
  if (nextEpisodeNudgeStartTime > contentDuration) {
    throw new Error(
      'Next episode nudge start time is greater than content duration',
    );
  }
  return contentDuration - nextEpisodeNudgeStartTime;
}

export function calculateNextEpisodeNudgeStartTime(
  duration: number,
  nextEpisodeNudgeStartTime?: number,
): number | undefined {
  if (nextEpisodeNudgeStartTime && nextEpisodeNudgeStartTime > 0) {
    return Math.max(0, duration - nextEpisodeNudgeStartTime);
  }
  return nextEpisodeNudgeStartTime;
}
