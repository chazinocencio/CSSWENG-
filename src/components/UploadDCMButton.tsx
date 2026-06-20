import { Text, TouchableOpacity, View } from "react-native";
import * as edp from "expo-document-picker";
import * as fs from "expo-file-system";

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
				type: '*/*',
				copyToCacheDirectory: true,
				multiple: false,
			});
			if (!documents.canceled) {
				const file = documents.assets[0];
				return !file.name.toLowerCase().endsWith(".dcm")
			    ? UploadInvalid()
				: UploadSuccess(file.uri);

                console.log("minekaniko ni moniko ang makina ng minika ni monika"  + !file.name.toLowerCase().endsWith(".dcm") + file.name);
                console.log(file.uri);
                return UploadSuccess(file.uri);
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
