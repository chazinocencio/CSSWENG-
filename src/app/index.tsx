import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import UploadDCMButton from "../components/UploadDCMButton.tsx";

export default function Page() {
	const [file, setFile] = useState<string | null>("");
	const [error, setError] = useState<string>("");
	const PathText = () => {
		if (file != null && file.length < 1)
			return null;
		else if (file != null)
			return <Text className="text-xl font-light text-blue-500">{file}</Text>
		else
			return <Text className="text-xl font-light text-red-500">Invalid DICOM file.</Text>
	};
	const UploadSuccess = (f) => { setFile(f); };
	const UploadInvalid = () => { setFile(null); };
	const UploadCancelled = () => { setFile(""); };
	return (
		<View className="flex-1 items-center">
			<View className="flex-1 justify-center">
				<Text className="text-3xl font-bold">Hello World!</Text>
				<Text className="text-xl font-light">This is the first page of your app.</Text>
				<PathText />
				<UploadDCMButton
					ButtonClass="w-[100px] h-[40px] bg-[#eb8817] justify-center items-center rounded-lg"
					TextClass="text-xl text-white font-light"
					ButtonText="Upload"
					UploadSuccess={UploadSuccess}
					UploadInvalid={UploadInvalid}
					UploadCancelled={UploadCancelled}
				/>
			</View>
		</View>
	);
}
