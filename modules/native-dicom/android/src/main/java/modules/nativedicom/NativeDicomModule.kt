package modules.nativedicom

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeDicomModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeDicom")

    OnCreate {
      val runtime = appContext.runtime
      val reactContext = runtime.reactContext
      val jsRuntimePointer = reactContext?.javaScriptContextHolder?.get() ?: 0L
      if (jsRuntimePointer != 0L) {
        nativeInstallJSI(jsRuntimePointer)
      }
    }

    /**
     * Expo Module Definition
     * These functions map the TypeScript calls to Kotlin, which then
     * calls the 'external' (JNI) native methods defined below.
     */

    Function("createParser") { path: String ->
      nativeCreateParser(path)
    }

    Function("getMetaData") { id: String ->
      nativeGetMetaData(id)
    }

    Function("getFramePixels") { id: String, frameIndex: Int ->
      nativeGetFramePixels(id, frameIndex)
    }

    Function("releaseParser") { id: String ->
      nativeReleaseParser(id)
    }
  }

  /**
   * Native Declarations
   * The 'external' keyword tells Kotlin that these functions are implemented 
   * in C++ (NativeDicomJNI.cpp). The Android NDK links them by name.
   */
  private external fun nativeCreateParser(path: String): String?
  private external fun nativeGetMetaData(id: String): Map<String, Any>?
  private external fun nativeGetFramePixels(id: String, frameIndex: Int): ByteArray?
  private external fun nativeReleaseParser(id: String)
  private external fun nativeInstallJSI(jsiRuntimePointer: Long)

  companion object {
    init {
      // This loads 'libNativeDicom.so' which contains our C++ logic
      System.loadLibrary("NativeDicom")
    }
  }
}
