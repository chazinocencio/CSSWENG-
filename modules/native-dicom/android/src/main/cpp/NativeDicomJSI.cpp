#include "NativeDicomJSI.h"
#include <android/log.h>
#include <string.h>

// Added the DicomeMutableBuffer Class
// Used to counter Hermes Memory Segmentation fault (yes that's a thing pala)
// allocating natively in C++ first to safely write pixels in it
// saka mapupunta yung keys sa javascript
class DicomMutableBuffer : public facebook::jsi::MutableBuffer {
public:
    DicomMutableBuffer(size_t size) : size_(size), data_(new uint8_t[size]) {}
    ~DicomMutableBuffer() override { delete[] data_; }
    size_t size() const override { return size_; }
    uint8_t* data() override { return data_; }
private:
    size_t size_;
    uint8_t* data_;
};

#define JSI_TAG "NativeDicomJSI"
#define JSI_LOGI(...) __android_log_print(ANDROID_LOG_INFO, JSI_TAG, __VA_ARGS__)
#define JSI_LOGE(...) __android_log_print(ANDROID_LOG_ERROR, JSI_TAG, __VA_ARGS__)

using namespace facebook;

namespace facebook {
namespace jsi {

DicomParserJSI::DicomParserJSI(std::shared_ptr<DicomParser> parser) : parser_(parser) {
    JSI_LOGI("DicomParserJSI created");
}

DicomParserJSI::~DicomParserJSI() {
    JSI_LOGI("DicomParserJSI destroyed");
}

Value DicomParserJSI::get(Runtime &runtime, const PropNameID &name) {
    auto methodName = name.utf8(runtime);

    if (methodName == "getMetaData") {
        return Function::createFromHostFunction(
            runtime, name, 0,
            [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
                DicomMetaData meta = parser_->getMetaData();
                Object result(rt);
                result.setProperty(rt, "width", (double)meta.width);
                result.setProperty(rt, "height", (double)meta.height);
                result.setProperty(rt, "numFrames", (double)meta.num_frames);
                result.setProperty(rt, "bitsAllocated", (double)meta.bits_allocated);
                result.setProperty(rt, "bitsStored", (double)meta.bits_stored);
                result.setProperty(rt, "pixelRepresentation", (double)meta.pixel_representation);
                result.setProperty(rt, "photometricInterpretation", String::createFromUtf8(rt, meta.photometricInterpretation));
                return result;
            });
    }

    // edited to use the safe memory class specified above
    if (methodName == "getFramePixels") {
            return Function::createFromHostFunction(
                runtime, name, 1,
                [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
                    if (count < 1 || !args[0].isNumber()) {
                        throw JSError(rt, "getFramePixels: Expected frame index as number");
                    }
                    
                    int32_t frameIndex = (int32_t)args[0].asNumber();
                    std::vector<uint8_t> pixels;
                    
                    if (!parser_->getFramePixels(frameIndex, pixels)) {
                        return Value::null();
                    }

                    // main changes made
                    // 1. Create a native memory buffer that Hermes can understand safely
                    auto mutableBuffer = std::make_shared<DicomMutableBuffer>(pixels.size());
                    
                    // 2. Copy the DICOM pixels directly into this native buffer (No crash!)
                    memcpy(mutableBuffer->data(), pixels.data(), pixels.size());

                    // 3. Create the JS ArrayBuffer by handing over the safe native memory
                    ArrayBuffer buffer(rt, mutableBuffer);

                    // 4. Wrap it in a JS Uint8Array and return
                    Function uint8ArrayConstructor = rt.global().getPropertyAsFunction(rt, "Uint8Array");
                    return uint8ArrayConstructor.callAsConstructor(rt, buffer);
                });
        }

        return Value::undefined();
    }

void DicomParserJSI::set(Runtime &runtime, const PropNameID &name, const Value &value) {
    // No-op
}

std::vector<PropNameID> DicomParserJSI::getPropertyNames(Runtime &runtime) {
    std::vector<PropNameID> names;
    names.push_back(PropNameID::forAscii(runtime, "getMetaData"));
    names.push_back(PropNameID::forAscii(runtime, "getFramePixels"));
    return names;
}

} // namespace jsi
} // namespace facebook

namespace NativeDicomJSI {

void install(facebook::jsi::Runtime &runtime) {
    using namespace facebook::jsi;
    JSI_LOGI("Installing NativeDicomJSI");

    auto createParserJSI = Function::createFromHostFunction(
        runtime, PropNameID::forAscii(runtime, "createParserJSI"), 1,
        [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            if (count < 1 || !args[0].isString()) {
                throw JSError(rt, "createParserJSI: Expected file path as string");
            }
            std::string path = args[0].asString(rt).utf8(rt);
            auto parser = std::make_shared<DicomParser>(path);
            if (!parser->initialize()) {
                return Value::null();
            }
            return Object::createFromHostObject(rt, std::make_shared<jsi::DicomParserJSI>(parser));
        });

    Object nativeDicomJSI(runtime);
    nativeDicomJSI.setProperty(runtime, "createParserJSI", std::move(createParserJSI));

    runtime.global().setProperty(runtime, "NativeDicomJSI", std::move(nativeDicomJSI));
    JSI_LOGI("NativeDicomJSI installed successfully");
}

} // namespace NativeDicomJSI
