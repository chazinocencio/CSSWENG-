#pragma once

#include <jsi/jsi.h>
#include "DicomParser.h"
#include "VolumeBuffer.h"

namespace facebook {
namespace jsi {

class DicomParserJSI : public HostObject {
public:
    DicomParserJSI(std::shared_ptr<DicomParser> parser);
    ~DicomParserJSI();

    Value get(Runtime &runtime, const PropNameID &name) override;
    void set(Runtime &runtime, const PropNameID &name, const Value &value) override;
    std::vector<PropNameID> getPropertyNames(Runtime &runtime) override;

private:
    std::shared_ptr<DicomParser> parser_;
};

class VolumeJSI : public HostObject {
public:
    VolumeJSI(std::shared_ptr<VolumeBuffer> volume);
    ~VolumeJSI();

    Value get(Runtime &runtime, const PropNameID &name) override;
    void set(Runtime &runtime, const PropNameID &name, const Value &value) override;
    std::vector<PropNameID> getPropertyNames(Runtime &runtime) override;

private:
    std::shared_ptr<VolumeBuffer> volume_;
};

} // namespace jsi
} // namespace facebook

namespace NativeDicomJSI {
    void install(facebook::jsi::Runtime &runtime);
}
