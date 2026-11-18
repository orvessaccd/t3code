import { vi } from "vite-plus/test";

// Unit tests run in Node and mount components without <GTProvider>.
vi.mock("gt-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("gt-react")>();
  return {
    ...actual,
    useGT: ((namespace) => {
      try {
        return actual.useGT(namespace);
      } catch {
        return actual.gtFallback;
      }
    }) as typeof actual.useGT,
    useMessages: ((namespace) => {
      try {
        return actual.useMessages(namespace);
      } catch {
        return actual.mFallback;
      }
    }) as typeof actual.useMessages,
    useLocale: (() => {
      try {
        return actual.useLocale();
      } catch {
        return "en";
      }
    }) as typeof actual.useLocale,
  };
});
