import { Text, TouchableOpacity, View } from "react-native";
import * as edp from "expo-document-picker";

interface UploadDCMButtonProps {
	UploadCancelled: () => void;
	UploadInvalid: (error?: any) => void;
	UploadSuccess: (fileName: string) => void;
	ButtonText: string;
	ButtonClass: string;
	TextClass: string;
}

export default function UploadDCMButton({UploadCancelled, UploadInvalid, UploadSuccess, ButtonText, ButtonClass, TextClass}: UploadDCMButtonProps) {
	const GetDocument = async () => {
		try {
			const documents = await edp.getDocumentAsync({
				type: 'application/dicom',
				copyToCacheDirectory: false,
				multiple: false,
			});
			if (!documents.canceled) {
				const file = documents.assets[0];
				return !file.name.toLowerCase().endsWith(".dcm")
					? UploadInvalid()
					: UploadSuccess(file.name);
			} else {
				return UploadCancelled();
			}
		} catch (e) {
			return UploadInvalid(e);
		}
	}	
	return (
		<TouchableOpacity className={ButtonClass} onPress={ GetDocument }>
			<Text className={TextClass}>{ButtonText}</Text>
		</TouchableOpacity>
	);
}
