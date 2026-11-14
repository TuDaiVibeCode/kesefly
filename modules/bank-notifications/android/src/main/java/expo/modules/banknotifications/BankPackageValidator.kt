package expo.modules.banknotifications

/**
 * Kotlin mirror of the JS-side `bankPackages.ts` package pattern
 * (src/core/ingestion/bankPackages.ts). Keep both in sync: a name the UI offers
 * must never be rejected by native consent configuration, and vice versa.
 */
internal object BankPackageValidator {
  // ^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$
  private val pattern = Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")

  fun isValid(name: String): Boolean = name.length <= 255 && pattern.matches(name)
}
