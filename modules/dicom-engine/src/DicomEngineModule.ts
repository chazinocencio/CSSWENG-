import { NativeModule, requireNativeModule } from 'expo';

declare class DicomEngineModule extends NativeModule<{}> {}

export default requireNativeModule<DicomEngineModule>('DicomEngine');
