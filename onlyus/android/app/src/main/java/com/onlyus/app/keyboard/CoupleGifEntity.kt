package com.onlyus.app.keyboard

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "couple_gifs")
data class CoupleGifEntity(
    @PrimaryKey val id: String,
    val title: String,
    val category: String, // "love", "kiss", "hug", "cute", "miss_you"
    val assetPath: String,
    val remoteUrl: String? = null,
    val width: Int = 320,
    val height: Int = 240,
    val usageCount: Int = 0,
    val isFavorite: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
