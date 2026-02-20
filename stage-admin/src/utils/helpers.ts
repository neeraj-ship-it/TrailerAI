export const getClientSideCookies = (key: string) => {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const [name, value] = cookies[i].split("=");
    if (name.trim() === key) {
      return value;
    }
  }
  return null;
};
export function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  // Array of month names
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Extracting components of the date
  const day = String(date.getDate()).padStart(2, "0");
  const month = monthNames[date.getMonth()]; // Get the month name
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Formatting the date and time
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
