import ExpoModulesCore
import Foundation

public final class BankNotificationsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BankNotifications")

    AsyncFunction("excludePrivateDataFromBackup") { () throws -> Void in
      let manager = FileManager.default
      for directory in [FileManager.SearchPathDirectory.documentDirectory, .applicationSupportDirectory] {
        var url = try manager.url(for: directory, in: .userDomainMask, appropriateFor: nil, create: true)
        try manager.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
        guard try url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
          throw NSError(domain: "KeseflyPrivacy", code: 1, userInfo: [NSLocalizedDescriptionKey: "Private storage backup exclusion could not be verified."])
        }
      }
    }

    // iOS does not provide access to other applications' notifications.
    AsyncFunction("getStatus") { () -> [String: Any] in
      return ["enabled": false, "consent": false, "packages": [String](), "pending": 0]
    }
    AsyncFunction("configure") { (consent: Bool, packages: [String]) throws -> Void in
      if consent {
        throw NSError(domain: "KeseflyCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Bank notification capture is unavailable on iOS."])
      }
    }
    AsyncFunction("readAlerts") { () -> [[String: Any]] in return [] }
    AsyncFunction("acknowledge") { (ids: [String]) -> Void in }
    AsyncFunction("openSettings") { () throws -> Void in
      throw NSError(domain: "KeseflyCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Notification listener settings are unavailable on iOS."])
    }
    AsyncFunction("openBatterySettings") { () throws -> Void in
      throw NSError(domain: "KeseflyCapture", code: 1, userInfo: [NSLocalizedDescriptionKey: "Notification capture battery settings are unavailable on iOS."])
    }
  }
}
