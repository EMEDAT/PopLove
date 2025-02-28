// utils/fetch.ts

/**
 * Fetches a file from a local URI and returns it as a Blob
 * @param uri Local URI of the file
 * @returns Blob representation of the file
 */
export async function fetchFromUri(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  }