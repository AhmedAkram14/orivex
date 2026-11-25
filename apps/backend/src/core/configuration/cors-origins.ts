export function parseCorsOrigins(...configuredValues: Array<string | undefined>): string[] {
  return configuredValues
    .flatMap((value) => value?.split(',') ?? [])
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
