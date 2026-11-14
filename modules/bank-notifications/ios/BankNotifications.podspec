Pod::Spec.new do |s|
  s.name = 'BankNotifications'
  s.version = '1.0.0'
  s.summary = 'Kesefly private-storage backup protection'
  s.description = 'Local Expo module protecting private financial data from iOS device backups.'
  s.license = { :type => 'MIT' }
  s.author = 'Kesefly'
  s.homepage = 'https://github.com/kesefly/kesefly'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => 'https://github.com/kesefly/kesefly.git', :tag => s.version.to_s }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift}'
end
