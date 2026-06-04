import { requireNativeModule } from 'expo-modules-core';

const NativeDicom = requireNativeModule('NativeDicom');

export interface DicomMetaData {
  width: number;
  height: number;
  numFrames: number;
  bitsAllocated: number;
  bitsStored: number;
  pixelRepresentation: number;
  photometricInterpretation: string;
}

/**
 * Creates a new DicomParser instance for the given file path.
 * @returns An instance ID if successful, or null.
 */
export function createParser(filePath: string): string | null {
  return NativeDicom.createParser(filePath);
}

/**
 * Retrieves metadata for the given parser instance.
 */
export function getMetaData(instanceId: string): DicomMetaData | null {
  return NativeDicom.getMetaData(instanceId);
}

/**
 * Retrieves pixel data for a specific frame.
 * @returns A Uint8Array containing the raw pixel data.
 */
export function getFramePixels(instanceId: string, frameIndex: number): Uint8Array | null {
  return NativeDicom.getFramePixels(instanceId, frameIndex);
}

/**
 * Releases the native parser instance and frees associated memory.
 */
export function releaseParser(instanceId: string): void {
  NativeDicom.releaseParser(instanceId);
}
