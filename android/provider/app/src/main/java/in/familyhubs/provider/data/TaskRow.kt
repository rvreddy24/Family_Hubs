package `in`.familyhubs.provider.data

import org.json.JSONObject

/**
 * Mirrors the web [ServiceTask] fields used in the provider app.
 */
data class TaskRow(
    val id: String,
    val childId: String,
    val parentId: String,
    val providerId: String?,
    val hubId: String?,
    val title: String,
    val description: String,
    val instructions: String,
    val status: String,
    val cost: Double,
    val category: String,
    val createdAt: String,
    val updatedAt: String,
    val completedAt: String?
) {
    companion object {
        fun fromJson(o: JSONObject): TaskRow? = runCatching {
            val evidence = o.optJSONObject("evidence")
            TaskRow(
                id = o.getString("id"),
                childId = o.optString("childId", ""),
                parentId = o.optString("parentId", ""),
                providerId = o.optString("providerId", "").takeIf { it.isNotBlank() },
                hubId = o.optString("hubId", "").takeIf { it.isNotBlank() },
                title = o.optString("title", "Task"),
                description = o.optString("description", ""),
                instructions = o.optString("instructions", ""),
                status = o.optString("status", "created"),
                cost = o.optDouble("cost", 0.0),
                category = o.optString("category", "essentials"),
                createdAt = o.optString("createdAt", ""),
                updatedAt = o.optString("updatedAt", ""),
                completedAt = evidence?.optString("completedAt")?.takeIf { it.isNotBlank() }
            )
        }.getOrNull()
    }
}

val JOB_STEPS = listOf(
    "assigned", "en_route", "arrived", "checked_in", "in_progress", "completed", "settled"
)

fun nextStatus(current: String): String? {
    val i = JOB_STEPS.indexOf(current)
    if (i < 0 || i >= JOB_STEPS.lastIndex) return null
    return JOB_STEPS[i + 1]
}
