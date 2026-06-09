import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import * as NativeDicom from "native-dicom";

export default function Page() {
	const [testResult, setTestResult] = useState<string>("Testing connection...");
	const [metaData, setMetaData] = useState<NativeDicom.DicomMetaData | null>(null);

	useEffect(() => {
		try {
            // const instanceId = NativeDicom.createParser("/data/user/0/com.anonymous.mobiledicomviewer/files/test/sample.dcm");
            const instanceId = NativeDicom.createParser("sample.dcm");


			if (instanceId) {
				const meta = NativeDicom.getMetaData(instanceId);
				setMetaData(meta);
				setTestResult("Native Bridge Connected!");

				NativeDicom.releaseParser(instanceId);
			} else {
				setTestResult("Failed to create parser instance.");
			}
		} catch (error) {
			setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}, []);

	return (
		<View className="flex-1 bg-white p-8">
			<View className="mt-12 items-center">
				<Text className="text-3xl font-bold text-blue-600">NativeDicom Test</Text>
				<Text className="text-lg mt-2 font-medium">{testResult}</Text>
			</View>

			{metaData && (
				<View className="mt-8 p-4 bg-gray-100 rounded-xl border border-gray-200">
					<Text className="text-xl font-bold mb-4 text-gray-800">Dummy MetaData (from C++):</Text>

					<View className="space-y-2">
						<DataRow label="Width" value={metaData.width} />
						<DataRow label="Height" value={metaData.height} />
						<DataRow label="Frames" value={metaData.numFrames} />
						<DataRow label="Bits Allocated" value={metaData.bitsAllocated} />
						<DataRow label="Bits Stored" value={metaData.bitsStored} />
						<DataRow label="Interpretation" value={metaData.photometricInterpretation} />
					</View>
				</View>
			)}

			<View className="flex-1 justify-end mb-8">
				<Text className="text-center text-gray-400 text-sm">
					If you see data above, the C++ bridge is successfully communicating with TypeScript.
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
