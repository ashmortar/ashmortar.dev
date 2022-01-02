import { formatDistance } from 'date-fns';

export const formatRelativeDate = (date: Date | string) => {
  const now = new Date();
  let then = date;
  if (typeof then === 'string') {
    then = new Date(then);
  }
  return formatDistance(then, now, { addSuffix: true });
};
