import * as Crypto from 'expo-crypto';
import * as EFS from 'expo-file-system';
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { unzip } from 'react-native-zip-archive';
import { createParserJSI } from "../../modules/native-dicom";
import DICOMContentModal from "../components/DICOMContentModal";
import UploadDCMButton from "../components/UploadDCMButton";

export default function Page() {
	const [target, setTarget] = useState<string>("");
	const [error, setError] = useState<boolean>(false);
	const [statusText, setStatusText] = useState<string>("");
	const [DICOMContent, setDICOMContent] = useState<any>(null);
	const [ZIPContent, setZIPContent] = useState<any>(null);
	const [isDICOMContentModalVisible, setIsDICOMContentModalVisible] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const DICOMContentModalClosed = () => {
		setError(false);
		setTarget("");
		setStatusText("");
		setDICOMContent(null);
		setZIPContent(null);
		setIsDICOMContentModalVisible(false);
	};
	const DICOMContentModalShown = () => {
		setIsLoading(false);
	};
	const StatusText = () => {
		if (statusText.length < 1)
			return null;
		const classes = 'text-xl font-light text-' + (error ? 'red' : 'blue') + '-500';
		return <Text className={classes}>{statusText}</Text>;
	};
	const UploadSuccess = async (fileUri: string) => {		
		setIsLoading(true);
		/* Since originally di async tong function na to,
		 * suspend for a very short moment para magrender ung loading spinner
		 * (pauses for 50 ms) */
		await new Promise(res => setTimeout(res, 50));
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
			
			/* 0 dahil 2D image for now syempre iibahin kapag multiframe na */
			const frameData = parser.getFramePixels(0);

			/* inexpand ko na lng yung content para di na magiba yung component */
			const contentWithImage = {
				/* para width, height, frameData ang ibigay */
				...dicom_md,
				frameData
			}
			console.log('JSI processing success');
			setError(false);
			setTarget(fileUri);
			setDICOMContent(contentWithImage);
			setZIPContent(null);
			setStatusText(`Upload success. (${dicom_md.width}x${dicom_md.height}, ${dicom_md.numFrames} frames)`);
			setIsDICOMContentModalVisible(true);
		} catch (error: any) {
			console.log('An error has been encountered.');
			console.log(error.message);
			setError(true);
			setStatusText(error.message);
		}
    };
	const UploadSuccessZIP = async (fileUri: string) => {
		setIsLoading(true);
		try {
			const uuid = Crypto.randomUUID();
			const cpwd = new EFS.Directory(EFS.Paths.cache, uuid);
			cpwd.create();
			if (!cpwd.exists || !cpwd.info().creationTime)
				throw new Error('Unable to create cache directory.');
			await unzip(fileUri, cpwd.uri, 'UTF-8');
			const dirs = [...cpwd.list()];
			const dicom_uris: Record<string, string[]> = {};
			/* Check ang mga directories for DICOM files */
			for (const i of dirs) {
				if (i instanceof EFS.Directory) {
					let has_dicom = false;
					let iuri = i.info().uri;
					if (!iuri) {
						i.delete();
						continue;
					} else {
						iuri = iuri.substring(0, iuri.length - 1);
					}
					const iname = iuri.substring(iuri.lastIndexOf('/') + 1);
					const il = [...i.list()];
					for (const j of il) {
						const juri = j.info().uri;
						if (!(j instanceof EFS.File) || !juri) {
							j.delete();
							continue;
						}
						const jext = juri.substring(juri.lastIndexOf('.') + 1);
						const is_dicom = jext.toLowerCase() === 'dcm';
						has_dicom = has_dicom || is_dicom;
						if (!is_dicom) {
							j.delete();
							continue;
						} else {
							const jname = juri.substring(juri.lastIndexOf('/') + 1);
							if (!dicom_uris[iname])
								dicom_uris[iname] = [];
							dicom_uris[iname].push(jname);
						}
					}
					if (!has_dicom)
						i.delete();
					else
						dicom_uris[iname].sort((a, b) => a.localeCompare(b));
				}
			}
			/* Walang nahanap na DICOM sa mga directories
			 * Last check kung sa root merong mga DICOM files */
			if (Object.keys(dicom_uris).length < 1) {
				let has_root_dicom = false;
				for (const i of dirs) {
					if (i instanceof EFS.File) {
						const uri = i.info().uri;
						if (!uri) {
							i.delete();
							continue;
						}
						const ext = uri.substring(uri.lastIndexOf('.') + 1);
						const is_dicom = ext.toLowerCase() === 'dcm';
						has_root_dicom = has_root_dicom || is_dicom;
						if (is_dicom) {
							const name = uri.substring(uri.lastIndexOf('/') + 1);
							if (!dicom_uris['/'])
								dicom_uris['/'] = [];
							dicom_uris['/'].push(name);
						} else {
							i.delete();
							continue;
						}
					}
				}
				if (!has_root_dicom)
					throw new Error('Invalid DICOM ZIP file.');
				else
					dicom_uris['/'].sort((a, b) => a.localeCompare(b));
			}
			const zip = {
				source: fileUri,
				cache: cpwd.uri,
				created: cpwd.info().creationTime,
				folders: { ...dicom_uris },
			};
			setError(false);
			setTarget(fileUri);
			setDICOMContent(null);
			setZIPContent(zip);
			setStatusText('Upload success.');
			setIsDICOMContentModalVisible(true);
		} catch (error: any) {
			console.error('An error has been encountered during ZIP reading.');
			console.error(error.message);
			setError(true);
			setStatusText(error.message);
			setIsLoading(false);
		}
	}
	const UploadInvalid = () => {
		setError(true);
		setStatusText('Invalid DICOM file.');
	};
	const UploadCancelled = () => {
		setError(true);
		setStatusText('Upload cancelled.');
	};
	const UploadButton = () => {
		return !isLoading ? (
			<View className="mr-6 items-center">
				<StatusText />
				<UploadDCMButton
					ButtonClass="w-[100px] h-[40px] bg-[#eb8817] justify-center items-center rounded-lg"
					TextClass="text-xl text-white font-light"
					ButtonText="Upload"
					UploadSuccess={UploadSuccess}
					UploadSuccessZIP={UploadSuccessZIP}
					UploadInvalid={UploadInvalid}
					UploadCancelled={UploadCancelled}
				/>
			</View>
		) : (
			<View className="mr-6 flex-col items-center">
				<ActivityIndicator color="orange" size={40} />
				<Text className="text-xl font-light">Please wait...</Text>
			</View>
		);
	};
	return (
		<View className="m-4 h-full flex-1 justify-center">
			<View className="ml-2 mr-2 mb-5 items-center justify-center">
				<Text className="text-2xl font-bold">Welcome to DICOM Viewer.</Text>
				<Text className="text-xl font-light text-center">Upload a DICOM file or a ZIP file to
					read by clicking the Upload button below.</Text>
			</View>
			<UploadButton />
			<DICOMContentModal Content={DICOMContent} ZIPContent={ZIPContent} TargetFile={target}
				Visibility={isDICOMContentModalVisible} ModalClosed={DICOMContentModalClosed}
				ModalShown={DICOMContentModalShown}/>
		</View>
	);
}
