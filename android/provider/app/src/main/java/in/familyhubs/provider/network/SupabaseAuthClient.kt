package `in`.familyhubs.provider.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import org.json.JSONObject

data class SupabaseSession(
    val accessToken: String,
    val userId: String,
    val email: String?
)

/**
 * Password sign-in against Supabase Auth REST (same as [AuthContext] in the web app).
 */
class SupabaseAuthClient(
    private val supabaseUrl: String,
    private val anonKey: String
) {
    private val client = HttpClient(Android) { expectSuccess = false }

    suspend fun signInWithPassword(email: String, password: String): Result<SupabaseSession> = runCatching {
        val base = supabaseUrl.trimEnd('/')
        val url = "$base/auth/v1/token?grant_type=password"
        val body = JSONObject().put("email", email).put("password", password).toString()
        val response = client.post(url) {
            contentType(ContentType.Application.Json)
            header("apikey", anonKey)
            header("Authorization", "Bearer $anonKey")
            setBody(body)
        }
        val text = response.bodyAsText()
        if (response.status.value >= 400) {
            val o = runCatching { JSONObject(text) }.getOrNull()
            val msg = o?.optString("error_description")?.takeIf { it.isNotBlank() }
                ?: o?.optString("message")?.takeIf { it.isNotBlank() }
                ?: text
            error(msg)
        }
        val o = JSONObject(text)
        if (o.has("access_token") && o.has("user")) {
            val u = o.getJSONObject("user")
            val email = if (u.has("email")) u.getString("email") else null
            SupabaseSession(
                accessToken = o.getString("access_token"),
                userId = u.getString("id"),
                email = email
            )
        } else {
            val msg = o.optString("error_description", o.optString("msg", text))
            error(msg.ifBlank { "Sign-in failed" })
        }
    }

    fun isConfigured(): Boolean = supabaseUrl.isNotBlank() && anonKey.isNotBlank()
}
