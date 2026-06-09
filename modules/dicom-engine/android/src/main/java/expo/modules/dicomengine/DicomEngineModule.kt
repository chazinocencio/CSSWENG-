package expo.modules.dicomengine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DicomEngineModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DicomEngine")
  }
}
