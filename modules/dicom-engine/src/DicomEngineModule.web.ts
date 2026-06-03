import { registerWebModule, NativeModule } from 'expo';

// DicomEngineModule is not available on the web platform.
class DicomEngineModule extends NativeModule<{}> {}

export default registerWebModule(DicomEngineModule, 'DicomEngineModule');
