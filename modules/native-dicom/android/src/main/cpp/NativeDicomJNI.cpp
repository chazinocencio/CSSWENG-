#include <jni.h>
#include <string>
#include <map>
#include <memory>
#include <vector>
#include <stdio.h>
#include <android/log.h>
#include "DicomParser.h"

extern "C" {
    // The Android NDK defines stdout/stderr as macros like (&__sF[1])
    FILE __sF[1024];

    #undef stdout
    #undef stderr
    FILE* stdout = &__sF[1];
    FILE* stderr = &__sF[2];

    // Override the standard IO functions that GDCM uses.
    // By providing these, prevent the system from trying to access
    // the internal state of dummy FILE pointers, avoiding the crash.

    int fprintf(FILE* stream, const char* format, ...) {
        return 0; // Do nothing
    }

    int fflush(FILE* stream) {
        return 0; // Do nothing
    }

    int fputc(int c, FILE* stream) {
        return c;
    }

    size_t fwrite(const void* ptr, size_t size, size_t nmemb, FILE* stream) {
        return nmemb;
    }

    int vfprintf(FILE* stream, const char* format, va_list ap) {
        return 0;
    }
}

static std::map<std::string, std::unique_ptr<DicomParser>> g_parsers;
static int g_next_id = 1;

extern "C"
JNIEXPORT jstring JNICALL
Java_modules_nativedicom_NativeDicomModule_nativeCreateParser(JNIEnv *env, jobject thiz, jstring path) {
    const char *nativePath = env->GetStringUTFChars(path, nullptr);
    std::string pathStr(nativePath);
    env->ReleaseStringUTFChars(path, nativePath);

    auto parser = std::make_unique<DicomParser>(pathStr);
    if (!parser->initialize()) {
        return nullptr;
    }

    std::string id = std::to_string(g_next_id++);
    g_parsers[id] = std::move(parser);
    return env->NewStringUTF(id.c_str());
}

extern "C"
JNIEXPORT jobject JNICALL
Java_modules_nativedicom_NativeDicomModule_nativeGetMetaData(JNIEnv *env, jobject thiz, jstring id) {
    const char *nativeId = env->GetStringUTFChars(id, nullptr);
    std::string idStr(nativeId);
    env->ReleaseStringUTFChars(id, nativeId);

    auto it = g_parsers.find(idStr);
    if (it == g_parsers.end()) return nullptr;

    DicomMetaData meta = it->second->getMetaData();

    jclass cls = env->FindClass("java/util/HashMap");
    jmethodID init = env->GetMethodID(cls, "<init>", "()V");
    jobject map = env->NewObject(cls, init);
    jmethodID put = env->GetMethodID(cls, "put", "(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;");

    auto putInt = [&](const char* key, int val) {
        jclass intCls = env->FindClass("java/lang/Integer");
        jmethodID intInit = env->GetMethodID(intCls, "<init>", "(I)V");
        jobject intObj = env->NewObject(intCls, intInit, val);
        env->CallObjectMethod(map, put, env->NewStringUTF(key), intObj);
    };

    putInt("width", meta.width);
    putInt("height", meta.height);
    putInt("numFrames", meta.num_frames);
    putInt("bitsAllocated", meta.bits_allocated);
    putInt("bitsStored", meta.bits_stored);
    putInt("pixelRepresentation", meta.pixel_representation);
    env->CallObjectMethod(map, put, env->NewStringUTF("photometricInterpretation"), env->NewStringUTF(meta.photometricInterpretation.c_str()));

    return map;
}

extern "C"
JNIEXPORT jbyteArray JNICALL
Java_modules_nativedicom_NativeDicomModule_nativeGetFramePixels(JNIEnv *env, jobject thiz, jstring id, jint frameIndex) {
    const char *nativeId = env->GetStringUTFChars(id, nullptr);
    std::string idStr(nativeId);
    env->ReleaseStringUTFChars(id, nativeId);

    auto it = g_parsers.find(idStr);
    if (it == g_parsers.end()) return nullptr;

    std::vector<uint8_t> pixels;
    if (!it->second->getFramePixels(frameIndex, pixels)) return nullptr;

    jbyteArray array = env->NewByteArray(pixels.size());
    env->SetByteArrayRegion(array, 0, pixels.size(), reinterpret_cast<const jbyte*>(pixels.data()));
    return array;
}

extern "C"
JNIEXPORT void JNICALL
Java_modules_nativedicom_NativeDicomModule_nativeReleaseParser(JNIEnv *env, jobject thiz, jstring id) {
    const char *nativeId = env->GetStringUTFChars(id, nullptr);
    std::string idStr(nativeId);
    env->ReleaseStringUTFChars(id, nativeId);
    g_parsers.erase(idStr);
}
