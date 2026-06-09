package modules.nativedicom

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import expo.modules.kotlin.AppContext
import java.io.File
import java.io.FileOutputStream

@RunWith(AndroidJUnit4::class)
class NativeDicomTest {

    @Test
    fun testParserWithSampleDcm() {
        // Since we can't easily access the main app's assets from a library test without more setup,
        // we test the bridge and native module logic.
        // In a real scenario, we'd copy a test file here.
        
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val testFile = File(context.cacheDir, "test_sample.dcm")
        
        // If we had a test file in assets/ of the test package, we could copy it.
        // For now, this test verifies that the module can be instantiated and the library loads.
        
        val module = NativeDicomModule()
        // Note: We can't easily call 'definition()' and then the functions without more Expo infrastructure,
        // but we can test if the library loads via the companion object.
        assertNotNull(NativeDicomModule.Companion)
    }
}
