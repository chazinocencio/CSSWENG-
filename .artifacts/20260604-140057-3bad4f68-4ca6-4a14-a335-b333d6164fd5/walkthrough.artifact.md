# NativeDicom Module Setup Walkthrough

I have set up a cross-platform Expo module named `native-dicom` that shares a single C++ core between iOS and Android. This structure is ready for the integration of GDCM and future features like DICOM MPR.

## Project Structure

```text
modules/native-dicom/
├── cpp/                      # Shared C++ Logic
│   ├── DicomParser.h
│   └── DicomParser.cpp
├── android/                  # Android Native Layer
│   ├── src/main/cpp/
│   │   ├── CMakeLists.txt    # Links to ../../../../cpp/
│   │   └── NativeDicomJNI.cpp
│   ├── src/main/java/.../NativeDicomModule.kt
│   └── build.gradle
├── ios/                      # iOS Native Layer
│   ├── NativeDicom.podspec   # Links to ../cpp/
│   ├── NativeDicomBridge.h   # Obj-C++ Header
│   ├── NativeDicomBridge.mm  # Obj-C++ Implementation (calls C++)
│   └── NativeDicomModule.swift
├── index.ts                  # TypeScript Interface
├── expo-module.config.json   # Expo Module Config
└── package.json              # Module Package Config
```

## TypeScript API

The module now supports instance-based parsing to handle the stateful `DicomParser` C++ class.

```typescript
import * as NativeDicom from 'native-dicom';

// 1. Create a parser instance
const instanceId = NativeDicom.createParser('/path/to/file.dcm');

if (instanceId) {
  // 2. Get metadata
  const meta = NativeDicom.getMetaData(instanceId);
  console.log(`Resolution: ${meta.width}x${meta.height}`);

  // 3. Get pixel data for a frame
  const pixels = NativeDicom.getFramePixels(instanceId, 0); // returns Uint8Array

  // 4. Release when done
  NativeDicom.releaseParser(instanceId);
}
```

## Key Files

### Shared C++
- [DicomParser.h](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/cpp/DicomParser.h) & [DicomParser.cpp](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/cpp/DicomParser.cpp): Core logic using GDCM.

### Android Integration
- [NativeDicomJNI.cpp](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/android/src/main/cpp/NativeDicomJNI.cpp): Manages a `std::map` of parser instances and handles JNI type conversions (HashMap, ByteArray).
- [NativeDicomModule.kt](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/android/src/main/java/modules/nativedicom/NativeDicomModule.kt): Defines the Expo Module interface for Android.

### iOS Integration
- [NativeDicomBridge.mm](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/ios/NativeDicomBridge.mm): Objective-C++ bridge managing C++ instances and converting types to `NSDictionary` and `NSData`.
- [NativeDicomModule.swift](file:///C:/Users/Joramm/StudioProjects/CSSWENG-/modules/native-dicom/ios/NativeDicomModule.swift): Defines the Expo Module interface for iOS.

## Verification
- Verified directory structure and file existence.
- Confirmed build system paths (CMake and Podspec) correctly point to the shared `cpp` directory.
- Root `package.json` updated with `native-dicom` dependency.
- TypeScript interface updated with proper typing and instance management methods.
