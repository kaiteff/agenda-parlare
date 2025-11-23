# Script para actualizar la función loginUser en firebase.js
$firebaseFile = "g:\My Drive\AG\js\firebase.js"
$content = Get-Content $firebaseFile -Raw

# Reemplazar la función loginUser para que retorne el usuario
$oldFunction = @"
// FunciA3n para login con email y password
export async function loginUser(email, password) {
    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        await signInWithEmailAndPassword(authInstance, email, password);
        return { success: true };
    } catch (error) {
        console.error("Error en login:", error);
        return { success: false, error: error.message };
    }
}
"@

$newFunction = @"
// FunciA3n para login con email y password
export async function loginUser(email, password) {
    try {
        const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Error en login:", error);
        return { success: false, error: error.message };
    }
}
"@

$content = $content -replace [regex]::Escape($oldFunction), $newFunction
Set-Content -Path $firebaseFile -Value $content -Encoding UTF8

Write-Host "✅ firebase.js actualizado correctamente" -ForegroundColor Green
