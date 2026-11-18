import type { useGT } from "../../i18n/runtime";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Translate = ReturnType<typeof useGT>;

export function formatScheduledTaskInterval(everyMs: number, gt?: Translate): string {
  const units = [
    [7 * DAY, "week"],
    [DAY, "day"],
    [HOUR, "hour"],
    [MINUTE, "minute"],
    [1_000, "second"],
    [1, "millisecond"],
  ] as const;
  let remaining = everyMs;
  if (!gt) {
    const parts: string[] = [];
    for (const [size, unit] of units) {
      const count = Math.floor(remaining / size);
      if (count === 0) continue;
      if (count === 1 && remaining === everyMs && remaining === size) return `Every ${unit}`;
      parts.push(`${count} ${unit}${count === 1 ? "" : "s"}`);
      remaining %= size;
    }
    return `Every ${parts.join(" ")}`;
  }

  const parts: string[] = [];
  for (const [size, unit] of units) {
    const count = Math.floor(remaining / size);
    if (count === 0) continue;
    if (count === 1 && remaining === everyMs && remaining === size) {
      switch (unit) {
        case "week":
          return gt("Every week");
        case "day":
          return gt("Every day");
        case "hour":
          return gt("Every hour");
        case "minute":
          return gt("Every minute");
        case "second":
          return gt("Every second");
        case "millisecond":
          return gt("Every millisecond");
      }
    }
    switch (unit) {
      case "week":
        parts.push(count === 1 ? gt("{count} week", { count }) : gt("{count} weeks", { count }));
        break;
      case "day":
        parts.push(count === 1 ? gt("{count} day", { count }) : gt("{count} days", { count }));
        break;
      case "hour":
        parts.push(count === 1 ? gt("{count} hour", { count }) : gt("{count} hours", { count }));
        break;
      case "minute":
        parts.push(
          count === 1 ? gt("{count} minute", { count }) : gt("{count} minutes", { count }),
        );
        break;
      case "second":
        parts.push(
          count === 1 ? gt("{count} second", { count }) : gt("{count} seconds", { count }),
        );
        break;
      case "millisecond":
        parts.push(
          count === 1
            ? gt("{count} millisecond", { count })
            : gt("{count} milliseconds", { count }),
        );
        break;
    }
    remaining %= size;
  }
  return gt("Every {interval}", { interval: parts.join(" ") });
}

function localCalendarDay(date: Date): number {
  // Compare calendar days, not 24-hour spans: DST days can have 23 or 25 hours.
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

export function formatNextScheduledTaskRun(
  nextRunAt: string,
  now: number,
  gt?: Translate,
  locale?: string,
): string {
  const next = new Date(nextRunAt);
  const current = new Date(now);
  const remaining = next.getTime() - now;
  if (!gt) {
    if (!Number.isFinite(remaining)) return "Next run unavailable";
    if (remaining <= 0) return "Next run due";

    const days = localCalendarDay(next) - localCalendarDay(current);
    if (days === 0) {
      if (remaining < MINUTE) return "Next run in less than a minute";
      const minutes = Math.round(remaining / MINUTE);
      const unit = minutes < 60 ? "minute" : "hour";
      const count = minutes < 60 ? minutes : Math.round(remaining / HOUR);
      return `Next run in ${count} ${unit}${count === 1 ? "" : "s"}`;
    }

    const time = next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (days === 1) return `Next run tomorrow at ${time}`;
    if (days <= 7) {
      return `Next run next ${next.toLocaleDateString([], { weekday: "long" })} at ${time}`;
    }
    const date = next.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      ...(next.getFullYear() !== current.getFullYear() ? { year: "numeric" as const } : {}),
    });
    return `Next run ${date} at ${time}`;
  }

  if (!Number.isFinite(remaining)) return gt("Next run unavailable");
  if (remaining <= 0) return gt("Next run due");

  const days = localCalendarDay(next) - localCalendarDay(current);
  if (days === 0) {
    if (remaining < MINUTE) return gt("Next run in less than a minute");
    const minutes = Math.round(remaining / MINUTE);
    if (minutes < 60) {
      return minutes === 1
        ? gt("Next run in {count} minute", { count: minutes })
        : gt("Next run in {count} minutes", { count: minutes });
    }
    const count = Math.round(remaining / HOUR);
    return count === 1
      ? gt("Next run in {count} hour", { count })
      : gt("Next run in {count} hours", { count });
  }

  const localeArg = locale ? [locale] : [];
  const time = next.toLocaleTimeString(localeArg, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return gt("Next run tomorrow at {time}", { time });
  if (days <= 7) {
    return gt("Next run next {weekday} at {time}", {
      weekday: next.toLocaleDateString(localeArg, { weekday: "long" }),
      time,
    });
  }
  const date = next.toLocaleDateString(localeArg, {
    month: "short",
    day: "numeric",
    ...(next.getFullYear() !== current.getFullYear() ? { year: "numeric" as const } : {}),
  });
  return gt("Next run {date} at {time}", { date, time });
}
