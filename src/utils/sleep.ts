export const sleep = (ms: number | `${number}ms`): Promise<void> => {
  let duration: number;
  if (typeof ms === "string") {
    duration = Number.parseInt(ms, 10);
  } else {
    duration = ms;
  }
  return new Promise((resolve) => setTimeout(resolve, duration));
};
