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
  imagePosition: number[];
  imageOrientation: number[];
  pixelSpacing: number[];
  sliceThickness: number;
  spacingBetweenSlices: number;
  seriesInstanceUID: string;
  frameOfReferenceUID: string;
  patientName: string;
  patientSex: string;
}

export interface DicomParserJSI {
  getMetaData(): DicomMetaData;
  getFramePixels(frameIndex: number): Uint8Array | null;
}

export interface VolumeJSI {
  getOrthoSlice(viewType: 'AXIAL' | 'CORONAL' | 'SAGITTAL', sliceIndex: number): {
    pixelData: Uint8Array;
    width: number;
    height: number;
  } | null;
  getMetadata(): {
    width: number;
    height: number;
    sliceCount: number;
    pixelSpacing: [number, number];
    sliceThickness: number;
    bitsAllocated: number;
    pixelRepresentation: number;
    windowWidth: number;
    windowCenter: number;
    patientName: string;
    patientSex: string;
  };
  getScoutLine(
    scoutViewType: 'AXIAL' | 'CORONAL' | 'SAGITTAL',
    scoutIndex: number,
    targetViewType: 'AXIAL' | 'CORONAL' | 'SAGITTAL',
    targetIndex: number
  ): { p1: { x: number, y: number }, p2: { x: number, y: number } } | null;
}

declare global {
  var NativeDicomJSI: {
    createParserJSI(paths: string[]): DicomParserJSI | null;
    createVolumeJSI(paths: string[]): VolumeJSI | null;
  } | undefined;
}

export function createParserJSI(filePaths: string | string[]): DicomParserJSI | null {
  if (typeof global.NativeDicomJSI === 'undefined') return null;
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  console.log("createParserJSI called with paths:", paths);
  return global.NativeDicomJSI.createParserJSI(paths);
}

export function createVolumeJSI(paths: string[]): VolumeJSI | null {
  if (typeof global.NativeDicomJSI === 'undefined') return null;
  return global.NativeDicomJSI.createVolumeJSI(paths);
}

export function createParser(filePath: string): string | null { return NativeDicom.createParser(filePath); }
export function getMetaData(instanceId: string): DicomMetaData | null { return NativeDicom.getMetaData(instanceId); }
export function getFramePixels(instanceId: string, frameIndex: number): Uint8Array | null { return NativeDicom.getFramePixels(instanceId, frameIndex); }
export function releaseParser(instanceId: string): void { NativeDicom.releaseParser(instanceId); }
