import * as edp from "expo-document-picker";
import { Text, TouchableOpacity } from "react-native";

interface UploadDCMButtonProps {
	UploadCancelled: () => void;
	UploadInvalid: (error?: any) => void;
	UploadSuccess: (fileName: string) => void;
	UploadSuccessZIP: (fileName: string) => void;
	ButtonText: string;
	ButtonClass: string;
	TextClass: string;
}

export default function UploadDCMButton({
	UploadCancelled, UploadInvalid, UploadSuccess, UploadSuccessZIP,
	ButtonText, ButtonClass, TextClass
}: UploadDCMButtonProps) {
	const GetDocument = async () => {
		try {
			const documents = await edp.getDocumentAsync({
				type: '*/*',
				copyToCacheDirectory: true,
				multiple: false,
			});
			if (!documents.canceled) {
				const file = documents.assets[0];
				const uri = file.uri.toLowerCase();
				const ext = uri.substring(uri.lastIndexOf('.') + 1);
				if (ext === 'dcm')
					return UploadSuccess(file.uri);
				else if (ext === 'zip')
					return UploadSuccessZIP(file.uri);
				else
					return UploadInvalid();
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
