import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import UploadDCMButton from "../components/UploadDCMButton.tsx";
import { createParser, getMetaData, releaseParser } from "../../modules/native-dicom";

const debug = true

export default function Page() {
	const [file, setFile] = useState<string | null>("");
	const [error, setError] = useState<string>("");
	const [statusText, setStatusText] = useState<string>("");
	const PathText = () => {
		if (file != null && file.length < 1)
			return null;
		else if (file != null)
			return <Text className="text-xl font-light text-blue-500">{file}</Text>
		else
			return <Text className="text-xl font-light text-red-500">Invalid DICOM file.</Text>
	};
	const UploadSuccess = (fileUri: string) => {
            const cleanPath = fileUri.replace(/^file:\/\//, '');

            if (debug) {console.log("Sanity Check:", cleanPath);}
            setStatusText("Handing file to C++ Engine...");

            let currentInstanceId: string | null = null;

            try {

                currentInstanceId = createParser(cleanPath);

                if (!currentInstanceId) {
                    throw new Error("Failed to create a parser instance.");
                }

                const metaData = getMetaData(currentInstanceId);

                console.log("It's 3:44 am i do not have time for this");

                if (!metaData) {
                     throw new Error("Returned null metadata.");
                }
                console.log("Lumusot");
                console.log("Finished processing!", metaData);
                setStatusText(`Success! ${metaData.width}x${metaData.height}`);

            } catch (error) {
                console.log("Did i go here");
                console.error("Threw an error:", error);
                setStatusText("Failed to read the file.");
            } finally {
                if (currentInstanceId) {
                    releaseParser(currentInstanceId);
                    console.log(`Destroying this ${currentInstanceId} bword.`);
                }
            }

        };

	const UploadInvalid = () => { setFile(null); };
	const UploadCancelled = () => { setFile(""); };
	return (
		<View className="flex-1 items-center">
			<View className="flex-1 justify-center">
				<Text className="text-3xl font-bold">I can see the light!</Text>
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
