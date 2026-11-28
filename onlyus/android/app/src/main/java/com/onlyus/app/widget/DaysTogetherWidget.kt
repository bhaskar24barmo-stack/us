package com.onlyus.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.onlyus.app.MainActivity
import com.onlyus.app.R
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.TimeUnit

class DaysTogetherWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val views = RemoteViews(context.packageName, R.layout.widget_days_together)
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            val prefs = context.getSharedPreferences("onlyus_widget_prefs", Context.MODE_PRIVATE)
            val anniversaryStr = prefs.getString("anniversary_date", "2024-01-14") ?: "2024-01-14"
            val partnerName = prefs.getString("partner_name", "Purvika") ?: "Purvika"
            val partnerMood = prefs.getString("partner_mood", "In Love 💖") ?: "In Love 💖"

            var daysTogether = 520L
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val anniversaryDate = sdf.parse(anniversaryStr)
                if (anniversaryDate != null) {
                    val diffMs = System.currentTimeMillis() - anniversaryDate.time
                    daysTogether = TimeUnit.MILLISECONDS.toDays(diffMs).coerceAtLeast(1)
                }
            } catch (ignored: Exception) {}

            views.setTextViewText(R.id.widget_days_count, daysTogether.toString())
            views.setTextViewText(R.id.widget_partner_status, "$partnerName • $partnerMood")

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
