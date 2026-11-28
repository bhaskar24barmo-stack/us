package com.onlyus.app.keyboard

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface CoupleGifDao {
    @Query("SELECT * FROM couple_gifs ORDER BY usageCount DESC, createdAt DESC")
    suspend fun getAllGifs(): List<CoupleGifEntity>

    @Query("SELECT * FROM couple_gifs WHERE category = :category ORDER BY usageCount DESC")
    suspend fun getGifsByCategory(category: String): List<CoupleGifEntity>

    @Query("SELECT * FROM couple_gifs WHERE isFavorite = 1 ORDER BY usageCount DESC")
    suspend fun getFavoriteGifs(): List<CoupleGifEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGifs(gifs: List<CoupleGifEntity>)

    @Query("UPDATE couple_gifs SET usageCount = usageCount + 1 WHERE id = :id")
    suspend fun incrementUsage(id: String)
}
