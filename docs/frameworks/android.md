---
id: android
title: Android Kotlin Authentication with Retrofit
description: >-
  Integrate awesome-node-auth in Android with Retrofit, EncryptedSharedPreferences for token storage and an OkHttp interceptor for auto-refresh.
sidebar_label: Android (Kotlin)
---

# Android Integration (Kotlin)

This guide integrates your awesome-node-auth backend in an Android app using **Retrofit** for HTTP, **EncryptedSharedPreferences** (via Jetpack Security) for safe token storage, and **OkHttp** interceptors for automatic token refresh.

## Dependencies

Add to `build.gradle.kts` (app module):

```kotlin
dependencies {
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Secure storage
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
}
```

## Step 1 — Secure Token Storage

`EncryptedSharedPreferences` encrypts both keys and values using AES-256-GCM backed by the Android Keystore.

```kotlin
// auth/TokenStorage.kt
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object TokenStorage {
    private const val FILE_NAME      = "auth_tokens"
    private const val KEY_ACCESS     = "access_token"
    private const val KEY_REFRESH    = "refresh_token"

    private fun prefs(context: Context) = EncryptedSharedPreferences.create(
        context,
        FILE_NAME,
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveTokens(context: Context, accessToken: String, refreshToken: String) {
        prefs(context).edit()
            .putString(KEY_ACCESS,  accessToken)
            .putString(KEY_REFRESH, refreshToken)
            .apply()
    }

    fun getAccessToken(context: Context): String?  = prefs(context).getString(KEY_ACCESS,  null)
    fun getRefreshToken(context: Context): String? = prefs(context).getString(KEY_REFRESH, null)

    fun clearTokens(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
```

## Step 2 — Retrofit API Interface

```kotlin
// auth/AuthApi.kt
import retrofit2.http.*

data class LoginRequest(val email: String, val password: String)
data class AuthTokens(val accessToken: String, val refreshToken: String)
data class RefreshRequest(val refreshToken: String)
data class RefreshResponse(val accessToken: String)

data class JwtUser(
    val sub:      String,
    val email:    String,
    val role:     String,
    val tenantId: String? = null,
)

interface AuthApi {
    @POST("/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthTokens

    @POST("/auth/logout")
    suspend fun logout()

    @POST("/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): RefreshResponse

    @GET("/auth/me")
    suspend fun me(): JwtUser
}
```

## Step 3 — OkHttp Auth Interceptor

:::info Bearer mode required
Android is a native client and cannot use browser cookies. The `X-Auth-Strategy: bearer` header must be sent on all token-issuing requests (`/auth/login`, `/auth/refresh`, etc.) so the server returns tokens in the JSON body.
:::

The interceptor attaches the ****** and retries once on 401:

```kotlin
// auth/AuthInterceptor.kt
import android.content.Context
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class AuthInterceptor(private val context: Context) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val accessToken = TokenStorage.getAccessToken(context)
        val request = chain.request().newBuilder()
            .header("X-Auth-Strategy", "bearer")  // opt into bearer-token delivery
            .build()
            .withBearer(accessToken)
        val response = chain.proceed(request)

        if (response.code == 401) {
            response.close()
            val newToken = tryRefresh() ?: return response
            return chain.proceed(chain.request().withBearer(newToken))
        }
        return response
    }

    private fun tryRefresh(): String? {
        val refreshToken = TokenStorage.getRefreshToken(context) ?: return null
        return runCatching {
            // Use a separate OkHttpClient (no interceptor) to avoid recursion
            val bearerClient = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    chain.proceed(
                        chain.request().newBuilder()
                            .header("X-Auth-Strategy", "bearer")
                            .build()
                    )
                }
                .build()
            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(bearerClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val api = retrofit.create(AuthApi::class.java)

            // runBlocking is acceptable here because OkHttp calls run on a background thread
            val res = kotlinx.coroutines.runBlocking {
                api.refresh(RefreshRequest(refreshToken))
            }
            TokenStorage.saveTokens(context, res.accessToken, refreshToken)
            res.accessToken
        }.getOrNull()
    }
}

private fun Request.withBearer(token: String?): Request =
    if (token != null) newBuilder().header("Authorization", "Bearer $token").build()
    else this

const val BASE_URL = "https://your-api.example.com"
```

## Step 4 — Retrofit Client Factory

```kotlin
// auth/AuthClient.kt
import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object AuthClient {
    fun create(context: Context): AuthApi {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY   // remove in release
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(context))
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuthApi::class.java)
    }
}
```

## Step 5 — AuthViewModel

```kotlin
// auth/AuthViewModel.kt
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle        : AuthState()
    object Loading     : AuthState()
    data class Success(val user: JwtUser) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(app: Application) : AndroidViewModel(app) {
    private val api = AuthClient.create(app)
    private val ctx get() = getApplication<Application>()

    private val _state = MutableStateFlow<AuthState>(AuthState.Idle)
    val state: StateFlow<AuthState> = _state

    val isLoggedIn: Boolean
        get() = TokenStorage.getAccessToken(ctx) != null

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            _state.value = runCatching {
                val tokens = api.login(LoginRequest(email, password))
                TokenStorage.saveTokens(ctx, tokens.accessToken, tokens.refreshToken)
                val user = api.me()
                AuthState.Success(user)
            }.getOrElse { AuthState.Error(it.message ?: "Login failed") }
        }
    }

    fun logout() {
        viewModelScope.launch {
            runCatching { api.logout() }
            TokenStorage.clearTokens(ctx)
            _state.value = AuthState.Idle
        }
    }
}
```

## Step 6 — Jetpack Compose Login Screen

```kotlin
// ui/LoginScreen.kt
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state) {
        if (state is AuthState.Success) onSuccess()
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Sign In", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text("Email") }, modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))

        if (state is AuthState.Error) {
            Text((state as AuthState.Error).message, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        Button(
            onClick = { viewModel.login(email, password) },
            enabled = state !is AuthState.Loading && email.isNotBlank() && password.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (state is AuthState.Loading) CircularProgressIndicator(Modifier.size(20.dp))
            else Text("Sign In")
        }
    }
}
```

## OAuth / Social Login

Use a [Custom Chrome Tab](https://developer.chrome.com/docs/android/custom-tabs) to open the OAuth URL and capture the deep-link redirect:

```kotlin
// Redirect URI registered in AndroidManifest.xml:
// <data android:scheme="myapp" android:host="oauth-callback" />

val authUri = Uri.parse(
    "$BASE_URL/auth/oauth/$provider?redirect_uri=${Uri.encode("myapp://oauth-callback")}"
)
CustomTabsIntent.Builder().build().launchUrl(context, authUri)

// In your Activity / NavController — handle the deep link:
intent?.data?.let { uri ->
    val accessToken  = uri.getQueryParameter("accessToken")
    val refreshToken = uri.getQueryParameter("refreshToken")
    if (accessToken != null && refreshToken != null) {
        TokenStorage.saveTokens(context, accessToken, refreshToken)
    }
}
```

## Security Notes

- ✅ Tokens stored in **EncryptedSharedPreferences** — backed by the Android Keystore (hardware-backed on modern devices)
- ✅ AES-256-GCM encryption for values, AES-256-SIV for keys
- ✅ Auto-refresh on 401 with a single retry (separate OkHttpClient to avoid recursion)
- ✅ Add `android:usesCleartextTraffic="false"` to `AndroidManifest.xml` — enforces HTTPS
- ✅ Use `BuildConfig.DEBUG` to disable the OkHttp logging interceptor in release builds

## Related

- [Bearer token mode for mobile apps](/docs/advanced/bearer-token) — why native clients skip cookies
- [iOS Swift authentication](/docs/frameworks/ios) — the same flow on iOS
- [Flutter authentication client](/docs/frameworks/flutter) — one codebase for both platforms
- [SMS OTP verification and 2FA](/docs/authentication/sms) — phone verification on mobile
