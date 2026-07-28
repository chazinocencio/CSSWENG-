#include "NativeDicomJSI.h"
#include "VolumeBuffer.h"
#include "GeometryUtils.h"
#include <android/log.h>
#include <string.h>
#include <map>
#include <algorithm>

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

namespace facebook {
namespace jsi {

DicomParserJSI::DicomParserJSI(std::shared_ptr<DicomParser> parser) : parser_(parser) {}
DicomParserJSI::~DicomParserJSI() {}

Value DicomParserJSI::get(Runtime &runtime, const PropNameID &name) {
    auto methodName = name.utf8(runtime);
    if (methodName == "getMetaData") {
        return Function::createFromHostFunction(runtime, name, 0, [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            DicomMetaData meta = parser_->getMetaData();
            Object result(rt);
            result.setProperty(rt, "width", (double)meta.width);
            result.setProperty(rt, "height", (double)meta.height);
            result.setProperty(rt, "numFrames", (double)meta.num_frames);
            result.setProperty(rt, "bitsAllocated", (double)meta.bits_allocated);
            result.setProperty(rt, "bitsStored", (double)meta.bits_stored);
            result.setProperty(rt, "pixelRepresentation", (double)meta.pixel_representation);
            result.setProperty(rt, "photometricInterpretation", String::createFromUtf8(rt, meta.photometricInterpretation));
            
            //Patient Data Information
            result.setProperty(rt, "patientName", String::createFromUtf8(rt, meta.patientName));
            result.setProperty(rt, "patientSex", String::createFromUtf8(rt, meta.patientSex));

            auto putArray = [&](const char* prop, double* vals, int size) {
                Array arr = rt.global().getPropertyAsFunction(rt, "Array").callAsConstructor(rt, size).asObject(rt).asArray(rt);
                for (int i = 0; i < size; i++) arr.setValueAtIndex(rt, i, vals[i]);
                result.setProperty(rt, prop, arr);
            };
            putArray("imagePosition", meta.imagePosition, 3);
            putArray("imageOrientation", meta.imageOrientation, 6);

            Array ps = rt.global().getPropertyAsFunction(rt, "Array").callAsConstructor(rt, 2).asObject(rt).asArray(rt);
            ps.setValueAtIndex(rt, 0, meta.pixel_spacing_x);
            ps.setValueAtIndex(rt, 1, meta.pixel_spacing_y);
            result.setProperty(rt, "pixelSpacing", ps);
            result.setProperty(rt, "sliceThickness", meta.pixel_spacing_z);
            return result;
        });
    }
    if (methodName == "getFramePixels") {
        return Function::createFromHostFunction(runtime, name, 1, [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            int32_t idx = (int32_t)args[0].asNumber();
            std::vector<uint8_t> pixels;
            if (!parser_->getFramePixels(idx, pixels)) return Value::null();
            auto mb = std::make_shared<DicomMutableBuffer>(pixels.size());
            memcpy(mb->data(), pixels.data(), pixels.size());
            return rt.global().getPropertyAsFunction(rt, "Uint8Array").callAsConstructor(rt, ArrayBuffer(rt, mb));
        });
    }
    return Value::undefined();
}

void DicomParserJSI::set(Runtime &runtime, const PropNameID &name, const Value &value) {}
std::vector<PropNameID> DicomParserJSI::getPropertyNames(Runtime &runtime) {
    std::vector<PropNameID> names;
    names.push_back(PropNameID::forAscii(runtime, "getMetaData"));
    names.push_back(PropNameID::forAscii(runtime, "getFramePixels"));
    return names;
}

VolumeJSI::VolumeJSI(std::shared_ptr<VolumeBuffer> volume) : volume_(volume) {}
VolumeJSI::~VolumeJSI() {}

Value VolumeJSI::get(Runtime &runtime, const PropNameID &name) {
    auto methodName = name.utf8(runtime);
    if (methodName == "getOrthoSlice") {
        return Function::createFromHostFunction(runtime, name, 2, [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            std::string viewStr = args[0].asString(rt).utf8(rt);
            int idx = (int)args[1].asNumber();
            double ww = count > 2 ? args[2].asNumber() : 400.0;
            double wc = count > 3 ? args[3].asNumber() : 50.0;

            GeometryUtils::ViewType vt = GeometryUtils::ViewType::UNKNOWN;
            if (viewStr == "AXIAL") vt = GeometryUtils::ViewType::AXIAL;
            else if (viewStr == "CORONAL") vt = GeometryUtils::ViewType::CORONAL;
            else if (viewStr == "SAGITTAL") vt = GeometryUtils::ViewType::SAGITTAL;

            std::vector<uint8_t> pixels;
            int outW = 0, outH = 0;
            if (!GeometryUtils::sampleOrthoView(*volume_, vt, idx, ww, wc, pixels, outW, outH)) return Value::null();

            auto mb = std::make_shared<DicomMutableBuffer>(pixels.size());
            memcpy(mb->data(), pixels.data(), pixels.size());
            Object res(rt);
            res.setProperty(rt, "pixelData", rt.global().getPropertyAsFunction(rt, "Uint8Array").callAsConstructor(rt, ArrayBuffer(rt, mb)));
            res.setProperty(rt, "width", (double)outW);
            res.setProperty(rt, "height", (double)outH);
            return res;
        });
    }
    if (methodName == "getMetadata") {
        return Function::createFromHostFunction(runtime, name, 0, [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            const DicomMetaData& meta = volume_->getMetadata();
            Object res(rt);
            res.setProperty(rt, "width", (double)meta.width);
            res.setProperty(rt, "height", (double)meta.height);
            res.setProperty(rt, "sliceCount", (double)volume_->getSliceCount());
            res.setProperty(rt, "bitsAllocated", (double)meta.bits_allocated);
            res.setProperty(rt, "pixelRepresentation", (double)meta.pixel_representation);

            res.setProperty(rt, "windowWidth", (double)meta.windowWidth);
            res.setProperty(rt, "windowCenter", (double)meta.windowCenter);

            res.setProperty(rt, "rescaleIntercept", (double)meta.rescaleIntercept);
            res.setProperty(rt, "rescaleSlope", (double)meta.rescaleSlope);

            //Patient Data Information
            res.setProperty(rt, "patientName", String::createFromUtf8(rt, meta.patientName));
            res.setProperty(rt, "patientSex", String::createFromUtf8(rt, meta.patientSex));

            Array ps = rt.global().getPropertyAsFunction(rt, "Array").callAsConstructor(rt, 2).asObject(rt).asArray(rt);
            ps.setValueAtIndex(rt, 0, meta.pixel_spacing_x);
            ps.setValueAtIndex(rt, 1, meta.pixel_spacing_y);
            res.setProperty(rt, "pixelSpacing", ps);
            res.setProperty(rt, "sliceThickness", meta.pixel_spacing_z);
            return res;
        });
    }
    if (methodName == "getScoutLine") {
        return Function::createFromHostFunction(runtime, name, 4, [this](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
            auto viewToEnum = [&](std::string s) {
                if (s == "AXIAL") return GeometryUtils::ViewType::AXIAL;
                if (s == "CORONAL") return GeometryUtils::ViewType::CORONAL;
                if (s == "SAGITTAL") return GeometryUtils::ViewType::SAGITTAL;
                return GeometryUtils::ViewType::UNKNOWN;
            };

            GeometryUtils::ViewType scoutView = viewToEnum(args[0].asString(rt).utf8(rt));
            int scoutIdx = (int)args[1].asNumber();
            GeometryUtils::ViewType targetView = viewToEnum(args[2].asString(rt).utf8(rt));
            int targetIdx = (int)args[3].asNumber();

            Point2D p1, p2;
            if (!GeometryUtils::getScoutLine(*volume_, scoutView, scoutIdx, targetView, targetIdx, p1, p2)) {
                return Value::null();
            }

            Object res(rt);
            Object pt1(rt); pt1.setProperty(rt, "x", p1.x); pt1.setProperty(rt, "y", p1.y);
            Object pt2(rt); pt2.setProperty(rt, "x", p2.x); pt2.setProperty(rt, "y", p2.y);
            res.setProperty(rt, "p1", pt1);
            res.setProperty(rt, "p2", pt2);
            return res;
        });
    }
    return Value::undefined();
}

void VolumeJSI::set(Runtime &runtime, const PropNameID &name, const Value &value) {}
std::vector<PropNameID> VolumeJSI::getPropertyNames(Runtime &runtime) {
    std::vector<PropNameID> names;
    names.push_back(PropNameID::forAscii(runtime, "getOrthoSlice"));
    names.push_back(PropNameID::forAscii(runtime, "getMetadata"));
    names.push_back(PropNameID::forAscii(runtime, "getScoutLine"));
    return names;
}

} // namespace jsi
} // namespace facebook

namespace NativeDicomJSI {
void install(facebook::jsi::Runtime &runtime) {
    using namespace facebook::jsi;
    auto createParserJSI = Function::createFromHostFunction(runtime, PropNameID::forAscii(runtime, "createParserJSI"), 1, [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
        if (count < 1 || !args[0].isObject() || !args[0].asObject(rt).isArray(rt)) {
             throw JSError(rt, "createParserJSI: Expected array of file paths");
        }

        Array pathsArray = args[0].asObject(rt).asArray(rt);
        std::vector<std::string> paths;
        for (size_t i = 0; i < pathsArray.size(rt); ++i) {
            Value val = pathsArray.getValueAtIndex(rt, i);
            if (val.isString()) {
                paths.push_back(val.asString(rt).utf8(rt));
            }
        }

        if (paths.empty()) {
            return Value::null();
        }

        auto parser = std::make_shared<DicomParser>(paths);
        return parser->initialize() ? Object::createFromHostObject(rt, std::make_shared<facebook::jsi::DicomParserJSI>(parser)) : Value::null();
    });

    auto createVolumeJSI = Function::createFromHostFunction(runtime, PropNameID::forAscii(runtime, "createVolumeJSI"), 1, [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) -> Value {
        auto paths = args[0].asObject(rt).asArray(rt);
        auto volume = std::make_shared<VolumeBuffer>();
        std::string targetSeriesUID = "";
        struct SliceInfo { std::string path; double sortValue; int instanceNum; };
        std::vector<SliceInfo> sortedSlices;

        for (size_t i = 0; i < paths.size(rt); i++) {
            std::string path = paths.getValueAtIndex(rt, i).asString(rt).utf8(rt);
            DicomParser parser(path);
            if (parser.initialize()) {
                DicomMetaData meta = parser.getMetaData();
                if (targetSeriesUID.empty()) { targetSeriesUID = meta.seriesInstanceUID; volume->setMetadata(meta); }
                if (meta.seriesInstanceUID == targetSeriesUID) {
                    Plane plane({meta.imagePosition[0], meta.imagePosition[1], meta.imagePosition[2]},
                                {meta.imageOrientation[0], meta.imageOrientation[1], meta.imageOrientation[2]},
                                {meta.imageOrientation[3], meta.imageOrientation[4], meta.imageOrientation[5]});
                    sortedSlices.push_back({path, plane.origin.dot(plane.normal), meta.instanceNumber});
                }
            }
        }

        // Sort by Instance Number (Acquisition Order) to match standard web viewers
        std::sort(sortedSlices.begin(), sortedSlices.end(), [](const SliceInfo& a, const SliceInfo& b) {
            return a.instanceNum < b.instanceNum;
        });

        // If instance numbers are missing or identical (0), fallback to physical sorting
        bool hasValidInstances = false;
        for(const auto& s : sortedSlices) if(s.instanceNum > 0) { hasValidInstances = true; break; }

        if (!hasValidInstances) {
            std::sort(sortedSlices.begin(), sortedSlices.end(), [](const SliceInfo& a, const SliceInfo& b) {
                return a.sortValue > b.sortValue; // Descending for Head-to-Toe
            });
        }


        if (!sortedSlices.empty()) {
            DicomParser firstParser(sortedSlices[0].path);
            if (firstParser.initialize()) {
                volume->setMetadata(firstParser.getMetaData());
            }
        }

        if (sortedSlices.size() >= 2) {
            double dist = std::abs(sortedSlices[1].sortValue - sortedSlices[0].sortValue);
            DicomMetaData meta = volume->getMetadata();
            if (dist > 0) meta.pixel_spacing_z = dist;
            volume->setMetadata(meta);
        }

        for (const auto& slice : sortedSlices) {
            DicomParser p(slice.path);
            std::vector<uint8_t> pixels;
            if (p.initialize() && p.getFramePixels(0, pixels)) volume->addFrame(std::move(pixels));
        }
        return volume->getSliceCount() > 0 ? Object::createFromHostObject(rt, std::make_shared<facebook::jsi::VolumeJSI>(volume)) : Value::null();
    });

    Object nativeDicomJSI(runtime);
    nativeDicomJSI.setProperty(runtime, "createParserJSI", std::move(createParserJSI));
    nativeDicomJSI.setProperty(runtime, "createVolumeJSI", std::move(createVolumeJSI));
    runtime.global().setProperty(runtime, "NativeDicomJSI", std::move(nativeDicomJSI));
}
}
