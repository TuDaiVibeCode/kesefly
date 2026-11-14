package expo.modules.banknotifications

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM tests for [BankPackageValidator] — the Kotlin mirror of the JS-side
 * bankPackages.ts pattern. Both sides must accept exactly the same identifiers,
 * so a package the UI offers is never rejected by native consent configuration.
 */
class BankPackageValidatorTest {

  @Test
  fun `exact dotted identifiers are accepted`() {
    for (name in listOf("com.VCB", "com.vnpay.bidv", "com.mbmobile", "com.techcombank.retail", "com.vietinbank.ipay", "a.b")) {
      assertTrue(name, BankPackageValidator.isValid(name))
    }
  }

  @Test
  fun `wildcards and malformed names are rejected`() {
    for (name in listOf("", "com", "com.VCB.*", "*.vcb", "com.vcb ", "com..vcb", "com.123", "Com.VCB Vietnam", "com.vcb;drop")) {
      assertFalse(name, BankPackageValidator.isValid(name))
    }
  }

  @Test
  fun `names over 255 characters are rejected`() {
    val long = "com." + "a".repeat(300)
    assertFalse(BankPackageValidator.isValid(long))
  }
}
