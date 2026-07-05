import { useState } from "react";
import { Text, View } from "react-native";
import { createParserJSI } from "../../modules/native-dicom";
import DICOMContentModal from "../components/DICOMContentModal";
import UploadDCMButton from "../components/UploadDCMButton";

export default function Page() {
	const [target, setTarget] = useState<string>("");
	const [error, setError] = useState<boolean>(false);
	const [statusText, setStatusText] = useState<string>("");
	const [DICOMContent, setDICOMContent] = useState<any>(null);
	const [isDICOMContentModalVisible, setIsDICOMContentModalVisible] = useState<boolean>(false);
	const DICOMContentModalClosed = () => {
		setError(false);
		setTarget("");
		setStatusText("");
		setDICOMContent(null);
		setIsDICOMContentModalVisible(false);
	};
	const StatusText = () => {
		if (statusText.length < 1)
			return null;
		const classes = 'text-xl font-light text-' + (error ? 'red' : 'blue') + '-500';
		return <Text className={classes}>{statusText}</Text>;
	};
	const UploadSuccess = (fileUri: string) => {		
		try {
			if (fileUri == null || fileUri.length < 1)
				throw new Error('Invalid DICOM file');
			const cleanPath = fileUri.replace(/^file:\/\//, '');
			const parser = createParserJSI(cleanPath);
			if (!parser)
				throw new Error('Failed to create a JSI parser instance.');
			const dicom_md = parser.getMetaData();
			if (!dicom_md)
				throw new Error('Failed to obtain metadata from DICOM');
			console.log('JSI processing success');
			console.log(dicom_md);
			setError(false);
			setTarget(fileUri);
			setDICOMContent(dicom_md);
			setStatusText(`Upload success. (${dicom_md.width}x${dicom_md.height}, ${dicom_md.numFrames} frames)`);
			setIsDICOMContentModalVisible(true);
		} catch (error: any) {
			console.log('An error has been encountered.');
			console.log(error.message);
			setError(true);
			setStatusText(error.message);
		}
    };
	const UploadInvalid = () => {
		setError(true);
		setStatusText('Invalid DICOM file.');
	};
	const UploadCancelled = () => {
		setError(true);
		setStatusText('Upload cancelled.');
	};
	return (
		<View className="m-4 h-full flex justify-center">
			<View className="ml-2 mr-2 mb-5 flex justify-center">
				<Text className="text-2xl font-bold">Welcome to DICOM Viewer.</Text>
				<Text className="text-xl font-light">Upload a DICOM file to read by clicking the Upload button below.</Text>
			</View>
			<View className="mr-6 items-center">
				<StatusText />
				<UploadDCMButton
					ButtonClass="w-[100px] h-[40px] bg-[#eb8817] justify-center items-center rounded-lg"
					TextClass="text-xl text-white font-light"
					ButtonText="Upload"
					UploadSuccess={UploadSuccess}
					UploadInvalid={UploadInvalid}
					UploadCancelled={UploadCancelled}
				/>
			</View>
			<DICOMContentModal Content={DICOMContent} TargetFile={target}
				Visibility={isDICOMContentModalVisible} ModalClosed={DICOMContentModalClosed} />
		</View>
	);
}
