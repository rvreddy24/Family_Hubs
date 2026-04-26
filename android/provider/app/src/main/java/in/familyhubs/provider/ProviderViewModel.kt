package `in`.familyhubs.provider

import android.app.Application
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.viewModelScope
import `in`.familyhubs.provider.data.JOB_STEPS
import `in`.familyhubs.provider.data.TaskRow
import `in`.familyhubs.provider.data.nextStatus
import `in`.familyhubs.provider.network.SupabaseAuthClient
import `in`.familyhubs.provider.network.SupabaseSession
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

class ProviderViewModel(app: Application) : AndroidViewModel(app) {
    val connection = mutableStateOf("disconnected")
    val lastEvent = mutableStateOf("—")
    val signInError = mutableStateOf<String?>(null)
    /** User chose Connect live and did not tap Stop; used for offline banner + resume. */
    val userWantsLive = mutableStateOf(false)

    private val _tasks = MutableStateFlow<List<TaskRow>>(emptyList())
    val tasks: StateFlow<List<TaskRow>> = _tasks

    var userId = mutableStateOf("")
    var displayName = mutableStateOf("Service provider")
    var email = mutableStateOf("")
    var password = mutableStateOf("")
    var manualUserId = mutableStateOf("provider")
    var hubId = mutableStateOf(BuildConfig.DEFAULT_HUB_ID)

    var accessToken: String? = null
    private var socket: Socket? = null
    private var appLifecycle: Lifecycle? = null

    private val auth: SupabaseAuthClient by lazy {
        SupabaseAuthClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY)
    }

    private val foregroundObserver = LifecycleEventObserver { _: LifecycleOwner, e: Lifecycle.Event ->
        if (e == Lifecycle.Event.ON_START && userWantsLive.value && connection.value != "connected") {
            lastEvent.value = "App foreground: reconnecting…"
            connectSocket()
        }
    }

    init {
        val pl = ProcessLifecycleOwner.get()
        pl.lifecycle.addObserver(foregroundObserver)
        appLifecycle = pl.lifecycle
    }

    fun effectiveProviderId(): String = userId.value.ifBlank { manualUserId.value }

    fun myTasksList(): List<TaskRow> =
        _tasks.value.filter { it.providerId == effectiveProviderId() }

    fun activeJob(): TaskRow? =
        myTasksList().find { it.status !in setOf("settled", "completed") }

    fun completedJobs(): List<TaskRow> =
        myTasksList().filter { it.status == "settled" }

    fun signIn() {
        if (!auth.isConfigured()) {
            signInError.value = "Set supabaseUrl and supabaseAnonKey in local.properties (see README)"
            return
        }
        signInError.value = null
        viewModelScope.launch(Dispatchers.IO) {
            auth.signInWithPassword(email.value, password.value).fold(
                onSuccess = { s -> applySession(s) },
                onFailure = { e -> signInError.value = e.message ?: e.toString() }
            )
        }
    }

    fun signOut() {
        accessToken = null
        userId.value = ""
        displayName.value = "Service provider"
        userWantsLive.value = false
        signInError.value = null
        disconnectSocket()
    }

    private fun applySession(s: SupabaseSession) {
        accessToken = s.accessToken
        userId.value = s.userId
        s.email?.let { email.value = it }
        displayName.value = s.email?.substringBefore("@")?.replaceFirstChar { c -> c.titlecase() }
            ?: "Provider"
        viewModelScope.launch(Dispatchers.Main) {
            signInError.value = null
        }
        if (connection.value == "connected") {
            disconnectSocket()
        }
        userWantsLive.value = true
        connectSocket()
    }

    private fun joinRoom(s: Socket) {
        s.emit("join:room", JSONObject().put("role", "provider").put("hubId", hubId.value))
    }

    fun connectSocket() {
        userWantsLive.value = true
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                disconnectSocketInternal()
                val options = IO.Options()
                options.reconnection = true
                options.reconnectionAttempts = 12
                options.reconnectionDelay = 1500
                options.path = "/socket.io/"
                options.transports = arrayOf("websocket", "polling")
                applyAuthMap(options, accessToken)
                val s = IO.socket(URI.create(BuildConfig.SOCKET_URL), options)
                s.on(Socket.EVENT_CONNECT) {
                    // Also runs after an automatic client reconnect; server sends state:sync on join:room
                    main {
                        connection.value = "connected"
                    }
                    joinRoom(s)
                }
                s.on("state:sync") { args: Array<out Any> ->
                    val raw = args.firstOrNull() ?: return@on
                    if (raw is JSONObject) {
                        val arr = raw.optJSONArray("tasks") ?: JSONArray()
                        main { replaceTasksFromServer(arr) }
                    }
                }
                s.on("task:updated") { args: Array<out Any> ->
                    val o = args.firstOrNull() as? JSONObject ?: return@on
                    val id = o.optString("taskId", "")
                    if (id.isEmpty()) return@on
                    val st = o.optString("status", "")
                    val ts = o.optString("timestamp", "")
                    main {
                        patchTask(id) { t ->
                            t.copy(status = st, updatedAt = if (ts.isNotBlank()) ts else t.updatedAt)
                        }
                        lastEvent.value = "task:updated $id → $st"
                    }
                }
                s.on("task:created") { args: Array<out Any> ->
                    val o = args.firstOrNull() as? JSONObject ?: return@on
                    val row = TaskRow.fromJson(o) ?: return@on
                    main {
                        upsertTask(row)
                        lastEvent.value = "task:created ${row.id}"
                    }
                }
                s.on("sos:broadcast") { args: Array<out Any> ->
                    val o = args.firstOrNull() as? JSONObject ?: return@on
                    main { lastEvent.value = "SOS: ${o.optString("parentName", "")}" }
                }
                s.on("sos:acknowledged") { _ ->
                    main { lastEvent.value = "SOS acknowledged" }
                }
                s.on(Socket.EVENT_DISCONNECT) {
                    main { connection.value = "disconnected" }
                }
                s.on(Socket.EVENT_CONNECT_ERROR) { args: Array<out Any> ->
                    val msg = args.firstOrNull()?.toString() ?: "error"
                    main {
                        connection.value = "error"
                        lastEvent.value = "connect_error: $msg"
                    }
                }
                s.connect()
                socket = s
            }.onFailure { e ->
                main {
                    connection.value = "failed"
                    lastEvent.value = e.message ?: e.toString()
                }
            }
        }
    }

    private fun main(block: () -> Unit) {
        viewModelScope.launch(Dispatchers.Main) { block() }
    }

    fun disconnectSocket() {
        userWantsLive.value = false
        disconnectSocketInternal()
    }

    private fun disconnectSocketInternal() {
        runCatching { socket?.disconnect() }
        socket = null
        main { connection.value = "disconnected" }
    }

    fun advanceTask(taskId: String) {
        val t = myTasksList().find { it.id == taskId } ?: return
        val n = nextStatus(t.status) ?: return
        emitTaskUpdate(taskId, n)
    }

    fun emitTaskUpdate(taskId: String, newStatus: String) {
        val s = socket
        if (s == null || connection.value != "connected") {
            lastEvent.value = "Cannot update: not connected to live hub"
            return
        }
        val o = JSONObject()
        o.put("taskId", taskId)
        o.put("status", newStatus)
        o.put("updatedBy", displayName.value.ifBlank { "Provider" })
        o.put("hubId", hubId.value)
        s.emit("task:update", o)
        patchTask(taskId) { it.copy(status = newStatus) }
    }

    fun advanceAfterCode(taskId: String) {
        advanceTask(taskId)
    }

    /**
     * [state:sync] is authoritative: replace the in-memory list (aligns with web + server).
     */
    private fun replaceTasksFromServer(arr: JSONArray) {
        val list = ArrayList<TaskRow>(arr.length())
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            TaskRow.fromJson(o)?.let { list.add(it) }
        }
        _tasks.value = list
        lastEvent.value = "state:sync — ${list.size} tasks"
    }

    private fun patchTask(id: String, f: (TaskRow) -> TaskRow) {
        _tasks.value = _tasks.value.map { if (it.id == id) f(it) else it }
    }

    private fun upsertTask(row: TaskRow) {
        val i = _tasks.value.indexOfFirst { it.id == row.id }
        if (i < 0) _tasks.value = _tasks.value + row
        else {
            val m = _tasks.value.toMutableList()
            m[i] = row
            _tasks.value = m
        }
    }

    private fun applyAuthMap(options: IO.Options, token: String?) {
        if (token.isNullOrBlank()) return
        runCatching {
            val m = options.javaClass.methods.firstOrNull { it.name == "setAuth" && it.parameterTypes.size == 1 }
            m?.invoke(options, mapOf("token" to (token as Any)))
        }
    }

    fun stepIndex(status: String): Int = JOB_STEPS.indexOf(status).coerceAtLeast(0)

    fun stepLabel(status: String): String = when (status) {
        "assigned" -> "Accept & start commute"
        "en_route" -> "Confirm arrival"
        "arrived" -> "Enter safety code"
        "checked_in" -> "Take selfie & begin"
        "in_progress" -> "Upload completion photo"
        "completed" -> "Awaiting settlement"
        else -> status.replace('_', ' ')
    }

    override fun onCleared() {
        appLifecycle?.removeObserver(foregroundObserver)
        userWantsLive.value = false
        disconnectSocketInternal()
        super.onCleared()
    }
}
