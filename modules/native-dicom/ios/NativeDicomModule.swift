import expo_modules_core

public class NativeDicomModule: Module {
  let bridge = NativeDicomBridge()

  public func definition() -> ModuleDefinition {
    Name("NativeDicom")

    Function("createParser") { (path: String) -> String? in
      return bridge.createParser(path)
    }

    Function("getMetaData") { (id: String) -> [String: Any]? in
      return bridge.getMetaData(id) as? [String: Any]
    }

    Function("getFramePixels") { (id: String, frameIndex: Int) -> Data? in
      return bridge.getFramePixels(id, frameIndex: Int32(frameIndex))
    }

    Function("releaseParser") { (id: String) in
      bridge.releaseParser(id)
    }
  }
}
