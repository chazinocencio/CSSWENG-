import { useState } from "react";
import { Text, View, StyleSheet} from "react-native";
import { createParserJSI } from "../../modules/native-dicom";
import DICOMContentModal from "../components/DICOMContentModal";
import UploadDCMButton from "../components/UploadDCMButton";
import { Canvas, Circle, vec } from '@shopify/react-native-skia'

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
		console.log("EXACT FILE URI:", fileUri);
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
			
			//0 dahil 2D image for now syempre iibahin kapag multiframe na
			const frameData = parser.getFramePixels(0);

			//inexpand ko na lng yung content para di na magiba yung component
			const contentWithImage = {
				//para width, height, frameData ang ibigay
				...dicom_md,
				frameData: frameData
			}
			console.log('JSI processing success');
			setError(false);
			setTarget(fileUri);
			setDICOMContent(contentWithImage);
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
