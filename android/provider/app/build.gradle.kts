import java.util.Properties

plugins {
    id("com.android.application") version "8.7.2"
    id("org.jetbrains.kotlin.android") version "1.9.25"
}

val localProps = Properties()
rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use { localProps.load(it) }
val socketUrl: String = localProps.getProperty("socketUrl", "http://10.0.2.2:3001")
val defaultHub: String = localProps.getProperty("defaultHubId", "hub_mgl")
val supabaseUrl: String = localProps.getProperty("supabaseUrl", "")
val supabaseAnon: String = localProps.getProperty("supabaseAnonKey", "")

android {
    namespace = "in.familyhubs.provider"
    compileSdk = 35

    defaultConfig {
        applicationId = "in.familyhubs.provider"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SOCKET_URL", "\"${socketUrl.replace("\"", "")}\"")
        buildConfigField("String", "DEFAULT_HUB_ID", "\"${defaultHub.replace("\"", "")}\"")
        buildConfigField("String", "SUPABASE_URL", "\"${supabaseUrl.replace("\"", "")}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${supabaseAnon.replace("\"", "")}\"")
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-process:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("io.socket:socket.io-client:2.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("io.ktor:ktor-client-android:2.3.12")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation("androidx.compose.material:material-icons-extended:1.7.5")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
