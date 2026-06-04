package modules.nativedicom

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeDicomModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeDicom")

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

  private external fun nativeCreateParser(path: String): String?
  private external fun nativeGetMetaData(id: String): Map<String, Any>?
  private external fun nativeGetFramePixels(id: String, frameIndex: Int): ByteArray?
  private external fun nativeReleaseParser(id: String)

  companion object {
    init {
      System.loadLibrary("NativeDicom")
    }
  }
}
