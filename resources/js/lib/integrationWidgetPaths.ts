/** Must match `IntegrationSourceTableMetric::pathToAccessor()` (PHP). */
export function integrationPathToAccessor(path: string): string {
    return path
        .trim()
        .toLowerCase()
        .replace(/\./g, '__')
        .replace(/\s+/g, '_');
}
