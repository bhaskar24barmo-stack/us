package com.onlyus.app.keyboard

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [CoupleGifEntity::class], version = 1, exportSchema = false)
abstract class KeyboardDatabase : RoomDatabase() {
    abstract fun gifDao(): CoupleGifDao

    companion object {
        @Volatile
        private var INSTANCE: KeyboardDatabase? = null

        fun getDatabase(context: Context): KeyboardDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KeyboardDatabase::class.java,
                    "couple_keyboard_db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
