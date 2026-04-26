package `in`.familyhubs.provider

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.familyhubs.provider.ui.ConnectionSettingsCard
import `in`.familyhubs.provider.ui.ProviderAppShell

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                val vm: ProviderViewModel = viewModel()
                Column(Modifier.fillMaxSize()) {
                    ConnectionSettingsCard(vm)
                    Box(Modifier.weight(1f)) {
                        ProviderAppShell(vm)
                    }
                }
            }
        }
    }
}
