import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Asset } from "expo-asset";
import { router } from "expo-router";

//Customized Module for DICOM files
import * as NativeDicom from "native-dicom";

export default function AssetTestPage() {
	const [status, setStatus] = useState<string>("Initializing...");
	const [metaData, setMetaData] = useState<NativeDicom.DicomMetaData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function runTest() {
			try {
				setStatus("Loading asset...");
				// Load the dicom file from the assets directory
				const asset = Asset.fromModule(require("../../assets/sample.dcm"));
				await asset.downloadAsync();

				if (!asset.localUri) {
					throw new Error("Failed to get local URI for asset");
				}

				setStatus("Preparing file path...");
				// On Android, might need to remove the 'file://' prefix for GDCM
				let filePath = asset.localUri;
				if (filePath.startsWith("file://")) {
					filePath = filePath.substring(7);
				}

				setStatus(`Parsing DICOM (JNI) at: ${filePath}`);
				const instanceId = NativeDicom.createParser(filePath);

                // Successful creation of parser instance DICOM file
				if (instanceId) {
					const meta = NativeDicom.getMetaData(instanceId);
					setMetaData(meta);
					setStatus("JNI Parsing Successful! Now testing JSI...");
					NativeDicom.releaseParser(instanceId);

                    // --- JSI TEST ---
                    try {
                        const jsiParser = NativeDicom.createParserJSI(filePath);
                        if (jsiParser) {
                            const jsiMeta = jsiParser.getMetaData();
                            console.log("JSI MetaData:", jsiMeta);
                            const jsiPixels = jsiParser.getFramePixels(0);
                            console.log("JSI Pixels length:", jsiPixels?.length);
                            setStatus("JNI & JSI Parsing Successful!");
                        } else {
                            setError("JSI Parser creation failed (returned null).");
                        }
                    } catch (jsiErr) {
                        console.error("JSI Test Error:", jsiErr);
                        setError(`JSI Test Failed: ${jsiErr instanceof Error ? jsiErr.message : String(jsiErr)}`);
                    }
                    // ----------------
				} else {
					setError("Failed to create parser instance. GDCM might have failed to read the file. This is expected if 'sample.dcm' is not a valid DICOM file.");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			} finally {
				setLoading(false);
			}
		}

		runTest();
	}, []);

	return (
		<View className="flex-1 bg-white p-8">
			<View className="mt-12 items-center">
				<Text className="text-3xl font-bold text-blue-600">DICOM Parsing Test</Text>
				<Text className={`text-lg mt-2 font-medium ${error ? 'text-red-500' : 'text-gray-700'} text-center`}>
					{error || status}
				</Text>
			</View>

			{loading && (
				<View className="mt-8">
					<ActivityIndicator size="large" color="#208AEF" />
				</View>
			)}

			{metaData && (
				<ScrollView className="mt-8 p-4 bg-gray-100 rounded-xl border border-gray-200">
					<Text className="text-xl font-bold mb-4 text-gray-800">Actual MetaData (from GDCM):</Text>

					<View className="space-y-2">
						<DataRow label="Width" value={metaData.width} />
						<DataRow label="Height" value={metaData.height} />
						<DataRow label="Frames" value={metaData.numFrames} />
						<DataRow label="Bits Allocated" value={metaData.bitsAllocated} />
						<DataRow label="Bits Stored" value={metaData.bitsStored} />
						<DataRow label="Pixel Representation" value={metaData.pixelRepresentation} />
						<DataRow label="Interpretation" value={metaData.photometricInterpretation} />
					</View>
				</ScrollView>
			)}

			{error && (
				<View className="mt-8 p-4 bg-red-50 rounded-xl border border-red-200">
					<Text className="text-red-800 font-bold">Error Details:</Text>
					<Text className="text-red-600">{error}</Text>
				</View>
			)}

            <TouchableOpacity
                onPress={() => router.back()}
                className="mt-8 bg-blue-500 p-4 rounded-xl items-center"
            >
                <Text className="text-white font-bold">Back to Home</Text>
            </TouchableOpacity>

			<View className="mt-auto mb-8">
				<Text className="text-center text-gray-400 text-sm">
					This test copies sample.dcm from assets to a local path and attempts to parse it using the native GDCM library.
				</Text>
			</View>
		</View>
	);
}

function DataRow({ label, value }: { label: string; value: string | number }) {
	return (
		<View className="flex-row justify-between py-1 border-b border-gray-200">
			<Text className="font-semibold text-gray-600">{label}:</Text>
			<Text className="text-gray-900">{value}</Text>
		</View>
	);
}
