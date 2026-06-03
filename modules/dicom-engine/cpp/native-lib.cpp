#include <jni.h>
#include <string>
#include "DicomParser.h"

DicomParser* global_parser = nullptr;

extern "C"
JNIEXPORT jboolean JNICALL
Java_expo_modules_dicomengine_DicomEngineModule_initializeParserNative(JNIEnv *env, jobject thiz, jstring j_file_path) {

    const char *path_chars = env->GetStringUTFChars(j_file_path, nullptr);
    std::string cpp_file_path(path_chars);

    env->ReleaseStringUTFChars(j_file_path, path_chars);

    if (global_parser != nullptr) {
        delete global_parser;
    }

    global_parser = new DicomParser(cpp_file_path);
    bool isSuccess = global_parser->initialize();

    return isSuccess ? JNI_TRUE : JNI_FALSE;
}