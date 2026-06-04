package com.vet4pet.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.vet4pet.app.data.local.SessionManager

class MainActivity : AppCompatActivity() {

    private val authDestinations   = setOf(R.id.loginFragment, R.id.registerFragment)
    private val noNavDestinations  = setOf(R.id.loginFragment, R.id.registerFragment, R.id.chatFragment)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        val bottomNavView = findViewById<BottomNavigationView>(R.id.bottom_nav_view)
        bottomNavView.setupWithNavController(navController)

        // If not logged in, send to login screen
        if (!SessionManager(this).isLoggedIn()) {
            navController.navigate(
                R.id.loginFragment,
                null,
                androidx.navigation.NavOptions.Builder()
                    .setPopUpTo(R.id.homeFragment, true)
                    .build()
            )
        }

        // Hide bottom nav on auth screens and chat screen
        navController.addOnDestinationChangedListener { _, destination, _ ->
            bottomNavView.visibility =
                if (destination.id in noNavDestinations) android.view.View.GONE
                else android.view.View.VISIBLE
        }
    }
}
