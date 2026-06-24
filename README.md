# Setup Guide for running the Expo Application + GDCM library

0.  Make A local copy of the repository on your computer

1.  Install dependencies using
```bash
npm install
```
2. In android studio, make sure there is a virtual device turned on

3.  Build and run using Android Studio with a running emulator using this command npx expo run:android
```bash
  npx expo run:android
```
4. If it is not working due to the SDK not being detected please make sure to check the android folder if there is a local.properties file. If not create a `local.properties` file and please add this manually:
```bash
# sdk.dir=C\:\\Users\\*INSERT PC USERNAME*\\AppData\\Local\\Android\\Sdk
sdk.dir=C\:\\Users\\juan\\AppData\\Local\\Android\\Sdk
```
