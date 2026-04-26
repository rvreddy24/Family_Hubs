package `in`.familyhubs.provider.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBox
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import `in`.familyhubs.provider.BuildConfig
import `in`.familyhubs.provider.ProviderViewModel
import `in`.familyhubs.provider.data.JOB_STEPS
import `in`.familyhubs.provider.data.TaskRow
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private sealed class Route(val id: String) {
    data object Home : Route("home")
    data object Active : Route("active")
    data object Earnings : Route("earnings")
    data object History : Route("history")
    data object Profile : Route("profile")
}

@Composable
fun ConnectionSettingsCard(vm: ProviderViewModel) {
    val err = vm.signInError.value
    val want = vm.userWantsLive.value
    val st = vm.connection.value
    if (want && st != "connected") {
        Card(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7ED))
        ) {
            Text(
                "Offline: live updates paused (status: $st). Use Connect live, or return to the app to auto-retry if you were connected before.",
                Modifier.padding(10.dp), fontSize = 12.sp, color = Color(0xFF9A3412)
            )
        }
    }
    Card(Modifier.fillMaxWidth().padding(8.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Hub & socket", fontWeight = FontWeight.Black, fontSize = 12.sp)
            Text("Server: ${BuildConfig.SOCKET_URL}", fontSize = 10.sp, color = Color.Gray)
            OutlinedTextField(
                value = vm.hubId.value,
                onValueChange = { vm.hubId.value = it },
                label = { Text("Hub id (match family/admin)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = vm.manualUserId.value,
                onValueChange = { vm.manualUserId.value = it },
                label = { Text("Provider user id (e.g. provider) if not using Supabase") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = vm.email.value,
                onValueChange = { vm.email.value = it },
                label = { Text("Supabase email") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = vm.password.value,
                onValueChange = { vm.password.value = it },
                label = { Text("Supabase password") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { vm.signIn() }) { Text("Sign in") }
                OutlinedButton(onClick = { vm.signOut() }) { Text("Sign out") }
            }
            if (err != null) Text(err, color = Color(0xFFDC2626), fontSize = 11.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { vm.connectSocket() }, modifier = Modifier.weight(1f)) { Text("Connect live") }
                OutlinedButton(onClick = { vm.disconnectSocket() }, modifier = Modifier.weight(1f)) { Text("Stop") }
            }
            Text("Status: ${vm.connection.value} — ${vm.lastEvent.value}", fontSize = 9.sp, color = Color.Gray)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProviderAppShell(viewModel: ProviderViewModel) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val current = backStack?.destination?.route ?: Route.Home.id

    val items = listOf(
        Triple(Route.Home, "Dashboard", Icons.Default.Home),
        Triple(Route.Active, "Active", Icons.Default.Work),
        Triple(Route.Earnings, "Earnings", Icons.Default.AttachMoney),
        Triple(Route.History, "History", Icons.Default.History),
        Triple(Route.Profile, "Profile", Icons.Default.AccountBox),
    )

    val tasks by viewModel.tasks.collectAsState()

    fun providerId() = viewModel.effectiveProviderId()
    fun myTasks() = tasks.filter { it.providerId == providerId() }
    fun activeJob() = myTasks().find { it.status !in setOf("settled", "completed") }
    fun completed() = myTasks().filter { it.status == "settled" }
    val totalEarned = completed().sumOf { it.cost }
    val cal = Calendar.getInstance()
    val monthPrefix = "${cal.get(Calendar.YEAR)}-${String.format("%02d", cal.get(Calendar.MONTH) + 1)}"
    val thisMonth = completed().filter { j ->
        (j.completedAt?.take(7) ?: j.updatedAt.take(7)) == monthPrefix
    }
    val monthSum = thisMonth.sumOf { it.cost }
    val jobCountDisplay = maxOf(completed().size, 0)
    // rating placeholder — same as web when synthetic provider
    val rating = 0f

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("FieldOps — Provider", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
            )
        },
        bottomBar = {
            NavigationBar {
                items.forEach { (route, label, icon) ->
                    val sel = current == route.id
                    NavigationBarItem(
                        selected = sel,
                        onClick = { nav.navigate(route.id) { launchSingleTop = true } },
                        icon = { Icon(icon, null) },
                        label = { Text(label, maxLines = 1, fontSize = 10.sp) }
                    )
                }
            }
        }
    ) { pad ->
        NavHost(
            nav,
            startDestination = Route.Home.id,
            modifier = Modifier.padding(pad)
        ) {
            composable(Route.Home.id) {
                HomeScreen(
                    viewModel = viewModel,
                    myTasks = myTasks(),
                    activeJob = activeJob(),
                    totalEarnings = totalEarned,
                    jobTotalDisplay = jobCountDisplay,
                    rating = rating,
                    onOpenActive = { nav.navigate(Route.Active.id) }
                )
            }
            composable(Route.Active.id) {
                ActiveJobScreen(viewModel = viewModel, job = activeJob())
            }
            composable(Route.Earnings.id) {
                EarningsScreen(
                    total = totalEarned,
                    thisMonth = monthSum,
                    jobsDone = completed().size,
                    rows = completed()
                )
            }
            composable(Route.History.id) { HistoryScreen(completed()) }
            composable(Route.Profile.id) { ProfileScreen(viewModel) }
        }
    }
}

@Composable
fun HomeScreen(
    viewModel: ProviderViewModel,
    myTasks: List<TaskRow>,
    activeJob: TaskRow?,
    totalEarnings: Double,
    jobTotalDisplay: Int,
    rating: Float,
    onOpenActive: () -> Unit
) {
    val hub = viewModel.hubId.value
    Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
        Text(
            "Welcome, ${viewModel.displayName.value.split(" ").firstOrNull() ?: "—"}",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Black
        )
        Text(
            "$hub — ${SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(Date())}",
            color = Color.Gray,
            fontSize = 12.sp
        )
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatBox(Modifier.weight(1f), jobTotalDisplay.toString(), "Total jobs")
            StatBox(Modifier.weight(1f), String.format("%.1f", rating), "Rating")
            StatBox(Modifier.weight(1f), "$${String.format("%.0f", totalEarnings)}", "Earned")
        }
        Spacer(Modifier.height(16.dp))
        if (activeJob != null) {
            ElevatedCard(Modifier.fillMaxWidth(), colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF059669))) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("ACTIVE", color = Color(0xE6FFFFFF), fontSize = 10.sp, fontWeight = FontWeight.Black)
                    Text(activeJob.title, color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text(activeJob.description, color = Color(0xD9FFFFFF), fontSize = 12.sp)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(activeJob.status.replace('_', ' ').uppercase(), color = Color.White, fontSize = 10.sp)
                        Text("$${activeJob.cost}", color = Color.White, fontWeight = FontWeight.Black)
                    }
                    Button(onClick = onOpenActive, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Color.White)) {
                        Text("Open workflow", color = Color(0xFF047857), fontWeight = FontWeight.Black)
                    }
                }
            }
        } else {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No active jobs", color = Color.Gray, fontWeight = FontWeight.Bold)
                    Text("Waiting for the hub admin to assign a task.", color = Color.Gray, fontSize = 12.sp, textAlign = TextAlign.Center)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("RECENT EARNINGS", color = Color.Gray, fontSize = 10.sp, fontWeight = FontWeight.Black)
        val recent = myTasks.filter { it.status == "settled" }.takeLast(3)
        if (recent.isEmpty()) {
            Text("No settled payouts yet.", color = Color.Gray, fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp))
        } else {
            recent.reversed().forEach { t ->
                Row(
                    Modifier.fillMaxWidth().padding(vertical = 6.dp).background(Color(0xFFFAFAFA), MaterialTheme.shapes.medium).padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column { Text(t.title, fontWeight = FontWeight.Bold); Text(t.updatedAt.take(10), fontSize = 10.sp, color = Color.Gray) }
                    Text("+$${t.cost}", color = Color(0xFF059669), fontWeight = FontWeight.Black)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text("Connection: ${viewModel.connection.value}", fontSize = 10.sp, color = Color.Gray)
        Text(viewModel.lastEvent.value, fontSize = 10.sp, color = Color.Gray)
    }
}

@Composable
fun StatBox(mod: Modifier, value: String, label: String) {
    Card(mod) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontWeight = FontWeight.Black, fontSize = 22.sp, color = Color(0xFF059669))
            Text(label, fontSize = 9.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ActiveJobScreen(viewModel: ProviderViewModel, job: TaskRow?) {
    if (job == null) {
        BoxCentered("No active assignment")
        return
    }
    var fullCode by remember { mutableStateOf("") }
    val stepIdx = remember(job.status) { JOB_STEPS.indexOf(job.status).coerceIn(0, JOB_STEPS.lastIndex) }
    Column(Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
        Text("Active job workflow", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            for (i in 0 until JOB_STEPS.size - 1) {
                Box(
                    Modifier
                        .weight(1f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (i <= stepIdx) Color(0xFF10B981) else Color(0xFFE5E7EB))
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text(job.title, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text("${job.category} • #${job.id}", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Spacer(Modifier)
                    Text("$${job.cost}", color = Color(0xFF059669), fontWeight = FontWeight.Black, fontSize = 20.sp)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFF0FDF4))) {
            Text(
                "Family member details: use task notes and safety flow until a care profile is linked in the hub (same as web).",
                Modifier.padding(12.dp), fontSize = 13.sp, color = Color.DarkGray
            )
        }
        Spacer(Modifier.height(8.dp))
        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB))) {
            Column(Modifier.padding(12.dp)) {
                Text("INSTRUCTIONS", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF92400E))
                Text("\"${job.instructions}\"", fontSize = 13.sp, color = Color(0xFF78350F), fontStyle = FontStyle.Italic)
            }
        }
        Spacer(Modifier.height(16.dp))
        when (job.status) {
            "arrived" -> {
                Text("Enter 4-digit safety code", fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                OutlinedTextField(
                    value = fullCode,
                    onValueChange = { if (it.length <= 4) fullCode = it.filter { c -> c.isDigit() } },
                    label = { Text("4-digit code") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = { if (fullCode.length == 4) viewModel.advanceAfterCode(job.id) },
                    enabled = fullCode.length == 4,
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Verify safety handshake") }
            }
            "completed", "settled" -> {
                Text("Task completed. Waiting for the family to release payment.", textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }
            else -> {
                Button(
                    onClick = { viewModel.advanceTask(job.id) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                ) {
                    Text(viewModel.stepLabel(job.status), fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
fun EarningsScreen(total: Double, thisMonth: Double, jobsDone: Int, rows: List<TaskRow>) {
    Column(Modifier.padding(16.dp)) {
        Text("Earnings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(8.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF059669))) {
            Column(Modifier.padding(20.dp)) {
                Text("TOTAL EARNED", color = Color(0x99FFFFFF), fontSize = 10.sp, fontWeight = FontWeight.Black)
                Text("$${String.format("%.0f", total)}.00", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Column(Modifier.background(Color(0x33FFFFFF), MaterialTheme.shapes.medium).padding(12.dp).weight(1f)) {
                        Text("THIS MONTH", color = Color(0x80FFFFFF), fontSize = 9.sp)
                        Text("$${String.format("%.0f", thisMonth)}", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.padding(4.dp))
                    Column(Modifier.background(Color(0x33FFFFFF), MaterialTheme.shapes.medium).padding(12.dp).weight(1f)) {
                        Text("JOBS DONE", color = Color(0x80FFFFFF), fontSize = 9.sp)
                        Text("$jobsDone", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("TRANSACTIONS", color = Color.Gray, fontSize = 9.sp, fontWeight = FontWeight.Black)
        if (rows.isEmpty()) {
            Text("No transactions yet.", color = Color.Gray, modifier = Modifier.padding(16.dp))
        } else {
            rows.forEach { t ->
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column { Text(t.title, fontWeight = FontWeight.Bold); Text(t.updatedAt.take(10) + " • paid", fontSize = 9.sp, color = Color.Gray) }
                    Text("+$${t.cost}", color = Color(0xFF059669), fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
fun HistoryScreen(completed: List<TaskRow>) {
    Column(Modifier.padding(16.dp)) {
        Text("Job history", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        if (completed.isEmpty()) {
            Text("No completed jobs yet", color = Color.Gray, modifier = Modifier.padding(32.dp), textAlign = TextAlign.Center)
        } else {
            completed.forEach { t ->
                Card(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(t.title, fontWeight = FontWeight.Bold)
                            Text("${t.category} — $${t.cost}", fontSize = 9.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                        }
                        Text("SETTLED", color = Color(0xFF047857), fontSize = 8.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(vm: ProviderViewModel) {
    Column(Modifier.padding(16.dp)) {
        Text("My profile", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(12.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(vm.displayName.value, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text(vm.email.value.ifBlank { "—" }, color = Color.Gray, fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Column(Modifier.weight(1f)) { Text("Skills", fontSize = 9.sp, color = Color.Gray, fontWeight = FontWeight.Bold); Text("—", fontWeight = FontWeight.Bold) }
            Column(Modifier.weight(1f)) { Text("Phone", fontSize = 9.sp, color = Color.Gray, fontWeight = FontWeight.Bold); Text("—", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
fun BoxCentered(msg: String) {
    Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(msg, color = Color.Gray, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
    }
}
