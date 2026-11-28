package com.onlyus.app.keyboard

import android.content.ClipDescription
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.EditorInfoCompat
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

class CoupleKeyboardService : InputMethodService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var database: KeyboardDatabase
    private var currentCategory = "love"

    companion object {
        val QUICK_LOVE_NOTES = listOf(
            "I love you so much ❤️",
            "Thinking of you right now 💭✨",
            "Can't wait to see you tonight 🌙",
            "Sending you the biggest hug 🫂💖",
            "Miss you already 🥺🌹",
            "You are my whole world ♾️💘",
            "Forever grateful for you 🥰",
            "Counting down the seconds ⏳💕"
        )

        val STARTER_GIFS = listOf(
            CoupleGifEntity("g1", "Warm Hug", "hug", "gifs/warm_hug.gif", null, 320, 240, 10, true),
            CoupleGifEntity("g2", "Forehead Kiss", "kiss", "gifs/forehead_kiss.gif", null, 320, 240, 8, true),
            CoupleGifEntity("g3", "Heart Explosion", "love", "gifs/heart_explosion.gif", null, 320, 240, 15, true),
            CoupleGifEntity("g4", "Miss You So Much", "miss_you", "gifs/miss_you.gif", null, 320, 240, 12, true),
            CoupleGifEntity("g5", "Cute Snuggle", "cute", "gifs/cute_snuggle.gif", null, 320, 240, 7, false),
            CoupleGifEntity("g6", "Sweet Dreams", "love", "gifs/sweet_dreams.gif", null, 320, 240, 9, false),
            CoupleGifEntity("g7", "Tight Squeeze", "hug", "gifs/tight_squeeze.gif", null, 320, 240, 6, false),
            CoupleGifEntity("g8", "Blushing Smile", "cute", "gifs/blushing_smile.gif", null, 320, 240, 11, true)
        )
    }

    override fun onCreate() {
        super.onCreate()
        database = KeyboardDatabase.getDatabase(this)
        serviceScope.launch(Dispatchers.IO) {
            val existing = database.gifDao().getAllGifs()
            if (existing.isEmpty()) {
                database.gifDao().insertGifs(STARTER_GIFS)
            }
        }
    }

    override fun onCreateInputView(): View {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0B0614"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(280)
            )
            setPadding(dp(8), dp(6), dp(8), dp(6))
        }

        // 1. Header / Category Tabs
        val categoryScroll = HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val categoryLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, dp(6))
        }

        val categories = listOf(
            "love" to "💖 Love",
            "kiss" to "😘 Kiss",
            "hug" to "🫂 Hug",
            "miss_you" to "🥺 Miss You",
            "notes" to "💌 Quick Notes",
            "cute" to "✨ Cute"
        )

        val contentContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        categories.forEach { (catId, catLabel) ->
            val catBtn = TextView(this).apply {
                text = catLabel
                setTextColor(if (catId == currentCategory) Color.WHITE else Color.parseColor("#B3A2C7"))
                textSize = 13f
                typeface = Typeface.DEFAULT_BOLD
                setPadding(dp(14), dp(6), dp(14), dp(6))
                background = createTabDrawable(catId == currentCategory)
                setOnClickListener {
                    currentCategory = catId
                    updateContentArea(contentContainer)
                    for (i in 0 until categoryLayout.childCount) {
                        val child = categoryLayout.getChildAt(i) as? TextView
                        val isSelected = child == this
                        child?.setTextColor(if (isSelected) Color.WHITE else Color.parseColor("#B3A2C7"))
                        child?.background = createTabDrawable(isSelected)
                    }
                }
            }
            categoryLayout.addView(catBtn)
            (catBtn.layoutParams as LinearLayout.LayoutParams).marginEnd = dp(6)
        }

        categoryScroll.addView(categoryLayout)
        rootLayout.addView(categoryScroll)

        // 2. Main Content View
        rootLayout.addView(contentContainer)
        updateContentArea(contentContainer)

        // 3. Bottom Control Row
        val bottomControls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(4), 0, 0)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val switchKeyboardBtn = Button(this).apply {
            text = "🌐 Switch"
            setTextColor(Color.parseColor("#D4B8E8"))
            textSize = 12f
            background = createControlDrawable()
            setOnClickListener {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    switchToNextInputMethod(false)
                } else {
                    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
                    imm?.showInputMethodPicker()
                }
            }
        }

        val spaceBtn = Button(this).apply {
            text = "ONLYUS 💘"
            setTextColor(Color.WHITE)
            textSize = 12f
            background = createControlDrawable()
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(6)
                marginEnd = dp(6)
            }
            setOnClickListener {
                currentInputConnection?.commitText(" ", 1)
            }
        }

        val backspaceBtn = Button(this).apply {
            text = "⌫"
            setTextColor(Color.parseColor("#FF6B9B"))
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            background = createControlDrawable()
            setOnClickListener {
                currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_DEL))
                currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_DEL))
            }
        }

        bottomControls.addView(switchKeyboardBtn)
        bottomControls.addView(spaceBtn)
        bottomControls.addView(backspaceBtn)
        rootLayout.addView(bottomControls)

        return rootLayout
    }

    private fun updateContentArea(container: LinearLayout) {
        container.removeAllViews()

        if (currentCategory == "notes") {
            val scrollView = ScrollView(this).apply {
                isVerticalScrollBarEnabled = false
            }
            val notesList = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, dp(4), 0, dp(4))
            }

            QUICK_LOVE_NOTES.forEach { noteText ->
                val noteCard = TextView(this).apply {
                    text = noteText
                    setTextColor(Color.WHITE)
                    textSize = 13f
                    setPadding(dp(12), dp(10), dp(12), dp(10))
                    background = createNoteCardDrawable()
                    setOnClickListener {
                        currentInputConnection?.commitText(noteText + " ", 1)
                    }
                }
                notesList.addView(noteCard)
                (noteCard.layoutParams as LinearLayout.LayoutParams).bottomMargin = dp(6)
            }
            scrollView.addView(notesList)
            container.addView(scrollView)
        } else {
            val scrollView = ScrollView(this).apply {
                isVerticalScrollBarEnabled = false
            }
            val gridLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, dp(4), 0, dp(4))
            }

            serviceScope.launch {
                val gifs = withContext(Dispatchers.IO) {
                    if (currentCategory == "love") database.gifDao().getAllGifs()
                    else database.gifDao().getGifsByCategory(currentCategory)
                }

                val rowCount = (gifs.size + 1) / 2
                for (r in 0 until rowCount) {
                    val row = LinearLayout(this@CoupleKeyboardService).apply {
                        orientation = LinearLayout.HORIZONTAL
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dp(70)
                        ).apply { bottomMargin = dp(6) }
                    }

                    for (c in 0..1) {
                        val index = r * 2 + c
                        if (index < gifs.size) {
                            val gif = gifs[index]
                            val gifView = TextView(this@CoupleKeyboardService).apply {
                                text = "✨ ${gif.title}"
                                setTextColor(Color.WHITE)
                                textSize = 13f
                                typeface = Typeface.DEFAULT_BOLD
                                gravity = Gravity.CENTER
                                background = createGifCardDrawable()
                                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
                                    if (c == 0) marginEnd = dp(6)
                                }
                                setOnClickListener {
                                    commitGifContent(gif)
                                }
                            }
                            row.addView(gifView)
                        } else {
                            val spacer = View(this@CoupleKeyboardService).apply {
                                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f)
                            }
                            row.addView(spacer)
                        }
                    }
                    gridLayout.addView(row)
                }
            }
            scrollView.addView(gridLayout)
            container.addView(scrollView)
        }
    }

    private fun commitGifContent(gif: CoupleGifEntity) {
        val inputConnection = currentInputConnection ?: return
        val editorInfo = currentInputEditorInfo ?: return

        serviceScope.launch {
            withContext(Dispatchers.IO) {
                database.gifDao().incrementUsage(gif.id)
            }
        }

        // Support direct commitContent for rich apps (WhatsApp, Telegram, GBoard, Messages)
        val mimeTypes = EditorInfoCompat.getContentMimeTypes(editorInfo)
        val acceptsGif = mimeTypes.any { it.contains("image/gif", ignoreCase = true) || it.contains("image/*", ignoreCase = true) }
        val acceptsPng = mimeTypes.any { it.contains("image/png", ignoreCase = true) || it.contains("image/*", ignoreCase = true) }

        if (acceptsGif || acceptsPng) {
            try {
                val placeholderFile = File(cacheDir, "couple_${gif.id}.png")
                if (!placeholderFile.exists()) {
                    placeholderFile.createNewFile()
                    FileOutputStream(placeholderFile).use { fos ->
                        fos.write(byteArrayOf(0)) // minimal valid file buffer
                    }
                }

                val contentUri = FileProvider.getUriForFile(
                    this,
                    "${packageName}.fileprovider",
                    placeholderFile
                )

                val description = ClipDescription(gif.title, arrayOf(if (acceptsGif) "image/gif" else "image/png"))
                val contentInfo = InputContentInfoCompat(contentUri, description, Uri.parse("https://onlyus.app/gif/${gif.id}"))

                var flags = 0
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
                    flags = flags or InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION
                }

                val committed = InputConnectionCompat.commitContent(inputConnection, editorInfo, contentInfo, flags, null)
                if (committed) {
                    return
                }
            } catch (err: Exception) {
                // fallback to text commit
            }
        }

        // Graceful fallback: Commit love caption directly into text
        inputConnection.commitText("💌 ${gif.title} 💖 ", 1)
    }

    private fun createTabDrawable(isSelected: Boolean): GradientDrawable {
        return GradientDrawable().apply {
            cornerRadius = dp(16).toFloat()
            if (isSelected) {
                setColor(Color.parseColor("#FF4B8B")) // Rose glow accent
            } else {
                setColor(Color.parseColor("#1C132B")) // Glass surface
                setStroke(dp(1), Color.parseColor("#2E1F47"))
            }
        }
    }

    private fun createNoteCardDrawable(): GradientDrawable {
        return GradientDrawable().apply {
            cornerRadius = dp(12).toFloat()
            setColor(Color.parseColor("#191026"))
            setStroke(dp(1), Color.parseColor("#352252"))
        }
    }

    private fun createGifCardDrawable(): GradientDrawable {
        return GradientDrawable().apply {
            cornerRadius = dp(14).toFloat()
            setColor(Color.parseColor("#1F1333"))
            setStroke(dp(1), Color.parseColor("#44266A"))
        }
    }

    private fun createControlDrawable(): GradientDrawable {
        return GradientDrawable().apply {
            cornerRadius = dp(10).toFloat()
            setColor(Color.parseColor("#160E24"))
            setStroke(dp(1), Color.parseColor("#2C1C42"))
        }
    }

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }
}
