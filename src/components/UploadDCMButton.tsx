import * as EDP from "expo-document-picker";
import * as EFS from "expo-file-system";
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
			const documents = await EDP.getDocumentAsync({
				type: '*/*',
				copyToCacheDirectory: true,
				multiple: false,
			});
			if (!documents.canceled) {
				const file = documents.assets[0];
				const uri = file.uri.toLowerCase();
				const ext = uri.substring(uri.lastIndexOf('.') + 1);
				if (!ext.includes(' ') && (ext === 'dcm' || ext === 'zip')) {
					try {
						const source = new EFS.File(file.uri);
						const destination = new EFS.File(EFS.Paths.document, file.name);
						if (destination.exists)
							destination.delete();
						await source.move(destination);
						if (ext === 'dcm')
							return UploadSuccess(destination.uri);
						else if (ext === 'zip')
							return UploadSuccessZIP(destination.uri);
					} catch (error: any) {
						console.error(Error(error).stack ?? null);
						return UploadInvalid(error);
					}
				} else return UploadInvalid();
			} else {
				return UploadCancelled();
			}
		} catch (error: any) {
			console.error(error);
			return UploadInvalid(error);
		}
	}
	return (
		<TouchableOpacity className={ButtonClass} onPress={ GetDocument }>
			<Text className={TextClass}>{ButtonText}</Text>
		</TouchableOpacity>
	);
}
