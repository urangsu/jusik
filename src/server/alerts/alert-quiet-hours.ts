export function isInQuietHours(
  date: Date,
  quietHours?: { enabled: boolean; start: string; end: string; timezone: string }
): boolean {
  if (!quietHours || !quietHours.enabled) {
    return false;
  }

  const tzString = quietHours.timezone || "Asia/Seoul";

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tzString,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const minutePart = parts.find((p) => p.type === "minute")?.value;

    if (!hourPart || !minutePart) {
      return false;
    }

    const currentMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

    const [startHour, startMin] = quietHours.start.split(":").map((v) => parseInt(v, 10));
    const [endHour, endMin] = quietHours.end.split(":").map((v) => parseInt(v, 10));

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Over midnight quiet hours
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch (err) {
    console.error("Error parsing quiet hours timezone:", err);
    return false;
  }
}
